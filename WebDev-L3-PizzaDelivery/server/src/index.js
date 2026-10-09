require('dotenv').config();

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }
  process.env.JWT_SECRET = 'dev-only-forno-secret-change-me';
  console.warn('JWT_SECRET is not set. Using an insecure development secret.');
}

const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/db');
const { initSocket } = require('./socket');
const { seed } = require('./seed/seed');
const { startStockAlertJob } = require('./jobs/stockAlert');
const { checkLowStock } = require('./services/stockAlert');

const PORT = Number(process.env.PORT || 5000);

async function main() {
  await connectDB();
  if (process.env.SEED_ON_START !== 'false') {
    await seed();
    const alert = await checkLowStock();
    if (alert.sent) {
      console.log(`Low-stock email sent to ${alert.to}: ${alert.items.map((item) => item.name).join(', ')}`);
    }
  }
  startStockAlertJob();

  const server = http.createServer(app);
  initSocket(server);
  server.listen(PORT, () => {
    console.log(`Forno API listening on http://localhost:${PORT}`);
    if (process.env.NODE_ENV !== 'production') {
      const origin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
      console.log(`Guest app: ${origin}`);
      console.log(`Guest login: ${process.env.DEMO_USER_EMAIL || 'user@forno.local'} / ${process.env.DEMO_USER_PASSWORD || 'User@12345'}`);
      console.log(`Staff entrance: ${origin}/admin/login`);
      console.log(`Staff login: ${process.env.ADMIN_EMAIL || 'admin@forno.local'} / ${process.env.ADMIN_PASSWORD || 'Admin@12345'}`);
    }
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
