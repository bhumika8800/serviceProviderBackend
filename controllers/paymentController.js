const crypto = require('crypto');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const ApiError = require('../utils/ApiError');
const { serialize, serializeList } = require('../utils/serialize');
const { getRazorpay } = require('../config/razorpay');
const { createNotification } = require('../utils/notification');

const modeFromMethod = (method) => {
  const map = {
    card: 'card',
    emi: 'card',
    upi: 'upi',
    netbanking: 'netbanking',
    wallet: 'wallet',
  };
  return map[method] || 'wallet';
};

const getBookingForPayment = async (bookingId, userId, role) => {
  const booking = await Booking.findOne({ _id: bookingId, is_active: true });
  if (!booking) throw new ApiError(404, 'Booking not found', 'NOT_FOUND');

  const isOwner = booking.user_id.toString() === userId;
  const isStaff = ['admin', 'provider'].includes(role);
  if (!isOwner && !isStaff) {
    throw new ApiError(403, 'You do not have permission to access this booking', 'FORBIDDEN');
  }
  return booking;
};

const createOrder = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    const booking = await getBookingForPayment(bookingId, req.userId, req.user.role);

    if (booking.status !== 'pending') {
      throw new ApiError(409, `Payment can only be initiated for pending bookings (current: ${booking.status})`, 'INVALID_STATUS');
    }

    const amountPaise = Math.round(parseFloat(booking.total_amount.toString()) * 100);

    let payment = await Payment.findOne({ booking_id: booking._id, status: 'pending' });
    if (payment) {
      return res.json({
        success: true,
        data: {
          orderId: payment.razorpay_order_id,
          amount: parseFloat(payment.amount.toString()) * 100,
          currency: 'INR',
          keyId: process.env.RAZORPAY_KEY_ID,
          paymentId: payment._id.toString(),
        },
      });
    }

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `booking_${booking._id.toString()}`,
      notes: { booking_id: booking._id.toString() },
    });

    payment = await Payment.create({
      booking_id: booking._id,
      razorpay_order_id: order.id,
      amount: booking.total_amount,
      status: 'pending',
    });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: amountPaise,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
        paymentId: payment._id.toString(),
      },
    });
  } catch (err) {
    next(err);
  }
};

const verifySignature = (orderId, paymentId, signature) => {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature || '', 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const verifyPayment = async (req, res, next) => {
  try {
    const { orderId, paymentId, signature, bookingId } = req.body;

    const payment = await Payment.findOne({ razorpay_order_id: orderId });
    if (!payment) throw new ApiError(404, 'Payment not found', 'NOT_FOUND');

    if (!verifySignature(orderId, paymentId, signature)) {
      throw new ApiError(400, 'Razorpay signature mismatch', 'SIGNATURE_MISMATCH');
    }

    const booking = await Booking.findById(payment.booking_id);
    if (!booking) throw new ApiError(404, 'Booking not found', 'NOT_FOUND');

    payment.razorpay_payment_id = paymentId;
    payment.transaction_id = paymentId;
    payment.status = 'successful';
    payment.payment_date = new Date();
    await payment.save();

    booking.status = 'confirmed';
    await booking.save();

    await createNotification({
      userId: booking.user_id,
      type: 'booking',
      title: 'Booking confirmed',
      message: `Payment successful. Your booking for ${booking.service_snapshot.name} is confirmed.`,
      referenceId: booking._id,
    });

    res.json({ success: true, data: { payment: serialize(payment), booking: serialize(booking) } });
  } catch (err) {
    next(err);
  }
};

const verifyWebhookSignature = (payload, signature) => {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature || '', 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const handlePaymentCaptured = async (entity) => {
  const payment = await Payment.findOne({ razorpay_order_id: entity.order_id });
  if (!payment || payment.status === 'successful') return;

  payment.razorpay_payment_id = entity.id;
  payment.transaction_id = entity.id;
  payment.payment_mode = modeFromMethod(entity.method);
  payment.status = 'successful';
  payment.payment_date = new Date();
  await payment.save();

  const booking = await Booking.findById(payment.booking_id);
  if (booking && booking.status === 'pending') {
    booking.status = 'confirmed';
    await booking.save();
  }

  if (booking) {
    await createNotification({
      userId: booking.user_id,
      type: 'booking',
      title: 'Booking confirmed',
      message: `Payment received. Your booking for ${booking.service_snapshot.name} is confirmed.`,
      referenceId: booking._id,
    });
  }
};

const handlePaymentFailed = async (entity) => {
  const payment = await Payment.findOne({ razorpay_order_id: entity.order_id });
  if (!payment || payment.status !== 'pending') return;

  payment.razorpay_payment_id = entity.id;
  payment.status = 'failed';
  payment.error = entity.error_description || entity.description || 'Payment failed';
  await payment.save();

  const booking = await Booking.findById(payment.booking_id);
  if (booking) {
    await createNotification({
      userId: booking.user_id,
      type: 'payment',
      title: 'Payment failed',
      message: `Payment for ${booking.service_snapshot.name} failed. Please try again.`,
      referenceId: booking._id,
    });
  }
};

const handleRefundProcessed = async (entity) => {
  const payment = await Payment.findOne({ razorpay_payment_id: entity.payment_id });
  if (!payment) return;

  payment.status = 'refunded';
  await payment.save();

  const booking = await Booking.findById(payment.booking_id);
  if (booking) {
    await createNotification({
      userId: booking.user_id,
      type: 'payment',
      title: 'Refund processed',
      message: `Your refund for ${booking.service_snapshot.name} has been processed.`,
      referenceId: booking._id,
    });
  }
};

const webhook = async (req, res) => {
  const rawBody = req.rawBody || JSON.stringify(req.body);
  const signature = req.headers['x-razorpay-signature'];

  if (!verifyWebhookSignature(rawBody, signature)) {
    return res.status(400).json({ success: false, message: 'Invalid webhook signature', code: 'SIGNATURE_MISMATCH' });
  }

  const { event, payload } = req.body || {};

  try {
    if (event === 'payment.captured') {
      await handlePaymentCaptured(payload.payment.entity);
    } else if (event === 'payment.failed') {
      await handlePaymentFailed(payload.payment.entity);
    } else if (event === 'refund.processed') {
      await handleRefundProcessed(payload.refund.entity);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Webhook handling error:', err);
    res.status(500).json({ success: false, message: 'Webhook handling error', code: 'INTERNAL_ERROR' });
  }
};

const getPaymentsByBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const booking = await getBookingForPayment(bookingId, req.userId, req.user.role);

    const payments = await Payment.find({ booking_id: booking._id }).sort({ created_at: -1 });
    res.json({ success: true, data: { payments: serializeList(payments) } });
  } catch (err) {
    next(err);
  }
};

module.exports = { createOrder, verifyPayment, webhook, getPaymentsByBooking };