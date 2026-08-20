const mongoose = require('mongoose');
const User = require('../models/User');
const Service = require('../models/Service');
const ApiError = require('../utils/ApiError');
const { serialize } = require('../utils/serialize');

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const buildCart = async (userId) => {
  const user = await User.findById(userId).select('cart_items');
  const items = user.cart_items || [];

  const ids = items.map((i) => i.service_id);
  const services = await Service.find({ _id: { $in: ids }, is_active: true }).select('name price images');
  const serviceMap = new Map(services.map((s) => [s._id.toString(), s]));

  const cart = items.map((item) => {
    const service = serviceMap.get(item.service_id.toString());
    if (!service) {
      return {
        serviceId: item.service_id.toString(),
        quantity: item.quantity,
        addedAt: item.added_at,
        service: null,
      };
    }
    return {
      serviceId: item.service_id.toString(),
      quantity: item.quantity,
      addedAt: item.added_at,
      service: serialize(service),
    };
  });

  return cart;
};

const getCart = async (req, res, next) => {
  try {
    const cart = await buildCart(req.userId);
    res.json({ success: true, data: { cart } });
  } catch (err) {
    next(err);
  }
};

const addItem = async (req, res, next) => {
  try {
    const { serviceId, quantity = 1 } = req.body;
    const qty = Math.min(Math.max(parseInt(quantity, 10) || 1, 1), 99);

    const service = await Service.findOne({ _id: serviceId, is_active: true });
    if (!service) {
      throw new ApiError(404, 'Service not found', 'NOT_FOUND');
    }

    const user = await User.findOneAndUpdate(
      { _id: req.userId, 'cart_items.service_id': toObjectId(serviceId) },
      { $inc: { 'cart_items.$.quantity': qty } },
      { returnDocument: 'after' }
    ).select('cart_items');

    if (!user) {
      await User.findByIdAndUpdate(
        req.userId,
        { $push: { cart_items: { service_id: toObjectId(serviceId), quantity: qty } } },
        { returnDocument: 'after' }
      );
    }

    const cart = await buildCart(req.userId);
    res.status(user ? 200 : 201).json({ success: true, data: { cart } });
  } catch (err) {
    next(err);
  }
};

const updateQuantity = async (req, res, next) => {
  try {
    const { serviceId } = req.params;
    const qty = Math.min(Math.max(parseInt(req.body.quantity, 10) || 1, 1), 99);

    const user = await User.findOneAndUpdate(
      { _id: req.userId, 'cart_items.service_id': toObjectId(serviceId) },
      { $set: { 'cart_items.$.quantity': qty } },
      { returnDocument: 'after' }
    ).select('cart_items');

    if (!user) throw new ApiError(404, 'Item not found in cart', 'NOT_FOUND');

    const cart = await buildCart(req.userId);
    res.json({ success: true, data: { cart } });
  } catch (err) {
    next(err);
  }
};

const removeItem = async (req, res, next) => {
  try {
    const { serviceId } = req.params;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $pull: { cart_items: { service_id: toObjectId(serviceId) } } },
      { returnDocument: 'after' }
    ).select('cart_items');

    if (!user) throw new ApiError(404, 'User not found', 'NOT_FOUND');

    const cart = await buildCart(req.userId);
    res.json({ success: true, data: { cart } });
  } catch (err) {
    next(err);
  }
};

const clearCart = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.userId, { $set: { cart_items: [] } });
    res.json({ success: true, data: { cart: [] } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCart, addItem, updateQuantity, removeItem, clearCart };