const Query = require('../models/Query');
const ApiError = require('../utils/ApiError');
const { serialize, serializeList } = require('../utils/serialize');

const createQuery = async (req, res, next) => {
  try {
    const { name, email, phone, title, message } = req.body;

    const query = await Query.create({
      user_id: req.user ? req.user._id : null,
      name,
      email,
      phone: phone || undefined,
      title,
      message,
      status: 'open',
    });

    res.status(201).json({ success: true, data: serialize(query) });
  } catch (err) {
    next(err);
  }
};

const listQueries = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const filter = {};
    if (status) filter.status = status;

    const [total, docs] = await Promise.all([
      Query.countDocuments(filter),
      Query.find(filter).sort({ created_at: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
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

const closeQuery = async (req, res, next) => {
  try {
    const query = await Query.findByIdAndUpdate(
      req.params.id,
      { status: 'closed' },
      { returnDocument: 'after' }
    );

    if (!query) throw new ApiError(404, 'Query not found', 'NOT_FOUND');
    res.json({ success: true, data: serialize(query) });
  } catch (err) {
    next(err);
  }
};

module.exports = { createQuery, listQueries, closeQuery };