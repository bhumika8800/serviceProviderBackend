const { getAdmin } = require('../config/firebase');
const User = require('../models/User');

const sendPush = async (userId, { title, body, data = {} }) => {
  try {
    const user = await User.findById(userId).select('fcm_token');
    if (!user || !user.fcm_token) return;

    const admin = getAdmin();
    await admin.messaging().send({
      token: user.fcm_token,
      notification: { title, body },
      data,
    });
  } catch (err) {
    console.warn('FCM push failed:', err.message);
  }
};

module.exports = { sendPush };