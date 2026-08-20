const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { serialize, serializeList } = require('../utils/serialize');
const { createNotification } = require('../utils/notification');

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const createBooking = async (req, res, next) => {
  try {
    const { serviceId, addressId, bookingDate, quantity = 1 } = req.body;
    const qty = Math.min(Math.max(parseInt(quantity, 10) || 1, 1), 99);

    const [service, user] = await Promise.all([
      Service.findOne({ _id: serviceId, is_active: true }),
      User.findById(req.userId),
    ]);

    if (!service) throw new ApiError(404, 'Service not found', 'NOT_FOUND');

    const address = (user.addresses || []).find((a) => a._id.toString() === addressId);
    if (!address) throw new ApiError(404, 'Address not found', 'NOT_FOUND');

    const date = new Date(bookingDate);
    if (Number.isNaN(date.getTime())) {
      throw new ApiError(422, 'Invalid booking date', 'VALIDATION_ERROR');
    }

    const unitPrice = parseFloat(service.price.toString());
    const booking = await Booking.create({
      user_id: req.userId,
      service_snapshot: {
        service_id: service._id,
        name: service.name,
        price: service.price,
      },
      address_snapshot: {
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        country: address.country,
        lat: address.lat,
        lng: address.lng,
      },
      booking_date: date,
      total_amount: unitPrice * qty,
      status: 'pending',
      is_active: true,
    });

    await User.updateOne(
      { _id: req.userId },
      { $pull: { cart_items: { service_id: toObjectId(serviceId) } } }
    );

    res.status(201).json({ success: true, data: serialize(booking) });
  } catch (err) {
    next(err);
  }
};

const listBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const filter = { user_id: req.userId, is_active: true };
    if (status) filter.status = status;

    const [total, docs] = await Promise.all([
      Booking.countDocuments(filter),
      Booking.find(filter).sort({ created_at: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
    ]);

    res.json({
      success: true,
      data: serializeList(docs),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};

const getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, is_active: true });
    if (!booking) throw new ApiError(404, 'Booking not found', 'NOT_FOUND');

    const isOwner = booking.user_id.toString() === req.userId;
    const isStaff = ['admin', 'provider'].includes(req.user.role);
    if (!isOwner && !isStaff) {
      throw new ApiError(403, 'You do not have permission to view this booking', 'FORBIDDEN');
    }

    res.json({ success: true, data: serialize(booking) });
  } catch (err) {
    next(err);
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user_id: req.userId, is_active: true });
    if (!booking) throw new ApiError(404, 'Booking not found', 'NOT_FOUND');

    if (!['pending', 'confirmed'].includes(booking.status)) {
      throw new ApiError(409, `Booking cannot be cancelled in "${booking.status}" status`, 'INVALID_STATUS');
    }

    booking.status = 'cancelled';
    await booking.save();

    await createNotification({
      userId: req.userId,
      type: 'booking',
      title: 'Booking cancelled',
      message: `Your booking for ${booking.service_snapshot.name} has been cancelled.`,
      referenceId: booking._id,
    });

    res.json({ success: true, data: serialize(booking) });
  } catch (err) {
    next(err);
  }
};

const validTransitions = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findOne({ _id: req.params.id, is_active: true });
    if (!booking) throw new ApiError(404, 'Booking not found', 'NOT_FOUND');

    const allowed = validTransitions[booking.status] || [];
    if (!allowed.includes(status)) {
      throw new ApiError(
        409,
        `Cannot move booking from "${booking.status}" to "${status}"`,
        'INVALID_STATUS'
      );
    }

    booking.status = status;
    await booking.save();

    if (status === 'confirmed' || status === 'cancelled') {
      await createNotification({
        userId: booking.user_id,
        type: 'booking',
        title: status === 'confirmed' ? 'Booking confirmed' : 'Booking cancelled',
        message:
          status === 'confirmed'
            ? `Your booking for ${booking.service_snapshot.name} has been confirmed.`
            : `Your booking for ${booking.service_snapshot.name} has been cancelled.`,
        referenceId: booking._id,
      });
    }

    res.json({ success: true, data: serialize(booking) });
  } catch (err) {
    next(err);
  }
};

module.exports = { createBooking, listBookings, getBooking, cancelBooking, updateStatus };