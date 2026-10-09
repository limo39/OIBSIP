const Order = require('../models/Order');
const InventoryItem = require('../models/InventoryItem');
const { AppError } = require('../utils/errors');
const { ORDER_STATUSES } = require('../constants');
const { countLines } = require('./pricing');
const { emitOrder } = require('../socket');

async function updateOrderStatus(orderId, status) {
  if (!ORDER_STATUSES.includes(status)) throw new AppError('Unknown order status', 400);

  const order = await Order.findById(orderId).populate('user', 'name email');
  if (!order) throw new AppError('Order not found', 404);
  if (order.status === 'Cancelled') throw new AppError('Cancelled orders cannot be reopened', 400);
  if (order.status === 'Delivered' && status !== 'Delivered') {
    throw new AppError('Delivered orders are closed', 400);
  }
  if (status === 'Cancelled' && order.status === 'Delivered') {
    throw new AppError('Delivered orders cannot be cancelled', 400);
  }

  if (order.status === status) return order;

  if (status === 'Cancelled' && !order.stockRestored) {
    const counts = countLines(order.selection, order.quantity);
    for (const [id, qty] of counts) {
      await InventoryItem.updateOne({ _id: id }, { $inc: { stock: qty } });
    }
    order.stockRestored = true;
  }

  order.status = status;
  order.statusHistory.push({ status, at: new Date() });
  await order.save();
  emitOrder('order:updated', order);
  return order;
}

module.exports = { updateOrderStatus };
