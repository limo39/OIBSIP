const bcrypt = require('bcryptjs');
const User = require('../models/User');
const InventoryItem = require('../models/InventoryItem');
const PresetPizza = require('../models/PresetPizza');
const { Counter } = require('../models/Counter');
const { items, pizzas, CATALOG_REVISION } = require('./data');
const { checkLowStock } = require('../services/stockAlert');

const LEGACY_NAMES = {
  'user@forno.local': ['Maya Iyer'],
  'admin@forno.local': ['Forno Kitchen'],
};

async function ensureUser({ name, email, password, role, isVerified }) {
  const existing = await User.findOne({ email });
  if (existing) {
    const legacy = LEGACY_NAMES[email] || [];
    if (legacy.includes(existing.name)) {
      existing.name = name;
      await existing.save();
    }
    return existing;
  }
  return User.create({
    name,
    email,
    password: await bcrypt.hash(password, 10),
    role,
    isVerified,
  });
}

async function applyCatalogCopy() {
  for (const item of items) {
    await InventoryItem.updateOne(
      { slug: item.slug },
      { $set: { name: item.name, description: item.description, price: item.price } }
    );
  }
  for (const pizza of pizzas) {
    await PresetPizza.updateOne(
      { slug: pizza.slug },
      { $set: { name: pizza.name, description: pizza.description, tag: pizza.tag } }
    );
  }
}

async function seed({ resetCatalog = false } = {}) {
  await ensureUser({
    name: 'Forno Nairobi',
    email: (process.env.ADMIN_EMAIL || 'admin@forno.local').toLowerCase(),
    password: process.env.ADMIN_PASSWORD || 'Admin@12345',
    role: 'admin',
    isVerified: true,
  });

  await ensureUser({
    name: 'Wanjiku Mwangi',
    email: (process.env.DEMO_USER_EMAIL || 'user@forno.local').toLowerCase(),
    password: process.env.DEMO_USER_PASSWORD || 'User@12345',
    role: 'user',
    isVerified: true,
  });

  const count = await InventoryItem.countDocuments();
  if (count === 0 || resetCatalog) {
    await InventoryItem.deleteMany({});
    await PresetPizza.deleteMany({});
    await InventoryItem.insertMany(items);
    await PresetPizza.insertMany(pizzas);
    await Counter.updateOne({ _id: 'catalog' }, { $set: { seq: CATALOG_REVISION } }, { upsert: true });
    console.log(`Seeded ${items.length} inventory items and ${pizzas.length} pizzas.`);
  } else {
    const marker = await Counter.findById('catalog');
    if (!marker || marker.seq < CATALOG_REVISION) {
      await applyCatalogCopy();
      await Counter.updateOne({ _id: 'catalog' }, { $set: { seq: CATALOG_REVISION } }, { upsert: true });
      console.log(`Updated menu prices and names to catalog revision ${CATALOG_REVISION}. Stock counts were left as they were.`);
    }
  }

  return { adminEmail: process.env.ADMIN_EMAIL || 'admin@forno.local' };
}

async function runCli() {
  require('dotenv').config();
  const { connectDB, disconnectDB } = require('../config/db');
  await connectDB();
  await seed({ resetCatalog: process.argv.includes('--reset') });
  const result = await checkLowStock();
  if (result.sent) {
    console.log(`Low-stock email sent to ${result.to} for ${result.items.map((item) => item.name).join(', ')}.`);
  }
  await disconnectDB();
}

if (require.main === module) {
  runCli()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { seed };
