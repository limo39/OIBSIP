# Forno Pizza Delivery System

A full-stack pizza ordering and kitchen management application built for the Nairobi market. Customers can build custom pizzas, place orders with real-time payment processing, and track delivery status. Kitchen staff manage inventory, fulfill orders, and receive automated stock alerts.

## Features

### Customer Features

- User registration with email verification
- Secure authentication using JWT (Authorization header and httpOnly cookie)
- Password reset via email link
- Browse pre-configured house pizzas
- Custom pizza builder with four steps:
  - Base selection (thin crust, thick crust, etc.)
  - Sauce selection (tomato, pesto, etc.)
  - Cheese selection (mozzarella, cheddar, etc.)
  - Vegetable toppings
- Order review and payment
- Real-time order status tracking:
  - Order Received
  - In Kitchen
  - Sent to Delivery
- Order history with detailed view

### Admin/Kitchen Features

- Separate staff authentication (cannot be created through registration)
- Comprehensive inventory management:
  - Track stock levels for bases, sauces, cheeses, and vegetables
  - Edit stock quantities, prices, and low-stock thresholds
  - Automatic stock deduction on confirmed payments
  - Stock restoration on order cancellation
- Order management dashboard
- Real-time order updates via Socket.IO
- Automated low-stock email alerts via cron jobs

### Technical Features

- Real-time updates using Socket.IO and polling
- Payment processing via Razorpay (test mode with KES currency)
- Automated email notifications using Nodemailer
- Scheduled inventory monitoring with node-cron
- Optional embedded MongoDB for zero-configuration setup
- Responsive design with Tailwind CSS

## Technology Stack

### Frontend
- React 18 with Vite
- React Router DOM for navigation
- Socket.IO client for real-time updates
- Tailwind CSS for styling
- Custom context providers for authentication and notifications

### Backend
- Node.js with Express
- MongoDB (embedded or external)
- Socket.IO for real-time communication
- JWT for authentication
- Nodemailer for email delivery
- node-cron for scheduled tasks
- Razorpay SDK for payment processing

## Prerequisites

- Node.js 20 or newer
- MongoDB (optional - embedded version available)

## Installation

1. Clone the repository
2. Install dependencies for all components:

```bash
npm install
npm install --prefix server
npm install --prefix client
```

3. Configure environment variables:

Copy `server/.env.example` to `server/.env` and configure as needed:

```bash
cp server/.env.example server/.env
```

## Configuration

### Environment Variables

#### Server Configuration

```
PORT=5000
NODE_ENV=development
```

#### Database

Leave `MONGODB_URI` blank to use embedded MongoDB (recommended for development):

```
MONGODB_URI=
```

Or specify your own MongoDB connection string:

```
MONGODB_URI=mongodb://127.0.0.1:27017/forno
```

The embedded MongoDB stores data in `server/data/db`. First launch downloads the MongoDB binary (approximately 600 MB) into local cache.

#### Authentication

```
JWT_SECRET=replace-with-a-long-random-string
JWT_EXPIRES=7d
```

#### Client URLs

```
CLIENT_ORIGIN=http://localhost:5173
CLIENT_URL=http://localhost:5173
```

#### Seeded Accounts

Default credentials for development (used only if accounts do not exist):

```
ADMIN_EMAIL=admin@forno.local
ADMIN_PASSWORD=Admin@12345
DEMO_USER_EMAIL=user@forno.local
DEMO_USER_PASSWORD=User@12345
```

#### Email Configuration

For development, leave `SMTP_HOST` blank to print emails in console and save to `server/tmp/emails.jsonl`:

```
SMTP_HOST=
```

For production, configure SMTP settings:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM=Forno <noreply@forno.local>
ADMIN_EMAIL=kitchen@yourdomain.com
```

Note: Gmail requires an app password, not your regular account password.

#### Payment Configuration

Razorpay test mode (optional):

```
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

To set up Razorpay:

1. Switch to Test Mode in Razorpay dashboard
2. Navigate to Account & Settings → API Keys
3. Generate test key pair
4. Add credentials to `.env`

If left blank, the application uses a demo checkout interface with Success/Failure options.

Test card details:
- Card Number: 4100 2800 0000 1007
- Expiry: Any future date
- CVV: Any 3 digits
- OTP: Any 4-10 digit code (on test page)

Note: Standard Razorpay India accounts may only accept INR. Orders are created in KES (Kenyan Shillings). Use demo mode if currency is rejected.

#### Stock Monitoring

```
STOCK_CRON=*/1 * * * *
SEED_ON_START=true
```

Default schedule checks stock every minute. Emails are sent to `ADMIN_EMAIL` when items fall below their threshold. Alert rearms after restocking.

## Running the Application

### Development Mode

Start both API and client development servers:

```bash
npm run dev
```

Access points:
- Customer App: http://localhost:5173
- Admin Login: http://localhost:5173/admin/login
- API: http://localhost:5000

Note: If PowerShell blocks npm commands, use `npm.cmd` instead or enable local scripts for your user.

### Seeding the Database

Initial seed (creates default inventory and accounts):

```bash
npm run seed
```

Reset and reload menu data:

```bash
npm run seed --prefix server -- --reset
```

The seed includes black olives set below the threshold of 20 to demonstrate the stock alert email on first boot.

### Production Build

Build the client for production:

```bash
npm run build
```

The API automatically serves the production bundle from `client/dist` when that directory exists.

Start production API:

```bash
npm start
```

### Testing

Run API smoke tests (covers auth, checkout, stock, socket, mail, cron):

```bash
npm test
```

## Default Accounts

| Role | Email | Password | Login URL |
| --- | --- | --- | --- |
| Customer | user@forno.local | User@12345 | http://localhost:5173/login |
| Kitchen Staff | admin@forno.local | Admin@12345 | http://localhost:5173/admin/login |

