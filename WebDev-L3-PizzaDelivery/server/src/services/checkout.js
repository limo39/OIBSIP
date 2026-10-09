const crypto = require('crypto');
const Razorpay = require('razorpay');
const Order = require('../models/Order');
const PaymentIntent = require('../models/PaymentIntent');
const { nextOrderNumber } = require('../models/Counter');
const { AppError } = require('../utils/errors');
const { buildQuote, decrementStock, restoreStock } = require('./pricing');
const { checkLowStock } = require('./stockAlert');
const { emitOrder } = require('../socket');
const { CURRENCY } = require('../constants');

function razorpayConfigured() {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  if (!keyId.startsWith('rzp_') || !keySecret) return false;
  if (/your_|placeholder|changeme/i.test(keySecret)) return false;
  return true;
}

function signaturesMatch(expected, actual) {
  if (typeof actual !== 'string' || expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

async function createPaymentOrder(user, input) {
  const quote = await buildQuote(input);
  const amountMinor = quote.totalAmount * 100;
  if (amountMinor < 100) throw new AppError('Order total is below the payment minimum', 400);

  let orderId;
  let mode = 'demo';

  if (razorpayConfigured()) {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    const order = await razorpay.orders.create({
      amount: amountMinor,
      currency: CURRENCY,
      receipt: `fn${Date.now()}`.slice(0, 40),
      notes: { userId: String(user._id), pizza: quote.pizzaName },
    });
    orderId = order.id;
    mode = 'razorpay';
  } else {
    orderId = `order_DEMO_${crypto.randomBytes(8).toString('hex')}`;
  }

  await PaymentIntent.create({
    user: user._id,
    razorpayOrderId: orderId,
    mode,
    amountMinor,
    payload: JSON.parse(JSON.stringify({ ...quote, address: input.address })),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  });

  return {
    keyId: mode === 'razorpay' ? process.env.RAZORPAY_KEY_ID : null,
    orderId,
    amount: amountMinor,
    currency: CURRENCY,
    demo: mode === 'demo',
    pizzaName: quote.pizzaName,
    totalAmount: quote.totalAmount,
  };
}

async function verifyAndPlace({ user, razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  const existing = await Order.findOne({
    user: user._id,
    'payment.razorpayOrderId': razorpay_order_id,
  });
  if (existing) return existing;

  const intent = await PaymentIntent.findOne({
    razorpayOrderId: razorpay_order_id,
    user: user._id,
    consumed: false,
    expiresAt: { $gt: new Date() },
  });
  if (!intent) throw new AppError('Payment session expired. Start checkout again.', 400);

  if (intent.mode === 'razorpay') {
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    if (!signaturesMatch(expected, razorpay_signature)) {
      throw new AppError('Payment verification failed', 400);
    }
  } else if (razorpay_payment_id !== 'pay_DEMO_success') {
    throw new AppError('Demo payment was not confirmed', 400);
  }

  const claimed = await PaymentIntent.findOneAndUpdate(
    { _id: intent._id, consumed: false },
    { $set: { consumed: true } }
  );
  if (!claimed) {
    const raced = await Order.findOne({
      user: user._id,
      'payment.razorpayOrderId': razorpay_order_id,
    });
    if (raced) return raced;
    throw new AppError('Payment is already being confirmed. Check your orders in a moment.', 409);
  }

  const quote = intent.payload;
  let applied = [];
  try {
    applied = await decrementStock(quote.selection, quote.quantity);
    const orderNumber = await nextOrderNumber();
    const order = await Order.create({
      user: user._id,
      orderNumber,
      kind: quote.kind,
      pizzaName: quote.pizzaName,
      presetSlug: quote.presetSlug,
      selection: quote.selection,
      quantity: quote.quantity,
      unitPrice: quote.unitPrice,
      subtotal: quote.subtotal,
      deliveryFee: quote.deliveryFee,
      totalAmount: quote.totalAmount,
      address: quote.address,
      status: 'Order Received',
      statusHistory: [{ status: 'Order Received', at: new Date() }],
      payment: {
        provider: 'razorpay',
        mode: intent.mode,
        razorpayOrderId: intent.razorpayOrderId,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature || '',
        status: 'paid',
        currency: CURRENCY,
        amountMinor: intent.amountMinor,
      },
    });

    checkLowStock().catch((err) => console.error('Stock alert after order failed:', err.message));
    const populated = await Order.findById(order._id).populate('user', 'name email');
    emitOrder('order:created', populated);
    return populated;
  } catch (err) {
    await restoreStock(applied);
    await PaymentIntent.updateOne({ _id: intent._id }, { $set: { consumed: false } });
    throw err;
  }
}

module.exports = { razorpayConfigured, createPaymentOrder, verifyAndPlace };
