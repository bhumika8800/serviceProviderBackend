const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { getAdmin } = require('../config/firebase');
const ApiError = require('../utils/ApiError');
const { serialize } = require('../utils/serialize');

const signToken = (user) =>
  jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY || '7d',
  });

const verify = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      throw new ApiError(422, 'idToken is required', 'VALIDATION_ERROR');
    }

    const admin = getAdmin();
    const decoded = await admin.auth().verifyIdToken(idToken);

    let user = await User.findOne({ firebase_uid: decoded.uid });

    if (!user && decoded.email) {
      user = await User.findOne({ email: decoded.email.toLowerCase() });
      if (user) {
        user.firebase_uid = decoded.uid;
        if (!user.img_url && decoded.picture) user.img_url = decoded.picture;
      }
    }

    if (!user) {
      user = await User.create({
        firebase_uid: decoded.uid,
        phone: decoded.phone_number || undefined,
        email: decoded.email || undefined,
        img_url: decoded.picture || undefined,
        is_active: true,
        profile_complete: false,
      });

      await Notification.create({
        user_id: user._id,
        type: 'system',
        title: 'Welcome to ServiceProvider',
        message: 'Thanks for joining! Complete your profile to start booking services.',
      });
    }

    user.last_login_at = new Date();
    await user.save();

    const token = signToken(user);
    res.json({ success: true, data: { token, user: serialize(user) } });
  } catch (err) {
    if (err.codePrefix && err.codePrefix === 'auth') {
      return next(new ApiError(401, 'Invalid or expired Firebase token', 'UNAUTHORIZED'));
    }
    next(err);
  }
};

const completeProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, email, address } = req.body;

    if (!firstName || !lastName || !email) {
      throw new ApiError(422, 'firstName, lastName and email are required', 'VALIDATION_ERROR');
    }

    const update = {
      first_name: firstName,
      last_name: lastName,
      email,
      profile_complete: true,
    };

    if (address) {
      update.addresses = [{ ...address, is_default: true }];
    }

    const user = await User.findByIdAndUpdate(req.userId, update, { returnDocument: 'after', runValidators: true });
    res.json({ success: true, data: { user: serialize(user) } });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};

module.exports = { verify, completeProfile, logout };
