process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-xx';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
process.env.ADMIN_EMAIL = 'admin@forno.local';
process.env.ADMIN_PASSWORD = 'Admin@12345';
process.env.DEMO_USER_EMAIL = 'user@forno.local';
process.env.DEMO_USER_PASSWORD = 'User@12345';
process.env.SMTP_HOST = '';
process.env.RAZORPAY_KEY_ID = '';
process.env.RAZORPAY_KEY_SECRET = '';
process.env.STOCK_CRON = '*/5 * * * *';

const { after, before, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const http = require('http');
const path = require('path');
const request = require('supertest');
const { io } = require('socket.io-client');

const emailFile = path.join(__dirname, '../tmp/last-email.json');
const address = {
  name: 'Test Guest',
  phone: '0712345678',
  line1: '12 Waiyaki Way',
  city: 'Nairobi',
  pincode: '00100',
};

let mongod;
let server;
let app;
let userToken;
let adminToken;
let orderId;
let userEmail;

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

function tokenFrom(url) {
  return new URL(url).pathname.split('/').pop();
}

async function inventory() {
  const res = await request(app).get('/api/admin/inventory').set(auth(adminToken));
  assert.equal(res.status, 200);
  return res.body.items;
}

async function itemBySlug(slug) {
  const items = await inventory();
  const item = items.find((row) => row.slug === slug);
  assert.ok(item, slug);
  return item;
}

describe('Forno API', { concurrency: 1 }, () => {
  before(async () => {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
    const { connectDB } = require('../src/config/db');
    await connectDB();
    const { seed } = require('../src/seed/seed');
    await seed({ resetCatalog: true });
    app = require('../src/app');
    const { initSocket } = require('../src/socket');
    server = http.createServer(app);
    initSocket(server);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  }, { timeout: 180000 });

  after(async () => {
    if (server) {
      const { getIO } = require('../src/socket');
      getIO()?.close();
      await new Promise((resolve) => server.close(resolve));
    }
    const { disconnectDB } = require('../src/config/db');
    await disconnectDB();
    if (mongod) await mongod.stop();
  });

  test('health and locked catalog', async () => {
    const health = await request(app).get('/api/health');
    assert.equal(health.status, 200);
    assert.equal(health.body.ok, true);
    const catalog = await request(app).get('/api/catalog');
    assert.equal(catalog.status, 401);
  });

  test('registration cannot create an admin and requires verification', async () => {
    const rejected = await request(app).post('/api/auth/register').send({
      name: 'Sneaky',
      email: 'sneaky@example.com',
      password: 'Pizza1234',
      role: 'admin',
    });
    assert.equal(rejected.status, 403);

    userEmail = `guest${Date.now()}@example.com`;
    const created = await request(app).post('/api/auth/register').send({
      name: 'Guest Oven',
      email: userEmail,
      password: 'Pizza1234',
    });
    assert.equal(created.status, 201);
    assert.ok(created.body.devPreview.verificationUrl);

    const early = await request(app).post('/api/auth/login').send({
      email: userEmail,
      password: 'Pizza1234',
      portal: 'user',
    });
    assert.equal(early.status, 403);
    assert.equal(early.body.code, 'UNVERIFIED');

    const bad = await request(app).get('/api/auth/verify-email/not-a-real-token-value-at-all');
    assert.equal(bad.status, 400);

    const verified = await request(app).get(`/api/auth/verify-email/${tokenFrom(created.body.devPreview.verificationUrl)}`);
    assert.equal(verified.status, 200);

    const login = await request(app).post('/api/auth/login').send({
      email: userEmail,
      password: 'Pizza1234',
      portal: 'user',
    });
    assert.equal(login.status, 200);
    assert.equal(login.body.user.role, 'user');
    userToken = login.body.token;

    const staffDoor = await request(app).post('/api/auth/login').send({
      email: userEmail,
      password: 'Pizza1234',
      portal: 'admin',
    });
    assert.equal(staffDoor.status, 403);
  });

  test('catalog lists five bases, five sauces, cheeses, and house pies', async () => {
    const res = await request(app).get('/api/catalog').set(auth(userToken));
    assert.equal(res.status, 200);
    assert.equal(res.body.bases.length, 5);
    assert.equal(res.body.sauces.length, 5);
    assert.equal(res.body.cheeses.length, 5);
    assert.ok(res.body.vegetables.length >= 5);
    assert.ok(res.body.pizzas.length >= 5);
    const margherita = res.body.pizzas.find((pizza) => pizza.slug === 'margherita');
    assert.equal(margherita.available, true);
    assert.equal(margherita.price, 1150);
  });

  test('admin entrance is separate and can run the pass', async () => {
    const wrongDoor = await request(app).post('/api/auth/login').send({
      email: 'admin@forno.local',
      password: 'Admin@12345',
      portal: 'user',
    });
    assert.equal(wrongDoor.status, 403);

    const login = await request(app).post('/api/auth/login').send({
      email: 'admin@forno.local',
      password: 'Admin@12345',
      portal: 'admin',
    });
    assert.equal(login.status, 200);
    assert.equal(login.body.user.role, 'admin');
    adminToken = login.body.token;

    const blocked = await request(app).get('/api/admin/stats').set(auth(userToken));
    assert.equal(blocked.status, 403);
    const stats = await request(app).get('/api/admin/stats').set(auth(adminToken));
    assert.equal(stats.status, 200);
    assert.ok(stats.body.cron);
  });

  test('demo checkout confirms on Success and decrements stock once', async () => {
    const menu = await request(app).get('/api/catalog').set(auth(userToken));
    const base = menu.body.bases.find((item) => item.slug === 'thin-crust');
    const sauce = menu.body.sauces.find((item) => item.slug === 'marinara');
    const cheese = menu.body.cheeses.find((item) => item.slug === 'mozzarella');
    const onion = menu.body.vegetables.find((item) => item.slug === 'onions');
    const onionsBefore = (await itemBySlug('onions')).stock;

    const selection = {
      kind: 'custom',
      baseId: base._id,
      sauceId: sauce._id,
      cheeseId: cheese._id,
      vegetableIds: [onion._id],
      quantity: 1,
    };

    const priced = await request(app).post('/api/payments/quote').set(auth(userToken)).send(selection);
    assert.equal(priced.status, 200);
    assert.equal(priced.body.unitPrice, 1030);
    assert.equal(priced.body.deliveryFee, 200);
    assert.equal(priced.body.totalAmount, 1230);

    const free = await request(app).post('/api/payments/quote').set(auth(userToken)).send({
      kind: 'preset',
      presetSlug: 'margherita',
      quantity: 3,
    });
    assert.equal(free.status, 200);
    assert.equal(free.body.deliveryFee, 0);
    assert.equal(free.body.subtotal, 3450);

    const indianAddress = await request(app)
      .post('/api/payments/create-order')
      .set(auth(userToken))
      .send({ ...selection, address: { ...address, phone: '9876543210', pincode: '411001' } });
    assert.equal(indianAddress.status, 400);

    const config = await request(app).get('/api/payments/config').set(auth(userToken));
    assert.equal(config.status, 200);
    assert.equal(config.body.currency, 'KES');

    const session = await request(app).post('/api/payments/create-order').set(auth(userToken)).send({ ...selection, address });
    assert.equal(session.status, 201);
    assert.equal(session.body.demo, true);
    assert.equal(session.body.currency, 'KES');
    assert.equal(session.body.amount, 123000);
    assert.equal(session.body.totalAmount, 1230);

    const failed = await request(app).post('/api/payments/verify').set(auth(userToken)).send({
      razorpay_order_id: session.body.orderId,
      razorpay_payment_id: 'pay_DEMO_fail',
      razorpay_signature: 'demo',
    });
    assert.equal(failed.status, 400);
    assert.equal((await itemBySlug('onions')).stock, onionsBefore);

    const paid = await request(app).post('/api/payments/verify').set(auth(userToken)).send({
      razorpay_order_id: session.body.orderId,
      razorpay_payment_id: 'pay_DEMO_success',
      razorpay_signature: 'demo',
    });
    assert.equal(paid.status, 201);
    assert.equal(paid.body.order.status, 'Order Received');
    assert.match(paid.body.order.orderNumber, /^FN-\d{4}$/);
    orderId = paid.body.order._id;
    assert.equal((await itemBySlug('onions')).stock, onionsBefore - 1);

    const again = await request(app).post('/api/payments/verify').set(auth(userToken)).send({
      razorpay_order_id: session.body.orderId,
      razorpay_payment_id: 'pay_DEMO_success',
      razorpay_signature: 'demo',
    });
    assert.equal(again.status, 201);
    assert.equal(again.body.order._id, orderId);
    assert.equal((await itemBySlug('onions')).stock, onionsBefore - 1);

    const mine = await request(app).get('/api/orders').set(auth(userToken));
    assert.equal(mine.body.orders.some((order) => order._id === orderId), true);
  });

  test('status changes reach the guest over the socket', async () => {
    const port = server.address().port;
    const socket = io(`http://127.0.0.1:${port}`, { auth: { token: userToken }, transports: ['websocket'] });
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('socket connect timeout')), 8000);
        socket.on('connect', () => {
          clearTimeout(timer);
          resolve();
        });
        socket.on('connect_error', (err) => {
          clearTimeout(timer);
          reject(err);
        });
      });

      const pending = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('status event timeout')), 8000);
        socket.on('order:updated', (order) => {
          if (order._id === orderId && order.status === 'In Kitchen') {
            clearTimeout(timer);
            resolve(order);
          }
        });
      });

      const updated = await request(app)
        .patch(`/api/admin/orders/${orderId}/status`)
        .set(auth(adminToken))
        .send({ status: 'In Kitchen' });
      assert.equal(updated.status, 200);
      const event = await pending;
      assert.equal(event.status, 'In Kitchen');

      const sent = await request(app)
        .patch(`/api/admin/orders/${orderId}/status`)
        .set(auth(adminToken))
        .send({ status: 'Sent to Delivery' });
      assert.equal(sent.status, 200);

      const seen = await request(app).get(`/api/orders/${orderId}`).set(auth(userToken));
      assert.equal(seen.body.order.status, 'Sent to Delivery');
    } finally {
      socket.disconnect();
    }
  });

  test('low-stock job emails the admin and does not repeat until restocked', async () => {
    const logPath = path.join(__dirname, '../tmp/emails.jsonl');
    const cornMails = () => {
      if (!fs.existsSync(logPath)) return 0;
      return fs.readFileSync(logPath, 'utf8').split('\n').filter((line) => line.includes('Sweet Corn')).length;
    };

    const before = cornMails();
    const corn = await itemBySlug('corn');
    const dropped = await request(app)
      .patch(`/api/admin/inventory/${corn._id}`)
      .set(auth(adminToken))
      .send({ stock: 3, threshold: 20 });
    assert.equal(dropped.status, 200);
    assert.equal(dropped.body.item.alertedWhileLow, true);
    assert.equal(cornMails(), before + 1);
    const mail = JSON.parse(fs.readFileSync(emailFile, 'utf8'));
    assert.match(mail.subject, /stock alert/i);
    assert.equal(mail.to, 'admin@forno.local');

    const repeat = await request(app)
      .patch(`/api/admin/inventory/${corn._id}`)
      .set(auth(adminToken))
      .send({ stock: 2, threshold: 20 });
    assert.equal(repeat.body.item.alertedWhileLow, true);
    assert.equal(cornMails(), before + 1);

    const restored = await request(app)
      .patch(`/api/admin/inventory/${corn._id}`)
      .set(auth(adminToken))
      .send({ stock: 90, threshold: 20 });
    assert.equal(restored.body.item.alertedWhileLow, false);
    assert.equal(restored.body.item.stock, 90);
  });

  test('forgot password resets via the emailed link', async () => {
    const unknown = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@example.com' });
    assert.equal(unknown.status, 200);
    assert.equal(unknown.body.devPreview, undefined);

    const sent = await request(app).post('/api/auth/forgot-password').send({ email: userEmail });
    assert.equal(sent.status, 200);
    assert.ok(sent.body.devPreview.resetUrl);

    const reset = await request(app).post('/api/auth/reset-password').send({
      token: tokenFrom(sent.body.devPreview.resetUrl),
      password: 'Newpass123',
    });
    assert.equal(reset.status, 200);

    const oldPassword = await request(app).post('/api/auth/login').send({
      email: userEmail,
      password: 'Pizza1234',
      portal: 'user',
    });
    assert.equal(oldPassword.status, 401);

    const next = await request(app).post('/api/auth/login').send({
      email: userEmail,
      password: 'Newpass123',
      portal: 'user',
    });
    assert.equal(next.status, 200);
    userToken = next.body.token;
  });

  test('preset order, sold-out guard, and cancel restores stock', async () => {
    const session = await request(app).post('/api/payments/create-order').set(auth(userToken)).send({
      kind: 'preset',
      presetSlug: 'margherita',
      quantity: 1,
      address,
    });
    assert.equal(session.status, 201);
    const paid = await request(app).post('/api/payments/verify').set(auth(userToken)).send({
      razorpay_order_id: session.body.orderId,
      razorpay_payment_id: 'pay_DEMO_success',
    });
    assert.equal(paid.status, 201);
    assert.equal(paid.body.order.pizzaName, 'Margherita');
    assert.equal(paid.body.order.totalAmount, 1350);
    assert.equal(paid.body.order.payment.currency, 'KES');
    assert.equal(paid.body.order.payment.amountMinor, 135000);

    const peppers = await itemBySlug('peppers');
    const emptied = await request(app)
      .patch(`/api/admin/inventory/${peppers._id}`)
      .set(auth(adminToken))
      .send({ stock: 0 });
    assert.equal(emptied.status, 200);
    const blocked = await request(app).post('/api/payments/quote').set(auth(userToken)).send({
      kind: 'preset',
      presetSlug: 'orchard',
      quantity: 1,
    });
    assert.equal(blocked.status, 409);
    await request(app).patch(`/api/admin/inventory/${peppers._id}`).set(auth(adminToken)).send({ stock: 100 });

    const before = (await itemBySlug('onions')).stock;
    const cancelled = await request(app)
      .patch(`/api/admin/orders/${orderId}/status`)
      .set(auth(adminToken))
      .send({ status: 'Cancelled' });
    assert.equal(cancelled.status, 200);
    assert.equal((await itemBySlug('onions')).stock, before + 1);

    const reopen = await request(app)
      .patch(`/api/admin/orders/${orderId}/status`)
      .set(auth(adminToken))
      .send({ status: 'In Kitchen' });
    assert.equal(reopen.status, 400);
  });

  test('stock cron accepts the configured schedule', () => {
    const { startStockAlertJob } = require('../src/jobs/stockAlert');
    const task = startStockAlertJob();
    task.stop();
  });
});
