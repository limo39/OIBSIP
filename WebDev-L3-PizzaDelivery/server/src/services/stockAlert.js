const InventoryItem = require('../models/InventoryItem');
const { sendLowStockEmail } = require('../utils/email');

async function checkLowStock() {
  const candidates = await InventoryItem.find({
    isActive: true,
    alertedWhileLow: false,
    $expr: { $lt: ['$stock', '$threshold'] },
  }).sort({ category: 1, name: 1 });

  const claimed = [];
  for (const item of candidates) {
    const locked = await InventoryItem.findOneAndUpdate(
      {
        _id: item._id,
        alertedWhileLow: false,
        isActive: true,
        $expr: { $lt: ['$stock', '$threshold'] },
      },
      { $set: { alertedWhileLow: true } }
    );
    if (locked) claimed.push(item);
  }

  if (!claimed.length) return { sent: false, items: [] };

  const to = process.env.ADMIN_EMAIL || 'admin@forno.local';
  try {
    await sendLowStockEmail(to, claimed);
  } catch (err) {
    await InventoryItem.updateMany(
      { _id: { $in: claimed.map((item) => item._id) } },
      { $set: { alertedWhileLow: false } }
    );
    throw err;
  }

  return {
    sent: true,
    to,
    items: claimed.map((item) => ({
      name: item.name,
      category: item.category,
      stock: item.stock,
      threshold: item.threshold,
    })),
  };
}

module.exports = { checkLowStock };
