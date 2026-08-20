const mongoose = require('mongoose');

const serviceSnapshotSchema = new mongoose.Schema({
  service_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  name: { type: String, required: true },
  price: { type: mongoose.Schema.Types.Decimal128, required: true },
}, { _id: false });

const addressSnapshotSchema = new mongoose.Schema({
  line1: String,
  line2: String,
  city: String,
  state: String,
  pincode: String,
  country: String,
  lat: Number,
  lng: Number,
}, { _id: false });

const bookingSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    service_snapshot: { type: serviceSnapshotSchema, required: true },
    address_snapshot: { type: addressSnapshotSchema, required: true },
    booking_date: { type: Date, required: true },
    total_amount: { type: mongoose.Schema.Types.Decimal128, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

bookingSchema.index({ user_id: 1, created_at: -1 });
bookingSchema.index({ user_id: 1, status: 1 });
bookingSchema.index({ 'service_snapshot.service_id': 1 });
bookingSchema.index({ booking_date: 1 });
bookingSchema.index({ status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
