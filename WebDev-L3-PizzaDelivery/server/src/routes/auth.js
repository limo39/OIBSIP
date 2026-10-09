const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const User = require('../models/User');
const { AppError } = require('../utils/errors');
const { asyncHandler } = require('../utils/asyncHandler');
const { validate } = require('../utils/validate');
const {
  createRawToken,
  hashToken,
  signToken,
  setAuthCookie,
  clearAuthCookie,
} = require('../utils/tokens');
const {
  sendVerificationEmail,
  sendResetEmail,
  devPreviewEnabled,
} = require('../utils/email');
const { protect } = require('../middleware/auth');

const router = express.Router();

const emailField = z.string().trim().email('Enter a valid email').transform((value) => value.toLowerCase());
const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password is too long')
  .regex(/[A-Za-z]/, 'Password needs a letter')
  .regex(/[0-9]/, 'Password needs a number');

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80),
  email: emailField,
  password: passwordField,
});

const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
  portal: z.enum(['user', 'admin']),
});

const emailOnlySchema = z.object({ email: emailField });
const resetSchema = z.object({
  token: z.string().min(20),
  password: passwordField,
});

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
  };
}

function issueSession(res, user) {
  const token = signToken(user);
  setAuthCookie(res, token);
  return token;
}

router.post(
  '/register',
  (req, res, next) => {
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'role')) {
      return next(new AppError('Admin accounts are not created through registration', 403));
    }
    return next();
  },
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const existing = await User.findOne({ email: req.body.email });
    if (existing) throw new AppError('An account with this email already exists', 409);

    const { raw, hash } = createRawToken();
    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: await bcrypt.hash(req.body.password, 10),
      role: 'user',
      isVerified: false,
      verificationTokenHash: hash,
      verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    let verificationUrl;
    try {
      verificationUrl = await sendVerificationEmail(user.email, raw);
    } catch (err) {
      console.error('Verification email failed:', err.message);
    }

    res.status(201).json({
      message: 'Account created. Check your email to verify it before logging in.',
      devPreview: devPreviewEnabled() && verificationUrl ? { verificationUrl } : undefined,
    });
  })
);

router.get(
  '/verify-email/:token',
  asyncHandler(async (req, res) => {
    const user = await User.findOne({
      verificationTokenHash: hashToken(req.params.token),
      verificationTokenExpiry: { $gt: new Date() },
    }).select('+verificationTokenHash');

    if (!user) throw new AppError('This verification link is invalid or has expired', 400);

    await User.updateOne(
      { _id: user._id },
      {
        $set: { isVerified: true },
        $unset: { verificationTokenHash: 1, verificationTokenExpiry: 1 },
      }
    );

    res.json({ message: 'Email verified. You can log in.' });
  })
);

router.post(
  '/resend-verification',
  validate(emailOnlySchema),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email }).select('+verificationTokenHash');
    let verificationUrl;
    if (user && user.role === 'user' && !user.isVerified) {
      const { raw, hash } = createRawToken();
      user.verificationTokenHash = hash;
      user.verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();
      try {
        verificationUrl = await sendVerificationEmail(user.email, raw);
      } catch (err) {
        console.error('Verification email failed:', err.message);
      }
    }
    res.json({
      message: 'If that account is waiting on verification, a new link is on its way.',
      devPreview: devPreviewEnabled() && verificationUrl ? { verificationUrl } : undefined,
    });
  })
);

router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email }).select('+password');
    const matches = user && (await bcrypt.compare(req.body.password, user.password));
    if (!matches) throw new AppError('Email or password is incorrect', 401);

    if (req.body.portal === 'admin' && user.role !== 'admin') {
      throw new AppError('This entrance is for staff only', 403);
    }
    if (req.body.portal === 'user' && user.role === 'admin') {
      throw new AppError('Staff accounts sign in through the admin entrance', 403);
    }
    if (user.role !== 'admin' && !user.isVerified) {
      const error = new AppError('Verify your email before logging in', 403);
      error.code = 'UNVERIFIED';
      throw error;
    }

    const token = issueSession(res, user);
    res.json({ token, user: publicUser(user) });
  })
);

router.post(
  '/forgot-password',
  validate(emailOnlySchema),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email }).select('+resetTokenHash');
    let resetUrl;
    if (user && (user.isVerified || user.role === 'admin')) {
      const { raw, hash } = createRawToken();
      user.resetTokenHash = hash;
      user.resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();
      try {
        resetUrl = await sendResetEmail(user.email, raw);
      } catch (err) {
        console.error('Reset email failed:', err.message);
      }
    }
    res.json({
      message: 'If an account exists for that email, a reset link is on its way.',
      devPreview: devPreviewEnabled() && resetUrl ? { resetUrl } : undefined,
    });
  })
);

router.post(
  '/reset-password',
  validate(resetSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({
      resetTokenHash: hashToken(req.body.token),
      resetTokenExpiry: { $gt: new Date() },
    }).select('+resetTokenHash +password');

    if (!user) throw new AppError('This reset link is invalid or has expired', 400);

    user.password = await bcrypt.hash(req.body.password, 10);
    user.resetTokenHash = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();
    await User.updateOne({ _id: user._id }, { $unset: { resetTokenHash: 1, resetTokenExpiry: 1 } });

    res.json({ message: 'Password updated. You can log in.' });
  })
);

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Signed out' });
});

router.get(
  '/me',
  protect,
  asyncHandler(async (req, res) => {
    res.json({ user: publicUser(req.user) });
  })
);

module.exports = router;
