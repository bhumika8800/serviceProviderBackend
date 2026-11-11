const Category = require('../models/Category');
const Service = require('../models/Service');
const ApiError = require('../utils/ApiError');
const { serialize, serializeList } = require('../utils/serialize');

const canSeeInactive = (req) =>
  req.user && ['admin', 'provider'].includes(req.user.role);

const listCategories = async (req, res, next) => {
  try {
    const { parentId, includeInactive } = req.query;
    const query = {};

    if (!(includeInactive === 'true' && canSeeInactive(req))) {
      query.is_active = true;
    }

    if (parentId) {
      query.parent_id = parentId === 'null' ? null : parentId;
    }

    const categories = await Category.find(query).sort({ name: 1 });
    res.json({ success: true, data: serializeList(categories) });
  } catch (err) {
    next(err);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const { name, parentId } = req.body;
    const trimmedName = name.trim();

    if (parentId) {
      const parent = await Category.findById(parentId);
      if (!parent || !parent.is_active) {
        throw new ApiError(404, 'Parent category not found', 'NOT_FOUND');
      }
    }

    const existing = await Category.findOne({ name: trimmedName });
    if (existing) {
      throw new ApiError(409, 'A category with this name already exists', 'CONFLICT');
    }

    const category = await Category.create({
      name: trimmedName,
      parent_id: parentId || null,
    });

    res.status(201).json({ success: true, data: serialize(category) });
  } catch (err) {
    next(err);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const { name, parentId, isActive } = req.body;
    const update = {};

    if (name !== undefined) {
      const trimmedName = name.trim();
      const existing = await Category.findOne({
        name: trimmedName,
        _id: { $ne: req.params.id },
      });
      if (existing) {
        throw new ApiError(409, 'A category with this name already exists', 'CONFLICT');
      }
      update.name = trimmedName;
    }

    if (parentId !== undefined) {
      if (parentId === null) {
        update.parent_id = null;
      } else {
        if (parentId === req.params.id) {
          throw new ApiError(400, 'A category cannot be its own parent', 'INVALID_OPERATION');
        }
        const parent = await Category.findById(parentId);
        if (!parent || !parent.is_active) {
          throw new ApiError(404, 'Parent category not found', 'NOT_FOUND');
        }
        update.parent_id = parentId;
      }
    }

    if (isActive !== undefined) update.is_active = isActive;

    if (Object.keys(update).length === 0) {
      throw new ApiError(422, 'No fields to update', 'VALIDATION_ERROR');
    }

    const category = await Category.findByIdAndUpdate(req.params.id, update, {
      returnDocument: 'after',
      runValidators: true,
    });

    if (!category) throw new ApiError(404, 'Category not found', 'NOT_FOUND');
    res.json({ success: true, data: serialize(category) });
  } catch (err) {
    next(err);
  }
};

const deactivateCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { is_active: false },
      { returnDocument: 'after' }
    );

    if (!category) throw new ApiError(404, 'Category not found', 'NOT_FOUND');
    res.json({ success: true, data: serialize(category) });
  } catch (err) {
    next(err);
  }
};

const listServices = async (req, res, next) => {
  try {
    const { q, categoryId, tag, includeInactive, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const filter = {};
    if (!(includeInactive === 'true' && canSeeInactive(req))) {
      filter.is_active = true;
    }
    const sort = {};

    if (categoryId) {
      filter.category_id = categoryId;
    }

    if (tag) {
      filter.tags = { $in: [tag] };
    }

    let textScore = null;
    if (q) {
      filter.$text = { $search: q };
      sort.score = { $meta: 'textScore' };
      textScore = { score: { $meta: 'textScore' } };
    } else {
      sort.created_at = -1;
    }

    const [total, docs] = await Promise.all([
      Service.countDocuments(filter),
      Service.find(filter, textScore).sort(sort).skip((pageNum - 1) * limitNum).limit(limitNum),
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

const getService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    const showInactive = req.query.includeInactive === 'true' && canSeeInactive(req);
    if (!service || (!service.is_active && !showInactive)) {
      throw new ApiError(404, 'Service not found', 'NOT_FOUND');
    }
    res.json({ success: true, data: serialize(service) });
  } catch (err) {
    next(err);
  }
};

const createService = async (req, res, next) => {
  try {
    const { categoryId, name, description, price, durationMins, images, tags } = req.body;

    const category = await Category.findById(categoryId);
    if (!category || !category.is_active) {
      throw new ApiError(404, 'Category not found', 'NOT_FOUND');
    }

    const service = await Service.create({
      category_id: categoryId,
      name,
      description,
      price,
      duration_mins: durationMins,
      images: images || [],
      tags: tags || [],
    });

    res.status(201).json({ success: true, data: serialize(service) });
  } catch (err) {
    next(err);
  }
};

const updateService = async (req, res, next) => {
  try {
    const { categoryId, name, description, price, durationMins, images, tags, isActive } = req.body;

    const update = {};
    if (categoryId !== undefined) {
      const category = await Category.findById(categoryId);
      if (!category || !category.is_active) {
        throw new ApiError(404, 'Category not found', 'NOT_FOUND');
      }
      update.category_id = categoryId;
    }
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (price !== undefined) update.price = price;
    if (durationMins !== undefined) update.duration_mins = durationMins;
    if (images !== undefined) update.images = images;
    if (tags !== undefined) update.tags = tags;
    if (isActive !== undefined) update.is_active = isActive;

    if (Object.keys(update).length === 0) {
      throw new ApiError(422, 'No fields to update', 'VALIDATION_ERROR');
    }

    const service = await Service.findByIdAndUpdate(req.params.id, update, {
      returnDocument: 'after',
      runValidators: true,
    });

    if (!service) throw new ApiError(404, 'Service not found', 'NOT_FOUND');
    res.json({ success: true, data: serialize(service) });
  } catch (err) {
    next(err);
  }
};

const deactivateService = async (req, res, next) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { is_active: false },
      { returnDocument: 'after' }
    );

    if (!service) throw new ApiError(404, 'Service not found', 'NOT_FOUND');
    res.json({ success: true, data: serialize(service) });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deactivateCategory,
  listServices,
  getService,
  createService,
  updateService,
  deactivateService,
};
