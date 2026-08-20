const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  label: { type: String, enum: ['home', 'work', 'other'], default: 'home' },
  line1: { type: String, required: true },
  line2: String,
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  country: { type: String, default: 'IN' },
  lat: Number,
  lng: Number,
  is_default: { type: Boolean, default: false },
});

const cartItemSchema = new mongoose.Schema({
  service_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  quantity: { type: Number, default: 1, min: 1 },
  added_at: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema(
  {
    firebase_uid: { type: String, unique: true, sparse: true },
    first_name: { type: String, trim: true },
    last_name: { type: String, trim: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    img_url: String,
    role: { type: String, enum: ['customer', 'provider', 'admin'], default: 'customer' },
    addresses: [addressSchema],
    cart_items: [cartItemSchema],
    fcm_token: String,
    is_active: { type: Boolean, default: true },
    profile_complete: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('User', userSchema);
