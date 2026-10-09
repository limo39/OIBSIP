const express = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../utils/asyncHandler');
const { validate } = require('../utils/validate');
const { protect } = require('../middleware/auth');
const { buildQuote } = require('../services/pricing');
const { razorpayConfigured, createPaymentOrder, verifyAndPlace } = require('../services/checkout');
const { CURRENCY } = require('../constants');

const router = express.Router();

const selectionSchema = z.object({
  kind: z.enum(['custom', 'preset']),
  presetSlug: z.string().trim().optional(),
  baseId: z.string().optional(),
  sauceId: z.string().optional(),
  cheeseId: z.string().optional(),
  vegetableIds: z.array(z.string()).max(8).optional(),
  quantity: z.number().int().min(1).max(10),
});

const addressSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80),
  phone: z.string().regex(/^0[17]\d{8}$/, 'Enter a 10-digit Kenyan number starting with 07 or 01'),
  line1: z.string().trim().min(4, 'Add a street address').max(160),
  city: z.string().trim().min(2).max(60),
  pincode: z.string().regex(/^\d{5}$/, 'Enter a 5-digit postal code'),
});

const createSchema = selectionSchema.extend({ address: addressSchema });

const verifySchema = z.object({
  razorpay_order_id: z.string().min(6),
  razorpay_payment_id: z.string().min(4),
  razorpay_signature: z.string().optional(),
});

router.use(protect);

router.get('/config', (req, res) => {
  res.json({
    provider: 'razorpay',
    demo: !razorpayConfigured(),
    currency: CURRENCY,
  });
});

router.post(
  '/quote',
  validate(selectionSchema),
  asyncHandler(async (req, res) => {
    res.json(await buildQuote(req.body));
  })
);

router.post(
  '/create-order',
  validate(createSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await createPaymentOrder(req.user, req.body));
  })
);

router.post(
  '/verify',
  validate(verifySchema),
  asyncHandler(async (req, res) => {
    const order = await verifyAndPlace({ user: req.user, ...req.body });
    res.status(201).json({ order });
  })
);

module.exports = router;
