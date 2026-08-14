const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['booking', 'payment', 'complaint', 'promotion', 'system'],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    reference_id: mongoose.Schema.Types.ObjectId,
    is_read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('Notification', notificationSchema);
