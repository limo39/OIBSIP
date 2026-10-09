const mongoose = require('mongoose');

const paymentIntentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    razorpayOrderId: { type: String, required: true, unique: true },
    mode: { type: String, enum: ['razorpay', 'demo'], required: true },
    amountMinor: { type: Number, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    consumed: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, versionKey: false }
);

paymentIntentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PaymentIntent', paymentIntentSchema);
