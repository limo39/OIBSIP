const cron = require('node-cron');
const { checkLowStock } = require('../services/stockAlert');

function startStockAlertJob() {
  const requested = process.env.STOCK_CRON || '*/1 * * * *';
  const expression = cron.validate(requested) ? requested : '*/1 * * * *';
  if (expression !== requested) {
    console.warn(`Invalid STOCK_CRON "${requested}". Using ${expression}.`);
  }

  const task = cron.schedule(expression, () => {
    checkLowStock().catch((err) => {
      console.error('Stock alert job failed:', err.message);
    });
  });

  console.log(`Low-stock email check scheduled (${expression})`);
  return task;
}

module.exports = { startStockAlertJob };
