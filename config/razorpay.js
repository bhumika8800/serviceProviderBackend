const Razorpay = require('razorpay');

const hasRazorpayConfig = () =>
  !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

let instance = null;

const getRazorpay = () => {
  if (!hasRazorpayConfig()) {
    throw new Error('Razorpay credentials not configured in .env');
  }
  if (!instance) {
    instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return instance;
};

module.exports = { getRazorpay, hasRazorpayConfig };