const Booking = require('../models/Booking');
const Complaint = require('../models/Complaint');
const ApiError = require('../utils/ApiError');
const { serialize, serializeList } = require('../utils/serialize');
const { createNotification } = require('../utils/notification');

const createComplaint = async (req, res, next) => {
  try {
    const { bookingId, title, description } = req.body;

    const booking = await Booking.findOne({ _id: bookingId, user_id: req.userId, is_active: true });
    if (!booking) throw new ApiError(404, 'Booking not found', 'NOT_FOUND');
    if (booking.status !== 'completed') {
      throw new ApiError(409, 'Complaints can only be filed against completed bookings', 'INVALID_STATUS');
    }

    const complaint = await Complaint.create({
      booking_id: booking._id,
      user_id: req.userId,
      title,
      description,
      status: 'open',
    });

    res.status(201).json({ success: true, data: serialize(complaint) });
  } catch (err) {
    next(err);
  }
};

const listComplaints = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const filter = { user_id: req.userId };
    if (status) filter.status = status;

    const [total, docs] = await Promise.all([
      Complaint.countDocuments(filter),
      Complaint.find(filter).sort({ created_at: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
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

const getComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) throw new ApiError(404, 'Complaint not found', 'NOT_FOUND');

    const isOwner = complaint.user_id.toString() === req.userId;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      throw new ApiError(403, 'You do not have permission to view this complaint', 'FORBIDDEN');
    }

    res.json({ success: true, data: serialize(complaint) });
  } catch (err) {
    next(err);
  }
};

const updateComplaintStatus = async (req, res, next) => {
  try {
    const { status, resolutionNotes } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) throw new ApiError(404, 'Complaint not found', 'NOT_FOUND');

    const update = { status };
    if (resolutionNotes !== undefined) update.resolution_notes = resolutionNotes;
    if (status === 'resolved' || status === 'closed') update.resolved_at = new Date();

    const updated = await Complaint.findByIdAndUpdate(complaint._id, update, { returnDocument: 'after' });

    await createNotification({
      userId: complaint.user_id,
      type: 'complaint',
      title: `Complaint ${status.replace('_', ' ')}`,
      message: `Your complaint "${complaint.title}" is now ${status.replace('_', ' ')}.`,
      referenceId: complaint._id,
    });

    res.json({ success: true, data: serialize(updated) });
  } catch (err) {
    next(err);
  }
};

module.exports = { createComplaint, listComplaints, getComplaint, updateComplaintStatus };