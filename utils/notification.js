const Notification = require('../models/Notification');
const { sendPush } = require('./fcm');

const createNotification = async ({ userId, type, title, message, referenceId }) => {
  const notification = await Notification.create({
    user_id: userId,
    type,
    title,
    message,
    reference_id: referenceId,
  });

  await sendPush(userId, {
    title,
    body: message,
    data: { type, referenceId: referenceId ? referenceId.toString() : '' },
  });

  return notification;
};

module.exports = { createNotification };