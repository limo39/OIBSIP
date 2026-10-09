const express = require('express');
const { z } = require('zod');
const InventoryItem = require('../models/InventoryItem');
const Order = require('../models/Order');
const { AppError } = require('../utils/errors');
const { asyncHandler } = require('../utils/asyncHandler');
const { validate } = require('../utils/validate');
const { protect, requireRole } = require('../middleware/auth');
const { checkLowStock } = require('../services/stockAlert');
const { updateOrderStatus } = require('../services/orderStatus');
const { ORDER_STATUSES } = require('../constants');

const router = express.Router();

router.use(protect, requireRole('admin'));

const stockSchema = z
  .object({
    stock: z.number().int().min(0).max(100000).optional(),
    threshold: z.number().int().min(0).max(100000).optional(),
    price: z.number().int().min(0).max(100000).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update' });

const statusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const [ordersToday, revenueAgg, activeOrders, lowStock, recent] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: start }, status: { $ne: 'Cancelled' } }),
      Order.aggregate([
        { $match: { status: { $ne: 'Cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Order.countDocuments({ status: { $in: ['Order Received', 'In Kitchen', 'Sent to Delivery'] } }),
      InventoryItem.countDocuments({ isActive: true, $expr: { $lt: ['$stock', '$threshold'] } }),
      Order.find().sort({ createdAt: -1 }).limit(6).populate('user', 'name email'),
    ]);

    res.json({
      ordersToday,
      revenue: revenueAgg[0]?.total || 0,
      activeOrders,
      lowStock,
      recent,
      cron: process.env.STOCK_CRON || '*/1 * * * *',
      alertEmail: process.env.ADMIN_EMAIL || 'admin@forno.local',
    });
  })
);

router.get(
  '/inventory',
  asyncHandler(async (req, res) => {
    const items = await InventoryItem.find().sort({ category: 1, name: 1 });
    res.json({ items });
  })
);

router.patch(
  '/inventory/:id',
  validate(stockSchema),
  asyncHandler(async (req, res) => {
    const item = await InventoryItem.findById(req.params.id);
    if (!item) throw new AppError('Inventory item not found', 404);

    if (req.body.stock !== undefined) item.stock = req.body.stock;
    if (req.body.threshold !== undefined) item.threshold = req.body.threshold;
    if (req.body.price !== undefined) item.price = req.body.price;
    if (req.body.isActive !== undefined) item.isActive = req.body.isActive;
    if (item.stock >= item.threshold) item.alertedWhileLow = false;
    await item.save();
    await checkLowStock();
    const fresh = await InventoryItem.findById(item._id);

    res.json({ item: fresh });
  })
);

router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.status && ORDER_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }
    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(100).populate('user', 'name email');
    res.json({ orders });
  })
);

router.patch(
  '/orders/:id/status',
  validate(statusSchema),
  asyncHandler(async (req, res) => {
    const order = await updateOrderStatus(req.params.id, req.body.status);
    res.json({ order });
  })
);

module.exports = router;
