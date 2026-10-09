const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: String,
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

async function nextOrderNumber() {
  const counter = await Counter.findOneAndUpdate(
    { _id: 'order' },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return `FN-${String(counter.seq).padStart(4, '0')}`;
}

module.exports = { Counter, nextOrderNumber };
