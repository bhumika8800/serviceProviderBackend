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

describe('Booking Endpoints', () => {
  describe('POST /api/v1/bookings', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .send({ serviceId: 'abc', addressId: 'xyz' });

      expect(res.status).toBe(401);
    });

    it('should return 422 for invalid input', async () => {
      const user = await createTestUser();
      const token = generateToken(user);

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(422);
    });

    it('should create booking successfully', async () => {
      const user = await createTestUser({
        addresses: [{
          line1: '123 Test St',
          city: 'Mumbai',
          state: 'MH',
          pincode: '400001',
          label: 'home',
          is_default: true,
        }],
      });
      const token = generateToken(user);
      const category = await createTestCategory();
      const service = await createTestService(category._id, { price: 500 });
      const addressId = user.addresses[0]._id.toString();

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          serviceId: service._id.toString(),
          addressId,
          bookingDate: new Date(Date.now() + 86400000).toISOString(),
          quantity: 2,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('pending');
    });

    it('should return 404 for non-existent service', async () => {
      const user = await createTestUser({
        addresses: [{
          line1: '123 Test St',
          city: 'Mumbai',
          state: 'MH',
          pincode: '400001',
          label: 'home',
          is_default: true,
        }],
      });
      const token = generateToken(user);
      const fakeId = new mongoose.Types.ObjectId();
      const addressId = user.addresses[0]._id.toString();

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          serviceId: fakeId.toString(),
          addressId,
          bookingDate: new Date(Date.now() + 86400000).toISOString(),
        });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/bookings', () => {
    it('should return empty list for user with no bookings', async () => {
      const user = await createTestUser();
      const token = generateToken(user);

      const res = await request(app)
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('PATCH /api/v1/bookings/:id/cancel', () => {
    it('should cancel a pending booking', async () => {
      const user = await createTestUser({
        addresses: [{
          line1: '123 Test St',
          city: 'Mumbai',
          state: 'MH',
          pincode: '400001',
          label: 'home',
          is_default: true,
        }],
      });
      const token = generateToken(user);
      const category = await createTestCategory();
      const service = await createTestService(category._id);

      const createRes = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          serviceId: service._id.toString(),
          addressId: user.addresses[0]._id.toString(),
          bookingDate: new Date(Date.now() + 86400000).toISOString(),
        });

      const bookingId = createRes.body.data.id;

      const res = await request(app)
        .patch(`/api/v1/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('cancelled');
    });
  });

  describe('PATCH /api/v1/bookings/:id/status', () => {
    it('should return 403 when customer tries to update status', async () => {
      const customer = await createTestUser({ role: 'customer' });
      const token = generateToken(customer);

      const res = await request(app)
        .patch(`/api/v1/bookings/abc/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'confirmed' });

      expect(res.status).toBe(403);
    });

    it('should allow admin to update booking status', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const customer = await createTestUser({
        addresses: [{
          line1: '123 Test St',
          city: 'Mumbai',
          state: 'MH',
          pincode: '400001',
          label: 'home',
          is_default: true,
        }],
      });
      const adminToken = generateToken(admin);
      const customerToken = generateToken(customer);
      const category = await createTestCategory();
      const service = await createTestService(category._id);

      const createRes = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          serviceId: service._id.toString(),
          addressId: customer.addresses[0]._id.toString(),
          bookingDate: new Date(Date.now() + 86400000).toISOString(),
        });

      const bookingId = createRes.body.data.id;

      const res = await request(app)
        .patch(`/api/v1/bookings/${bookingId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'confirmed' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('confirmed');
    });
  });
});
