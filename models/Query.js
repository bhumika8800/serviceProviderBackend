const mongoose = require('mongoose');

const querySchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    title: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('Query', querySchema);
