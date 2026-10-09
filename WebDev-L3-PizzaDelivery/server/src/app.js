const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const catalogRoutes = require('./routes/catalog');
const paymentRoutes = require('./routes/payments');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const { errorHandler } = require('./utils/validate');

const app = express();
const origin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use((req, _res, next) => {
  if (req.body && typeof req.body === 'object') stripOperators(req.body);
  next();
});

const authLimiter =
  process.env.NODE_ENV === 'test'
    ? (_req, _res, next) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 40,
        standardHeaders: true,
        legacyHeaders: false,
        message: { message: 'Too many attempts. Wait a few minutes and try again.' },
      });

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'forno', time: new Date().toISOString() });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'Not found' });
});

const dist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
    return res.sendFile(path.join(dist, 'index.html'));
  });
}

app.use(errorHandler);

function stripOperators(value) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach(stripOperators);
    return;
  }
  for (const key of Object.keys(value)) {
    if (key.startsWith('$') || key.includes('.')) delete value[key];
    else stripOperators(value[key]);
  }
}

module.exports = app;
