const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const { serialize, serializeList } = require('../utils/serialize');

const listNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const filter = { user_id: req.userId };

    const [total, unreadCount, docs] = await Promise.all([
      Notification.countDocuments(filter),
      Notification.countDocuments({ ...filter, is_read: false }),
      Notification.find(filter)
        .sort({ is_read: 1, created_at: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
    ]);

    res.json({
      success: true,
      data: {
        notifications: serializeList(docs),
        unreadCount,
      },
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

const markRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user_id: req.userId },
      { is_read: true },
      { returnDocument: 'after' }
    );

    if (!notification) throw new ApiError(404, 'Notification not found', 'NOT_FOUND');
    res.json({ success: true, data: serialize(notification) });
  } catch (err) {
    next(err);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ user_id: req.userId, is_read: false }, { is_read: true });
    res.json({ success: true, data: { updated: true } });
  } catch (err) {
    next(err);
  }
};

module.exports = { listNotifications, markRead, markAllRead };