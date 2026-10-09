const mongoose = require('mongoose');
const InventoryItem = require('../models/InventoryItem');
const PresetPizza = require('../models/PresetPizza');
const { AppError } = require('../utils/errors');
const { DELIVERY_FEE, FREE_DELIVERY_OVER } = require('../constants');

function publicItem(doc) {
  return {
    _id: doc._id,
    name: doc.name,
    slug: doc.slug,
    category: doc.category,
    description: doc.description,
    price: doc.price,
    stock: doc.stock,
    available: Boolean(doc.isActive && doc.stock > 0),
  };
}

function snapItem(item) {
  return {
    item: item._id.toString(),
    name: item.name,
    slug: item.slug,
    price: item.price,
    category: item.category,
  };
}

async function mustItem(id, category) {
  if (!id || !mongoose.isValidObjectId(id)) {
    throw new AppError(`Choose a ${category}`, 400);
  }
  const item = await InventoryItem.findOne({ _id: id, category });
  if (!item) throw new AppError(`Choose a valid ${category}`, 400);
  return item;
}

async function resolveSelection(input) {
  if (input.kind === 'preset') {
    if (!input.presetSlug) throw new AppError('Choose a pizza', 400);
    const preset = await PresetPizza.findOne({ slug: input.presetSlug });
    if (!preset) throw new AppError('That pizza is no longer on the menu', 404);
    const [base, sauce, cheese, vegetableDocs] = await Promise.all([
      InventoryItem.findOne({ slug: preset.baseSlug, category: 'base' }),
      InventoryItem.findOne({ slug: preset.sauceSlug, category: 'sauce' }),
      InventoryItem.findOne({ slug: preset.cheeseSlug, category: 'cheese' }),
      InventoryItem.find({ slug: { $in: preset.vegetableSlugs }, category: 'vegetable' }),
    ]);
    const vegetables = preset.vegetableSlugs.map((slug) => vegetableDocs.find((item) => item.slug === slug));
    if (!base || !sauce || !cheese || vegetables.some((item) => !item)) {
      throw new AppError('This pizza is missing an ingredient', 409);
    }
    return { kind: 'preset', pizzaName: preset.name, presetSlug: preset.slug, base, sauce, cheese, vegetables };
  }

  const base = await mustItem(input.baseId, 'base');
  const sauce = await mustItem(input.sauceId, 'sauce');
  const cheese = await mustItem(input.cheeseId, 'cheese');
  const ids = [...new Set(input.vegetableIds || [])];
  if (!ids.length) throw new AppError('Choose at least one vegetable', 400);
  if (ids.some((id) => !mongoose.isValidObjectId(id))) {
    throw new AppError('Choose valid vegetables', 400);
  }
  const found = await InventoryItem.find({ _id: { $in: ids }, category: 'vegetable' });
  if (found.length !== ids.length) throw new AppError('One of the vegetables is not on the menu', 400);
  const vegetables = ids.map((id) => found.find((item) => String(item._id) === String(id)));
  return { kind: 'custom', pizzaName: 'Custom pie', presetSlug: null, base, sauce, cheese, vegetables };
}

