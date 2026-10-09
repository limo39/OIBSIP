const mongoose = require('mongoose');
const { ORDER_STATUSES } = require('../constants');

const snapSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
    name: String,
    slug: String,
    price: Number,
    category: String,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orderNumber: { type: String, required: true, unique: true },
    kind: { type: String, enum: ['preset', 'custom'], required: true },
    pizzaName: { type: String, required: true },
    presetSlug: { type: String, default: null },
    selection: {
      base: snapSchema,
      sauce: snapSchema,
      cheese: snapSchema,
      vegetables: [snapSchema],
    },
    quantity: { type: Number, required: true, min: 1, max: 10 },
    unitPrice: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    address: {
      name: String,
      phone: String,
      line1: String,
      city: String,
      pincode: String,
    },
    status: { type: String, enum: ORDER_STATUSES, default: 'Order Received', index: true },
    statusHistory: [
      {
        status: String,
        at: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    stockRestored: { type: Boolean, default: false },
    payment: {
      provider: { type: String, default: 'razorpay' },
      mode: { type: String, enum: ['razorpay', 'demo'], default: 'razorpay' },
      razorpayOrderId: { type: String, index: true },
      razorpayPaymentId: String,
      razorpaySignature: String,
      status: { type: String, enum: ['paid', 'failed'], default: 'paid' },
      currency: { type: String, default: 'KES' },
      amountMinor: Number,
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Order', orderSchema);
