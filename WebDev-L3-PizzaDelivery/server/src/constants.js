const ORDER_STATUSES = [
  'Order Received',
  'In Kitchen',
  'Sent to Delivery',
  'Delivered',
  'Cancelled',
];

const PIPELINE = ['Order Received', 'In Kitchen', 'Sent to Delivery'];

const CURRENCY = 'KES';
const DELIVERY_FEE = 200;
const FREE_DELIVERY_OVER = 2500;

module.exports = {
  ORDER_STATUSES,
  PIPELINE,
  CURRENCY,
  DELIVERY_FEE,
  FREE_DELIVERY_OVER,
};
