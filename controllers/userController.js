const mongoose = require('mongoose');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { serialize } = require('../utils/serialize');
const { getCloudinary } = require('../config/cloudinary');

const profileFieldMap = {
  firstName: 'first_name',
  lastName: 'last_name',
  email: 'email',
  phone: 'phone',
  avatar: 'img_url',
};

const getMe = async (req, res, next) => {
  try {
    res.json({ success: true, data: { user: serialize(req.user) } });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const update = {};
    for (const [camel, snake] of Object.entries(profileFieldMap)) {
      if (req.body[camel] !== undefined) update[snake] = req.body[camel];
    }

    if (Object.keys(update).length === 0) {
      throw new ApiError(422, 'No fields to update', 'VALIDATION_ERROR');
    }

    const user = await User.findByIdAndUpdate(req.userId, update, {
      returnDocument: 'after',
      runValidators: true,
    });
    res.json({ success: true, data: { user: serialize(user) } });
  } catch (err) {
    next(err);
  }
};

const addAddress = async (req, res, next) => {
  try {
    const { line1, line2, city, state, pincode, country, label, lat, lng, isDefault } = req.body;

    const address = {
      line1,
      line2,
      city,
      state,
      pincode,
      country: country || 'IN',
      label: label || 'home',
      is_default: false,
    };
    if (lat !== undefined) address.lat = lat;
    if (lng !== undefined) address.lng = lng;

    if (isDefault) {
      await User.updateOne({ _id: req.userId }, { $set: { 'addresses.$[].is_default': false } });
      address.is_default = true;
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $push: { addresses: address } },
      { returnDocument: 'after' }
    );
    res.json({ success: true, data: { user: serialize(user) } });
  } catch (err) {
    next(err);
  }
};

const updateAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;
    const { line1, line2, city, state, pincode, country, label, lat, lng, isDefault } = req.body;

    const setFields = {};
    if (line1 !== undefined) setFields['addresses.$[el].line1'] = line1;
    if (line2 !== undefined) setFields['addresses.$[el].line2'] = line2;
    if (city !== undefined) setFields['addresses.$[el].city'] = city;
    if (state !== undefined) setFields['addresses.$[el].state'] = state;
    if (pincode !== undefined) setFields['addresses.$[el].pincode'] = pincode;
    if (country !== undefined) setFields['addresses.$[el].country'] = country;
    if (label !== undefined) setFields['addresses.$[el].label'] = label;
    if (lat !== undefined) setFields['addresses.$[el].lat'] = lat;
    if (lng !== undefined) setFields['addresses.$[el].lng'] = lng;

    if (Object.keys(setFields).length === 0) {
      throw new ApiError(422, 'No fields to update', 'VALIDATION_ERROR');
    }

    if (isDefault) {
      await User.updateOne({ _id: req.userId }, { $set: { 'addresses.$[].is_default': false } });
      setFields['addresses.$[el].is_default'] = true;
    }

    const user = await User.findOneAndUpdate(
      { _id: req.userId, 'addresses._id': new mongoose.Types.ObjectId(addressId) },
      { $set: setFields },
      { arrayFilters: [{ 'el._id': new mongoose.Types.ObjectId(addressId) }], returnDocument: 'after' }
    );

    if (!user) throw new ApiError(404, 'Address not found', 'NOT_FOUND');
    res.json({ success: true, data: { user: serialize(user) } });
  } catch (err) {
    next(err);
  }
};

const deleteAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $pull: { addresses: { _id: new mongoose.Types.ObjectId(addressId) } } },
      { returnDocument: 'after' }
    );

    if (!user) throw new ApiError(404, 'User not found', 'NOT_FOUND');
    res.json({ success: true, data: { user: serialize(user) } });
  } catch (err) {
    next(err);
  }
};

const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(422, 'No image file uploaded', 'VALIDATION_ERROR');
    }

    const cloudinary = getCloudinary();

    const uploadStream = (buffer, options) =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
        stream.end(buffer);
      });

    const result = await uploadStream(req.file.buffer, {
      folder: 'avatars',
      public_id: `user_${req.userId}`,
      overwrite: true,
    });

    const user = await User.findByIdAndUpdate(
      req.userId,
      { img_url: result.secure_url },
      { returnDocument: 'after' }
    );
    res.json({ success: true, data: { user: serialize(user) } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMe, updateProfile, addAddress, updateAddress, deleteAddress, uploadImage };