async function buildQuote(input) {
  const selection = await resolveSelection(input);
  const items = [selection.base, selection.sauce, selection.cheese, ...selection.vegetables];
  const quantity = input.quantity || 1;
  const inactive = items.find((item) => !item.isActive);
  if (inactive) throw new AppError(`${inactive.name} is unavailable`, 409);

  const maxQuantity = Math.min(10, ...items.map((item) => item.stock));
  if (maxQuantity < 1) throw new AppError(`${selection.pizzaName} is sold out`, 409);
  if (quantity > maxQuantity) {
    throw new AppError(`Only ${maxQuantity} can be made with current stock`, 409);
  }

  const unitPrice = items.reduce((sum, item) => sum + item.price, 0);
  const subtotal = unitPrice * quantity;
  const deliveryFee = subtotal >= FREE_DELIVERY_OVER ? 0 : DELIVERY_FEE;
  const totalAmount = subtotal + deliveryFee;

  return {
    kind: selection.kind,
    pizzaName: selection.pizzaName,
    presetSlug: selection.presetSlug,
    quantity,
    maxQuantity,
    unitPrice,
    subtotal,
    deliveryFee,
    totalAmount,
    freeDeliveryOver: FREE_DELIVERY_OVER,
    lines: [
      { label: selection.base.name, price: selection.base.price, category: 'base' },
      { label: selection.sauce.name, price: selection.sauce.price, category: 'sauce' },
      { label: selection.cheese.name, price: selection.cheese.price, category: 'cheese' },
      ...selection.vegetables.map((item) => ({ label: item.name, price: item.price, category: 'vegetable' })),
    ],
    selection: {
      base: snapItem(selection.base),
      sauce: snapItem(selection.sauce),
      cheese: snapItem(selection.cheese),
      vegetables: selection.vegetables.map(snapItem),
    },
  };
}

async function getCatalog() {
  const [items, presets] = await Promise.all([
    InventoryItem.find().sort({ price: 1, name: 1 }),
    PresetPizza.find().sort({ sortOrder: 1 }),
  ]);
  const bySlug = new Map(items.map((item) => [item.slug, item]));

  const pizzas = presets.map((preset) => {
    const base = bySlug.get(preset.baseSlug);
    const sauce = bySlug.get(preset.sauceSlug);
    const cheese = bySlug.get(preset.cheeseSlug);
    const vegetables = preset.vegetableSlugs.map((slug) => bySlug.get(slug)).filter(Boolean);
    const parts = [base, sauce, cheese, ...vegetables];
    const complete = parts.length === 3 + preset.vegetableSlugs.length && parts.every(Boolean);
    const available = complete && parts.every((part) => part.isActive && part.stock > 0);
    return {
      _id: preset._id,
      name: preset.name,
      slug: preset.slug,
      description: preset.description,
      tag: preset.tag,
      featured: preset.featured,
      base: base ? publicItem(base) : null,
      sauce: sauce ? publicItem(sauce) : null,
      cheese: cheese ? publicItem(cheese) : null,
      vegetables: vegetables.map(publicItem),
      price: complete ? parts.reduce((sum, part) => sum + part.price, 0) : null,
      available,
    };
  });

  const group = (category) => items.filter((item) => item.category === category).map(publicItem);
  return {
    bases: group('base'),
    sauces: group('sauce'),
    cheeses: group('cheese'),
    vegetables: group('vegetable'),
    pizzas,
  };
}

function countLines(selection, quantity) {
  const counts = new Map();
  const add = (snap) => {
    const id = String(snap.item);
    counts.set(id, (counts.get(id) || 0) + quantity);
  };
  add(selection.base);
  add(selection.sauce);
  add(selection.cheese);
  selection.vegetables.forEach(add);
  return counts;
}

async function restoreStock(applied) {
  for (const { id, qty } of applied) {
    await InventoryItem.updateOne({ _id: id }, { $inc: { stock: qty } });
  }
}

async function decrementStock(selection, quantity) {
  const counts = countLines(selection, quantity);
  const applied = [];
  try {
    for (const [id, qty] of counts) {
      const doc = await InventoryItem.findOneAndUpdate(
        { _id: id, stock: { $gte: qty } },
        { $inc: { stock: -qty } },
        { new: true }
      );
      if (!doc) {
        const current = await InventoryItem.findById(id);
        throw new AppError(`Not enough ${current?.name || 'stock'} to complete this order`, 409);
      }
      applied.push({ id, qty });
      if (doc.stock >= doc.threshold && doc.alertedWhileLow) {
        await InventoryItem.updateOne({ _id: doc._id }, { $set: { alertedWhileLow: false } });
      }
    }
    return applied;
  } catch (err) {
    await restoreStock(applied);
    throw err;
  }
}

module.exports = {
  publicItem,
  buildQuote,
  getCatalog,
  decrementStock,
  restoreStock,
  countLines,
};
