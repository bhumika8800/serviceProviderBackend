const request = require('supertest');
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
const Complaint = require('../models/Complaint');

jest.mock('../utils/notification', () => ({
  createNotification: jest.fn().mockResolvedValue({}),
}));

const createTestBooking = async (userId, service, status = 'completed') => {
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
  await connect();
});

afterAll(async () => {
  await closeDatabase();
});

beforeEach(async () => {
  await clearDatabase();
});

describe('Complaint Endpoints', () => {
  describe('POST /api/v1/complaints', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .post('/api/v1/complaints')
        .send({ bookingId: '507f1f77bcf86cd799439011', title: 'Test', description: 'Test' });
      expect(res.status).toBe(401);
    });

    it('should return 422 when required fields are missing', async () => {
      const user = await createTestUser();
      const token = generateToken(user);

      const res = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(422);
    });

    it('should file a complaint for completed booking', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      const cat = await createTestCategory();
      const service = await createTestService(cat._id);
      const booking = await createTestBooking(user._id, service, 'completed');

      const res = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bookingId: booking._id.toString(),
          title: 'Service was poor',
          description: 'The technician was late and did a bad job',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Service was poor');
      expect(res.body.data.status).toBe('open');
    });

    it('should return 409 for non-completed booking', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      const cat = await createTestCategory();
      const service = await createTestService(cat._id);
      const booking = await createTestBooking(user._id, service, 'pending');

      const res = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bookingId: booking._id.toString(),
          title: 'Issue',
          description: 'Something went wrong',
        });

      expect(res.status).toBe(409);
    });

    it('should return 404 for non-existent booking', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bookingId: fakeId.toString(),
          title: 'Issue',
          description: 'Something went wrong',
        });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/complaints', () => {
    it('should list user complaints', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      const cat = await createTestCategory();
      const service = await createTestService(cat._id);
      const booking = await createTestBooking(user._id, service, 'completed');

      await Complaint.create({
        booking_id: booking._id,
        user_id: user._id,
        title: 'Complaint 1',
        description: 'Description 1',
        status: 'open',
      });

      const res = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });

    it('should filter by status', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      const cat = await createTestCategory();
      const service = await createTestService(cat._id);
      const booking = await createTestBooking(user._id, service, 'completed');

      await Complaint.create({
        booking_id: booking._id,
        user_id: user._id,
        title: 'Open Complaint',
        description: 'Desc',
        status: 'open',
      });
      await Complaint.create({
        booking_id: booking._id,
        user_id: user._id,
        title: 'Resolved Complaint',
        description: 'Desc',
        status: 'resolved',
      });

      const res = await request(app)
        .get('/api/v1/complaints?status=open')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('Open Complaint');
    });
  });

  describe('GET /api/v1/complaints/:id', () => {
    it('should get complaint detail for owner', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      const cat = await createTestCategory();
      const service = await createTestService(cat._id);
      const booking = await createTestBooking(user._id, service, 'completed');

      const complaint = await Complaint.create({
        booking_id: booking._id,
        user_id: user._id,
        title: 'Detail Test',
        description: 'Desc',
        status: 'open',
      });

      const res = await request(app)
        .get(`/api/v1/complaints/${complaint._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Detail Test');
    });

    it('should get complaint detail for admin', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const user = await createTestUser();
      const cat = await createTestCategory();
      const service = await createTestService(cat._id);
      const booking = await createTestBooking(user._id, service, 'completed');

      const complaint = await Complaint.create({
        booking_id: booking._id,
        user_id: user._id,
        title: 'Admin View',
        description: 'Desc',
        status: 'open',
      });

      const token = generateToken(admin);
      const res = await request(app)
        .get(`/api/v1/complaints/${complaint._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should return 403 for non-owner non-admin', async () => {
      const other = await createTestUser();
      const user = await createTestUser();
      const cat = await createTestCategory();
      const service = await createTestService(cat._id);
      const booking = await createTestBooking(user._id, service, 'completed');

      const complaint = await Complaint.create({
        booking_id: booking._id,
        user_id: user._id,
        title: 'Not yours',
        description: 'Desc',
        status: 'open',
      });

      const token = generateToken(other);
      const res = await request(app)
        .get(`/api/v1/complaints/${complaint._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/complaints/:id/status', () => {
    it('should update complaint status as admin', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const user = await createTestUser();
      const cat = await createTestCategory();
      const service = await createTestService(cat._id);
      const booking = await createTestBooking(user._id, service, 'completed');

      const complaint = await Complaint.create({
        booking_id: booking._id,
        user_id: user._id,
        title: 'Update Test',
        description: 'Desc',
        status: 'open',
      });

      const token = generateToken(admin);
      const res = await request(app)
        .patch(`/api/v1/complaints/${complaint._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'in_progress' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('in_progress');
    });

    it('should set resolved_at when status is resolved', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const user = await createTestUser();
      const cat = await createTestCategory();
      const service = await createTestService(cat._id);
      const booking = await createTestBooking(user._id, service, 'completed');

      const complaint = await Complaint.create({
        booking_id: booking._id,
        user_id: user._id,
        title: 'Resolve Test',
        description: 'Desc',
        status: 'open',
      });

      const token = generateToken(admin);
      const res = await request(app)
        .patch(`/api/v1/complaints/${complaint._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'resolved', resolutionNotes: 'Fixed the issue' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('resolved');
      expect(res.body.data.resolutionNotes).toBe('Fixed the issue');
      expect(res.body.data).toHaveProperty('resolvedAt');
    });

    it('should return 403 for non-admin', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      const cat = await createTestCategory();
      const service = await createTestService(cat._id);
      const booking = await createTestBooking(user._id, service, 'completed');

      const complaint = await Complaint.create({
        booking_id: booking._id,
        user_id: user._id,
        title: 'Test',
        description: 'Desc',
        status: 'open',
      });

      const res = await request(app)
        .patch(`/api/v1/complaints/${complaint._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'in_progress' });

      expect(res.status).toBe(403);
    });
  });
});
