const mongoose = require('mongoose');

const presetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    tag: { type: String, default: '' },
    baseSlug: { type: String, required: true },
    sauceSlug: { type: String, required: true },
    cheeseSlug: { type: String, required: true },
    vegetableSlugs: [{ type: String, required: true }],
    featured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('PresetPizza', presetSchema);
