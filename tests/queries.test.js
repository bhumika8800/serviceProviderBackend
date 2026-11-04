const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const {
  connect,
  closeDatabase,
  clearDatabase,
  createTestUser,
  generateToken,
} = require('./setup');
const Query = require('../models/Query');

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

describe('Query Endpoints', () => {
  describe('POST /api/v1/queries', () => {
    it('should create a query as guest', async () => {
      const res = await request(app)
        .post('/api/v1/queries')
        .send({
          name: 'Guest User',
          email: 'guest@example.com',
          title: 'Need help',
          message: 'I have a question about services',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Need help');
      expect(res.body.data.status).toBe('open');
      expect(res.body.data.userId).toBeNull();
    });

    it('should create a query as logged-in user', async () => {
      const user = await createTestUser();
      const token = generateToken(user);

      const res = await request(app)
        .post('/api/v1/queries')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Logged In User',
          email: 'user@example.com',
          title: 'Service question',
          message: 'What services do you offer?',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.userId).toBe(user._id.toString());
    });

    it('should return 422 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/queries')
        .send({ name: 'Test' });

      expect(res.status).toBe(422);
    });

    it('should return 422 for invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/queries')
        .send({
          name: 'Test',
          email: 'not-an-email',
          title: 'Title',
          message: 'Message',
        });

      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/v1/queries', () => {
    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/v1/queries');
      expect(res.status).toBe(401);
    });

    it('should return 403 for non-admin', async () => {
      const user = await createTestUser({ role: 'customer' });
      const token = generateToken(user);

      const res = await request(app)
        .get('/api/v1/queries')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should list queries for admin', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin);

      await Query.create({
        name: 'Test Query',
        email: 'test@example.com',
        title: 'Help',
        message: 'Need assistance',
        status: 'open',
      });

      const res = await request(app)
        .get('/api/v1/queries')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
    });

    it('should filter by status', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin);

      await Query.create({
        name: 'Open User',
        email: 'open@example.com',
        title: 'Open Issue',
        message: 'Msg',
        status: 'open',
      });
      await Query.create({
        name: 'Closed User',
        email: 'closed@example.com',
        title: 'Closed Issue',
        message: 'Msg',
        status: 'closed',
      });

      const res = await request(app)
        .get('/api/v1/queries?status=open')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].status).toBe('open');
    });
  });

  describe('PATCH /api/v1/queries/:id/close', () => {
    it('should close a query as admin', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin);

      const query = await Query.create({
        name: 'Close Me',
        email: 'close@example.com',
        title: 'Close',
        message: 'Please close',
        status: 'open',
      });

      const res = await request(app)
        .patch(`/api/v1/queries/${query._id}/close`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('closed');
    });

    it('should return 404 for non-existent query', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin);
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .patch(`/api/v1/queries/${fakeId}/close`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should return 403 for non-admin', async () => {
      const user = await createTestUser({ role: 'customer' });
      const token = generateToken(user);

      const query = await Query.create({
        name: 'Test',
        email: 'test@example.com',
        title: 'Title',
        message: 'Msg',
        status: 'open',
      });

      const res = await request(app)
        .patch(`/api/v1/queries/${query._id}/close`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });
});
