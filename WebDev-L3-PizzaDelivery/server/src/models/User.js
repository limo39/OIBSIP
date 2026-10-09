const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isVerified: { type: Boolean, default: false },
    verificationTokenHash: { type: String, select: false },
    verificationTokenExpiry: { type: Date, select: false },
    resetTokenHash: { type: String, select: false },
    resetTokenExpiry: { type: Date, select: false },
  },
  { timestamps: true, versionKey: false }
);

userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.password;
    delete ret.verificationTokenHash;
    delete ret.verificationTokenExpiry;
    delete ret.resetTokenHash;
    delete ret.resetTokenExpiry;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
