const request = require('supertest');
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
const mongoose = require('mongoose');

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
}, 10000);

describe('Admin Endpoints', () => {
  describe('GET /api/v1/admin/users', () => {
    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/v1/admin/users');
      expect(res.status).toBe(401);
    });

    it('should return 403 for non-admin user', async () => {
      const user = await createTestUser({ role: 'customer' });
      const token = generateToken(user);
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('should list users for admin', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin);
      await createTestUser({ role: 'customer', first_name: 'Alice' });
      await createTestUser({ role: 'provider', first_name: 'Bob' });

      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      expect(res.body.pagination).toHaveProperty('total');
    });

    it('should filter users by role', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin);
      await createTestUser({ role: 'customer' });
      await createTestUser({ role: 'customer' });
      await createTestUser({ role: 'provider' });

      const res = await request(app)
        .get('/api/v1/admin/users?role=provider')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const providers = res.body.data.filter((u) => u.role === 'provider');
      expect(providers.length).toBeGreaterThanOrEqual(1);
    });

    it('should search users by query', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin);
      await createTestUser({ first_name: 'Searchable', email: 'search@example.com' });

      const res = await request(app)
        .get('/api/v1/admin/users?q=searchable')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PATCH /api/v1/admin/users/:id/active', () => {
    it('should block a user', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin);
      const target = await createTestUser({ role: 'customer' });

      const res = await request(app)
        .patch(`/api/v1/admin/users/${target._id}/active`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when blocking self', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin);

      const res = await request(app)
        .patch(`/api/v1/admin/users/${admin._id}/active`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_OPERATION');
    });

    it('should return 400 when blocking admin', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin);
      const otherAdmin = await createTestUser({ role: 'admin' });

      const res = await request(app)
        .patch(`/api/v1/admin/users/${otherAdmin._id}/active`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent user', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin);
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .patch(`/api/v1/admin/users/${fakeId}/active`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/admin/bookings', () => {
    it('should list all bookings for admin', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin);

      const res = await request(app)
        .get('/api/v1/admin/bookings')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pagination).toHaveProperty('total');
    });

    it('should filter bookings by status', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin);

      const res = await request(app)
        .get('/api/v1/admin/bookings?status=pending')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/v1/admin/stats', () => {
    it('should return dashboard stats', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin);
      const cat = await createTestCategory();
      await createTestService(cat._id);

      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalUsers');
      expect(res.body.data).toHaveProperty('activeUsers');
      expect(res.body.data).toHaveProperty('totalServices');
      expect(res.body.data).toHaveProperty('bookingsByStatus');
      expect(res.body.data).toHaveProperty('totalRevenue');
      expect(res.body.data).toHaveProperty('openComplaints');
      expect(res.body.data).toHaveProperty('openQueries');
      expect(res.body.data.totalUsers).toBeGreaterThanOrEqual(1);
      expect(res.body.data.totalServices).toBe(1);
    });
  });
});
