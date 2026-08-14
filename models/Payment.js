const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    payment_mode: {
      type: String,
      enum: ['card', 'upi', 'netbanking', 'wallet', 'cash'],
      required: true,
    },
    transaction_id: { type: String, required: true },
    amount: { type: mongoose.Schema.Types.Decimal128, required: true },
    status: {
      type: String,
      enum: ['pending', 'successful', 'failed', 'refunded'],
      default: 'pending',
    },
    payment_date: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('Payment', paymentSchema);
