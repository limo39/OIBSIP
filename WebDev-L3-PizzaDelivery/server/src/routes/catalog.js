const express = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const { protect } = require('../middleware/auth');
const { getCatalog } = require('../services/pricing');

const router = express.Router();

router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    res.json(await getCatalog());
  })
);

module.exports = router;