Admin accounts cannot be created through the registration form. Guest tokens cannot access `/api/admin` routes.

## Application Flow

### Customer Order Flow

1. Customer registers and verifies email
2. Logs in to access the pizza builder
3. Builds custom pizza or selects house pizza
4. Reviews order and proceeds to payment
5. Completes payment via Razorpay or demo checkout
6. Receives order confirmation
7. Tracks order status in real-time
8. Views order history

### Payment Verification Flow

1. Browser requests `POST /api/payments/create-order`
2. Razorpay (or demo sheet) collects payment information
3. `POST /api/payments/verify` validates signature (HMAC of order_id|payment_id)
4. Stock is decremented using conditional updates (prevents double-decrement)
5. Order is saved to database
6. Real-time update sent to admin dashboard

### Kitchen Order Flow

1. New orders appear on admin dashboard
2. Staff updates order status:
   - Order Received
   - In Kitchen
   - Sent to Delivery
3. Status changes broadcast via Socket.IO
4. Customer receives real-time updates
5. Stock automatically adjusts with order lifecycle

### Inventory Management

1. Staff views current stock levels
2. Edits quantities, prices, and thresholds
3. System monitors stock after each order
4. Automated alerts sent when items drop below threshold
5. Restocking above threshold rearms the alert

## Project Structure

```
server/
  src/
    app.js              Express application setup
    index.js            Entry point
    socket.js           Socket.IO configuration
    constants.js        Application constants
    config/             Database and service configuration
    jobs/               Cron job definitions
    middleware/         Auth and validation middleware
    models/             MongoDB schemas
    routes/             API route definitions
    seed/               Database seeding scripts
    services/           Payment, email, and business logic
    utils/              Helper functions
  .env                  Environment configuration
  .env.example          Environment template

client/
  src/
    components/         Reusable React components
    context/            Context providers (Auth, Toast)
    hooks/              Custom React hooks
    pages/              Page components
      admin/            Admin-specific pages
    App.jsx             Route configuration
    main.jsx            Application entry point
    index.css           Global styles
    api.js              API client
    utils.js            Helper functions
  index.html            HTML template
  vite.config.js        Vite configuration
  tailwind.config.js    Tailwind CSS configuration

package.json            Root package with workspace scripts
```

## Currency and Locale

The application is configured for the Nairobi market:

- Currency: KES (Kenyan Shillings)
- Phone format: 10 digits starting with 07 or 01
- Postal codes: 5 digits (example: 00100 for Nairobi)
- Sample pricing:
  - Margherita pizza: KSh 1,150
  - Delivery fee: KSh 200
  - Free delivery threshold: KSh 2,500

Amounts are stored as whole shillings in the application and multiplied by 100 for Razorpay API calls.

## Real-time Updates

The application uses a hybrid approach for real-time updates:

- Socket.IO for instant push notifications on order status changes
- Periodic polling as fallback for reliability
- Both customer and admin interfaces stay synchronized

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start API and client development servers concurrently |
| `npm run seed` | Seed database with initial data |
| `npm test` | Run API test suite |
| `npm run build` | Build production client bundle |
| `npm start` | Start production API server |

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-email/:token` - Email verification
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password/:token` - Reset password
- `GET /api/auth/me` - Get current user

### Admin Authentication
- `POST /api/admin/login` - Admin login
- `GET /api/admin/me` - Get current admin

### Menu
- `GET /api/menu` - Get available ingredients and prices

### Orders
- `GET /api/orders` - Get user orders
- `GET /api/orders/:id` - Get specific order
- `POST /api/orders` - Create new order

### Payments
- `POST /api/payments/create-order` - Initialize payment
- `POST /api/payments/verify` - Verify payment and create order

### Admin Inventory
- `GET /api/admin/inventory` - Get all inventory items
- `PUT /api/admin/inventory/:id` - Update inventory item

### Admin Orders
- `GET /api/admin/orders` - Get all orders
- `PUT /api/admin/orders/:id` - Update order status
- `DELETE /api/admin/orders/:id` - Cancel order

## Security Features

- Password hashing with bcrypt
- JWT-based authentication with httpOnly cookies
- CORS configuration for client origin
- Input validation and sanitization
- Role-based access control
- Secure payment verification with HMAC signatures
- Environment-based configuration for sensitive data

## Development Notes

### Database Persistence

An existing database retains stock counts and order history across restarts. On the next API start with seeded data, the catalog revision system updates prices and pizza names without resetting stock levels.

Use `npm run seed --prefix server -- --reset` to completely rebuild inventory.

### Email Development

During development, verification and password reset screens display the action link directly, allowing you to test the flow without checking email logs.

### Stock Alert Timing

The low-stock check runs:
- On schedule (default: every minute)
- Immediately after an order is confirmed
- Immediately after manual stock edit

This ensures demo presentations do not require waiting for the cron schedule.

## Troubleshooting

### PowerShell Script Execution

If npm commands are blocked, either:
- Use `npm.cmd` instead of `npm`
- Enable script execution: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

### MongoDB Connection

If external MongoDB connection fails:
- Ensure MongoDB is running
- Check connection string format
- Verify network access and firewall settings
- Try embedded mode by leaving `MONGODB_URI` blank

### Razorpay Currency Issues

If Razorpay test mode rejects KES:
- Leave `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` blank
- Application falls back to demo checkout mode
- Demo mode still validates the complete order flow

### Port Conflicts

Default ports:
- API: 5000
- Client: 5173

Change in environment variables if ports are in use.

## License

Private project for Oasis Infobyte Internship

## Author

Created as part of the Oasis Infobyte Web Development Internship (Level 3)
