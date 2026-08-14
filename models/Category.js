const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  name: { type: String, required: true, unique: true, trim: true },
  is_active: { type: Boolean, default: true },
});

module.exports = mongoose.model('Category', categorySchema);
