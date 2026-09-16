const request = require('supertest');
const app = require('../app');
const {
  connect,
  closeDatabase,
  clearDatabase,
  createTestUser,
  generateToken,
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

describe('User Endpoints', () => {
  describe('GET /api/v1/users/me', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/v1/users/me');

      expect(res.status).toBe(401);
    });

    it('should return current user profile', async () => {
      const user = await createTestUser({ first_name: 'John', last_name: 'Doe' });
      const token = generateToken(user);

      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.firstName).toBe('John');
      expect(res.body.data.user.lastName).toBe('Doe');
    });
  });

  describe('PATCH /api/v1/users/me', () => {
    it('should update user profile', async () => {
      const user = await createTestUser();
      const token = generateToken(user);

      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'Updated', lastName: 'Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.firstName).toBe('Updated');
      expect(res.body.data.user.lastName).toBe('Name');
    });
  });

  describe('POST /api/v1/users/me/addresses', () => {
    it('should add address', async () => {
      const user = await createTestUser();
      const token = generateToken(user);

      const res = await request(app)
        .post('/api/v1/users/me/addresses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          line1: '123 Main St',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          label: 'home',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.user.addresses.length).toBe(1);
      expect(res.body.data.user.addresses[0].line1).toBe('123 Main St');
    });
  });

  describe('Admin Endpoints', () => {
    it('GET /api/v1/admin/stats should return 401 for non-admin', async () => {
      const user = await createTestUser({ role: 'customer' });
      const token = generateToken(user);

      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('GET /api/v1/admin/stats should return stats for admin', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin);

      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalUsers');
      expect(res.body.data).toHaveProperty('totalServices');
    });

    it('GET /api/v1/admin/users should return user list for admin', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin);
      await createTestUser({ role: 'customer' });

      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/v2/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return consistent error shape', async () => {
      const res = await request(app).get('/api/v2/nonexistent');

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('code');
    });
  });
});
