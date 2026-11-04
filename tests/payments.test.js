const request = require('supertest');
const crypto = require('crypto');
const mongoose = require('mongoose');
const app = require('../app');
const {
  connect,
  closeDatabase,
  clearDatabase,
  createTestUser,
  generateToken,
  createTestCategory,
  createTestService,
} = require('./setup');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

jest.mock('../utils/notification', () => ({
  createNotification: jest.fn().mockResolvedValue({}),
}));

jest.mock('../config/razorpay', () => ({
  getRazorpay: jest.fn().mockReturnValue({
    orders: {
      create: jest.fn().mockResolvedValue({
        id: 'order_test123',
        amount: 99900,
        currency: 'INR',
      }),
    },
  }),
  hasRazorpayConfig: jest.fn().mockReturnValue(true),
}));

const createTestBooking = async (userId, service, status = 'pending') => {
  return Booking.create({
    user_id: userId,
    service_snapshot: {
      service_id: service._id,
      name: service.name,
      price: service.price,
    },
    address_snapshot: {
      line1: '123 Test St',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
    },
    booking_date: new Date(),
    total_amount: service.price,
    status,
    is_active: true,
  });
};

beforeAll(async () => {
  process.env.JWT_SECRET = 'test_secret';
  process.env.JWT_EXPIRY = '7d';
  process.env.RAZORPAY_KEY_ID = 'test_key';
  process.env.RAZORPAY_KEY_SECRET = 'test_secret_key';
  process.env.RAZORPAY_WEBHOOK_SECRET = 'webhook_secret';
  await connect();
});

afterAll(async () => {
  await closeDatabase();
});

beforeEach(async () => {
  await clearDatabase();
});

