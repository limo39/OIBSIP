const express = require('express');
const Order = require('../models/Order');
const { AppError } = require('../utils/errors');
const { asyncHandler } = require('../utils/asyncHandler');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json({ orders });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) throw new AppError('Order not found', 404);
    const owns = String(order.user) === String(req.user._id);
    if (!owns && req.user.role !== 'admin') throw new AppError('Order not found', 404);
    res.json({ order });
  })
);

module.exports = router;
