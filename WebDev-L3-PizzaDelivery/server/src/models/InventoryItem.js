const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    category: {
      type: String,
      enum: ['base', 'sauce', 'cheese', 'vegetable'],
      required: true,
      index: true,
    },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0 },
    threshold: { type: Number, required: true, min: 0, default: 20 },
    alertedWhileLow: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('InventoryItem', inventorySchema);