describe('Payment Endpoints', () => {
  describe('POST /api/v1/payments/create-order', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .post('/api/v1/payments/create-order')
        .send({ bookingId: '507f1f77bcf86cd799439011' });
      expect(res.status).toBe(401);
    });

    it('should return 422 for invalid booking id', async () => {
      const user = await createTestUser();
      const token = generateToken(user);

      const res = await request(app)
        .post('/api/v1/payments/create-order')
        .set('Authorization', `Bearer ${token}`)
        .send({ bookingId: 'invalid' });

      expect(res.status).toBe(422);
    });

    it('should create a Razorpay order for pending booking', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      const cat = await createTestCategory();
      const service = await createTestService(cat._id);
      const booking = await createTestBooking(user._id, service, 'pending');

      const res = await request(app)
        .post('/api/v1/payments/create-order')
        .set('Authorization', `Bearer ${token}`)
        .send({ bookingId: booking._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('orderId');
      expect(res.body.data).toHaveProperty('currency', 'INR');
      expect(res.body.data).toHaveProperty('keyId');
    });

    it('should return existing pending order if one exists', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      const cat = await createTestCategory();
      const service = await createTestService(cat._id);
      const booking = await createTestBooking(user._id, service, 'pending');

      await Payment.create({
        booking_id: booking._id,
        razorpay_order_id: 'existing_order',
        amount: booking.total_amount,
        status: 'pending',
      });

      const res = await request(app)
        .post('/api/v1/payments/create-order')
        .set('Authorization', `Bearer ${token}`)
        .send({ bookingId: booking._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.data.orderId).toBe('existing_order');
    });

    it('should return 409 for non-pending booking', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      const cat = await createTestCategory();
      const service = await createTestService(cat._id);
      const booking = await createTestBooking(user._id, service, 'confirmed');

      const res = await request(app)
        .post('/api/v1/payments/create-order')
        .set('Authorization', `Bearer ${token}`)
        .send({ bookingId: booking._id.toString() });

      expect(res.status).toBe(409);
    });

    it('should return 404 for non-existent booking', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post('/api/v1/payments/create-order')
        .set('Authorization', `Bearer ${token}`)
        .send({ bookingId: fakeId.toString() });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/payments/verify', () => {
    it('should verify a valid payment signature', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      const cat = await createTestCategory();
      const service = await createTestService(cat._id);
      const booking = await createTestBooking(user._id, service, 'pending');

      const payment = await Payment.create({
        booking_id: booking._id,
        razorpay_order_id: 'order_verify_test',
        amount: booking.total_amount,
        status: 'pending',
      });

      const orderId = 'order_verify_test';
      const paymentId = 'pay_verify_test';
      const expectedSignature = crypto
        .createHmac('sha256', 'test_secret_key')
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const res = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({
          orderId,
          paymentId,
          signature: expectedSignature,
          bookingId: booking._id.toString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updatedBooking = await Booking.findById(booking._id);
      expect(updatedBooking.status).toBe('confirmed');

      const updatedPayment = await Payment.findById(payment._id);
      expect(updatedPayment.status).toBe('successful');
    });

    it('should return 400 for invalid signature', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      const cat = await createTestCategory();
      const service = await createTestService(cat._id);
      const booking = await createTestBooking(user._id, service, 'pending');

      await Payment.create({
        booking_id: booking._id,
        razorpay_order_id: 'order_bad_sig',
        amount: booking.total_amount,
        status: 'pending',
      });

      const res = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({
          orderId: 'order_bad_sig',
          paymentId: 'pay_test',
          signature: 'invalid_signature',
          bookingId: booking._id.toString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('SIGNATURE_MISMATCH');
    });

    it('should return 404 for non-existent payment', async () => {
      const user = await createTestUser();
      const token = generateToken(user);

      const res = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({
          orderId: 'non_existent_order',
          paymentId: 'pay_test',
          signature: 'sig',
          bookingId: '507f1f77bcf86cd799439011',
        });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/payments/webhook', () => {
    it('should handle payment.captured event', async () => {
      const user = await createTestUser();
      const cat = await createTestCategory();
      const service = await createTestService(cat._id);
      const booking = await createTestBooking(user._id, service, 'pending');

      const payment = await Payment.create({
        booking_id: booking._id,
        razorpay_order_id: 'order_webhook_test',
        amount: booking.total_amount,
        status: 'pending',
      });

      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_captured',
              order_id: 'order_webhook_test',
              method: 'upi',
            },
          },
        },
      };

      const rawBody = JSON.stringify(payload);
      const expectedSignature = crypto
        .createHmac('sha256', 'webhook_secret')
        .update(rawBody)
        .digest('hex');

      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-razorpay-signature', expectedSignature)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updatedBooking = await Booking.findById(booking._id);
      expect(updatedBooking.status).toBe('confirmed');
    });

    it('should handle payment.failed event', async () => {
      const user = await createTestUser();
      const cat = await createTestCategory();
      const service = await createTestService(cat._id);
      const booking = await createTestBooking(user._id, service, 'pending');

      await Payment.create({
        booking_id: booking._id,
        razorpay_order_id: 'order_failed',
        amount: booking.total_amount,
        status: 'pending',
      });

      const payload = {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_failed',
              order_id: 'order_failed',
              error_description: 'Insufficient funds',
            },
          },
        },
      };

      const rawBody = JSON.stringify(payload);
      const expectedSignature = crypto
        .createHmac('sha256', 'webhook_secret')
        .update(rawBody)
        .digest('hex');

      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-razorpay-signature', expectedSignature)
        .send(payload);

      expect(res.status).toBe(200);

      const updatedPayment = await Payment.findOne({ razorpay_order_id: 'order_failed' });
      expect(updatedPayment.status).toBe('failed');
      expect(updatedPayment.error).toBe('Insufficient funds');
    });

    it('should return 400 for invalid webhook signature', async () => {
      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-razorpay-signature', 'invalid_sig')
        .send({ event: 'payment.captured', payload: {} });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('SIGNATURE_MISMATCH');
    });
  });

  describe('GET /api/v1/payments/:bookingId', () => {
    it('should list payments for a booking', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      const cat = await createTestCategory();
      const service = await createTestService(cat._id);
      const booking = await createTestBooking(user._id, service, 'confirmed');

      await Payment.create({
        booking_id: booking._id,
        razorpay_order_id: 'order_list',
        amount: booking.total_amount,
        status: 'successful',
      });

      const res = await request(app)
        .get(`/api/v1/payments/${booking._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.payments.length).toBe(1);
    });

    it('should return 404 for non-existent booking', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/api/v1/payments/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
});
