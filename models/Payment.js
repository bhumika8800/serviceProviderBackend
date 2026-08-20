const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    payment_mode: { type: String, enum: ['card', 'upi', 'netbanking', 'wallet', 'cash'] },
    transaction_id: String,
    razorpay_order_id: { type: String, unique: true, sparse: true },
    razorpay_payment_id: String,
    amount: { type: mongoose.Schema.Types.Decimal128, required: true },
    status: {
      type: String,
      enum: ['pending', 'successful', 'failed', 'refunded'],
      default: 'pending',
    },
    payment_date: Date,
    error: String,
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

paymentSchema.index({ booking_id: 1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);