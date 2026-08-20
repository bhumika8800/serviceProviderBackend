const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Service = require('../models/Service');
const ApiError = require('../utils/ApiError');
const { serialize, serializeList } = require('../utils/serialize');

const createReview = async (req, res, next) => {
  try {
    const { bookingId, rating, comment } = req.body;

    const booking = await Booking.findOne({ _id: bookingId, user_id: req.userId, is_active: true });
    if (!booking) throw new ApiError(404, 'Booking not found', 'NOT_FOUND');
    if (booking.status !== 'completed') {
      throw new ApiError(409, 'You can only review a completed booking', 'INVALID_STATUS');
    }

    const serviceId = booking.service_snapshot.service_id;

    const session = await mongoose.startSession();
    try {
      let review = await session.withTransaction(async () => {
        const existing = await Review.findOne({ booking_id: booking._id }).session(session);
        if (existing) {
          throw new ApiError(409, 'You have already reviewed this booking', 'REVIEW_EXISTS');
        }

        const service = await Service.findById(serviceId).session(session);
        if (!service) throw new ApiError(404, 'Service not found', 'NOT_FOUND');

        const newCount = (service.review_count || 0) + 1;
        const newAvg =
          ((service.avg_rating || 0) * (service.review_count || 0) + rating) / newCount;

        await Service.updateOne(
          { _id: serviceId },
          { $set: { avg_rating: Math.round(newAvg * 100) / 100, review_count: newCount } }
        ).session(session);

        return Review.create(
          [{ booking_id: booking._id, user_id: req.userId, service_id: serviceId, rating, comment }],
          { session }
        );
      });
      review = review[0];

      res.status(201).json({ success: true, data: serialize(review) });
    } finally {
      session.endSession();
    }
  } catch (err) {
    next(err);
  }
};

const listServiceReviews = async (req, res, next) => {
  try {
    const { id: serviceId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const filter = { service_id: serviceId };

    const [total, docs] = await Promise.all([
      Review.countDocuments(filter),
      Review.find(filter)
        .populate('user_id', 'first_name last_name img_url')
        .sort({ created_at: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
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

module.exports = { createReview, listServiceReviews };