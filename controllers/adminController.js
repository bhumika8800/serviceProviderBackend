const User = require('../models/User');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Complaint = require('../models/Complaint');
const Query = require('../models/Query');
const ApiError = require('../utils/ApiError');
const { serializeList } = require('../utils/serialize');

const listUsers = async (req, res, next) => {
  try {
    const { role, q, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const filter = {};
    if (role) filter.role = role;
    if (q) {
      filter.$or = [
        { first_name: { $regex: q, $options: 'i' } },
        { last_name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
      ];
    }

    const [total, docs] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter).sort({ created_at: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
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

const toggleUserActive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (id === req.userId) {
      throw new ApiError(400, 'You cannot block your own account', 'INVALID_OPERATION');
    }

    const user = await User.findById(id);
    if (!user) throw new ApiError(404, 'User not found', 'NOT_FOUND');
    if (user.role === 'admin') {
      throw new ApiError(400, 'Admin accounts cannot be blocked', 'INVALID_OPERATION');
    }

    user.is_active = isActive;
    await user.save();

    res.json({ success: true, data: { user: user.toObject() } });
  } catch (err) {
    next(err);
  }
};

const listBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const filter = {};
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

const getDashboardStats = async (req, res, next) => {
  try {
    const [totalUsers, activeUsers, totalServices, bookingsByStatus, revenueAgg, openComplaints, openQueries] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ is_active: true }),
        Service.countDocuments({ is_active: true }),
        Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        Payment.aggregate([
          { $match: { status: 'successful' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Complaint.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
        Query.countDocuments({ status: 'open' }),
      ]);

    const statusCounts = {};
    for (const row of bookingsByStatus) statusCounts[row._id] = row.count;

    const totalRevenue = revenueAgg.length ? parseFloat(revenueAgg[0].total.toString()) : 0;

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalServices,
        bookingsByStatus: statusCounts,
        totalRevenue,
        openComplaints,
        openQueries,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { listUsers, toggleUserActive, listBookings, getDashboardStats };