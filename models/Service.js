const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: mongoose.Schema.Types.Decimal128, required: true },
    duration_mins: { type: Number, required: true },
    images: [String],
    tags: { type: [String], index: true },
    avg_rating: { type: Number, default: 0, min: 0, max: 5 },
    review_count: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('Service', serviceSchema);
