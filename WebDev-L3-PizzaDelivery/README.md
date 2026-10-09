# Forno

A Nairobi pizza counter and a Westlands kitchen pass. Guests build a pie, pay in Kenyan shillings through Razorpay test mode, and watch the ticket move. The kitchen watches stock, updates orders, and gets an email when an ingredient drops under its threshold.

## What it does

**Guests**

- Register and confirm the email before login
- Log in with a JWT (Authorization header and httpOnly cookie)
- Reset a forgotten password from an emailed link
- Browse house pies
- Build a pie in four steps: base, sauce, cheese, vegetables
- Review the order, then pay
- Watch status move from **Order Received** to **In Kitchen** to **Sent to Delivery**

**Kitchen**

- Separate staff login. Registration cannot create an admin
- Inventory for bases, sauces, cheeses, and vegetables
- Stock drops when a payment is confirmed, and returns if an open order is cancelled
- Edit stock, price, and the low-stock threshold on each item
- A `node-cron` job emails the admin when an item sits below its threshold
- Order board. Status changes are pushed over Socket.IO and the guest pages also poll

## Stack

React (Vite), Node.js, Express, MongoDB, Socket.IO, Nodemailer, node-cron, Razorpay test mode.

## Run it

You need Node.js 20 or newer. MongoDB is optional.

```bash
npm install
npm install --prefix server
npm install --prefix client
npm run dev
```

- Guest app: http://localhost:5173
- API: http://localhost:5000

If PowerShell blocks `npm`, call `npm.cmd` instead, or allow local scripts for your user.

### Accounts

| Door | Email | Password |
| --- | --- | --- |
| Guest | user@forno.local | User@12345 |
| Staff | admin@forno.local | Admin@12345 |

Staff sign in at http://localhost:5173/admin/login. That account is seeded. It is not offered on the registration form, and a guest token cannot open `/api/admin`.

### Database

Set `MONGODB_URI` in `server/.env` to your own MongoDB (local or Atlas).

If `MONGODB_URI` is empty, the API starts an embedded MongoDB and stores it in `server/data/db` when it can. Nothing else to install. The first launch downloads the MongoDB binary (about 600 MB) into the local cache. Later starts reuse it.

```bash
npm run seed
```

`npm run seed` reloads the menu when you pass `--reset` through the server script:

```bash
npm run seed --prefix server -- --reset
```

Black olives are seeded below the threshold of 20 so the first boot sends a stock email.

### Email

Leave `SMTP_HOST` empty while developing. Messages print in the API console and in `server/tmp/emails.jsonl`. Verification and reset screens also show the link so you can finish the flow without a mailbox.

To send real mail, fill in `server/.env`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@gmail.com
SMTP_PASS=an-app-password
MAIL_FROM=Forno <you@gmail.com>
ADMIN_EMAIL=kitchen@yourdomain.com
```

Gmail needs an app password, not the account password.

### Razorpay test mode

1. In the Razorpay dashboard switch to **Test Mode**.
2. Open **Account & Settings → API Keys** and generate a test key.
3. Put them in `server/.env`:

```
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

4. Restart the API. Checkout uses the official Razorpay script. The test bank page has **Success** and **Failure**. Success is verified on the server (HMAC of `order_id|payment_id`) and only then is the order saved and stock reduced.

A working test card is Visa `4100 2800 0000 1007`, any future expiry, any CVV. The OTP page accepts a 4 to 10 digit code as success. Details: https://razorpay.com/docs/payments/payments/test-card-upi-details/

Checkout asks Razorpay for **KES** (Kenyan shillings). Amounts are whole shillings in the app, and shillings times 100 in the payment request. A standard Razorpay India account often accepts only INR, so a real test key may reject KES. Leave the keys blank and Forno opens its own test sheet with the same Success / Failure choice. Clicking Success confirms the order. No money moves in either mode.

Menu prices are Nairobi takeaway prices: a Margherita is KSh 1,150 before delivery, delivery is KSh 200, and delivery is free from KSh 2,500. Phones are 10 digits starting with 07 or 01. Postal codes are 5 digits (00100 is Nairobi).

The seeded guest is Wanjiku Mwangi and the kitchen account is Forno Nairobi. Passwords are unchanged. An existing database keeps stock counts and old orders. On the next API start, catalog revision 2 rewrites ingredient prices and pie names. `npm run seed --prefix server -- --reset` rebuilds stock as well.

### Low-stock schedule

`STOCK_CRON` defaults to `*/1 * * * *` (every minute). The job emails `ADMIN_EMAIL` once per dip under the threshold. Restocking at or above the threshold arms the alert again. The same check also runs immediately after an order or a manual stock edit, so you do not have to wait for the clock during a demo.

Each item has its own threshold. The seeded default is 20.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API and Vite together |
| `npm test` | API smoke test (auth, checkout, stock, socket, mail, cron) |
| `npm run build` | Production client bundle. The API serves `client/dist` when that folder exists |
| `npm start` | API only |

## Layout

```
server/src          Express app, models, Razorpay, cron, socket
client/src          React guest app and kitchen screens
server/.env.example Variables to copy
```

Order flow: the browser asks `POST /api/payments/create-order`, Razorpay (or the demo sheet) collects the result, then `POST /api/payments/verify` checks the signature, decrements stock with a conditional update, and writes the order. A second verify for the same payment does not decrement twice.
