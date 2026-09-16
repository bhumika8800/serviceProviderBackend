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

describe('Cart Endpoints', () => {
  describe('GET /api/v1/cart', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/v1/cart');

      expect(res.status).toBe(401);
    });

    it('should return empty cart for new user', async () => {
      const user = await createTestUser();
      const token = generateToken(user);

      const res = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cart).toEqual([]);
    });
  });

  describe('POST /api/v1/cart', () => {
    it('should add item to cart', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      const category = await createTestCategory();
      const service = await createTestService(category._id);

      const res = await request(app)
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({ serviceId: service._id.toString(), quantity: 2 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cart.length).toBe(1);
      expect(res.body.data.cart[0].quantity).toBe(2);
    });

    it('should return 404 for non-existent service', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({ serviceId: fakeId.toString() });

      expect(res.status).toBe(404);
    });

    it('should increment quantity if item already in cart', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      const category = await createTestCategory();
      const service = await createTestService(category._id);

      await request(app)
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({ serviceId: service._id.toString(), quantity: 1 });

      const res = await request(app)
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({ serviceId: service._id.toString(), quantity: 2 });

      expect(res.status).toBe(200);
      expect(res.body.data.cart.length).toBe(1);
      expect(res.body.data.cart[0].quantity).toBe(3);
    });
  });

  describe('PATCH /api/v1/cart/:serviceId', () => {
    it('should update quantity', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      const category = await createTestCategory();
      const service = await createTestService(category._id);

      await request(app)
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({ serviceId: service._id.toString(), quantity: 1 });

      const res = await request(app)
        .patch(`/api/v1/cart/${service._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ quantity: 5 });

      expect(res.status).toBe(200);
      expect(res.body.data.cart[0].quantity).toBe(5);
    });
  });

  describe('DELETE /api/v1/cart/:serviceId', () => {
    it('should remove item from cart', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      const category = await createTestCategory();
      const service = await createTestService(category._id);

      await request(app)
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({ serviceId: service._id.toString() });

      const res = await request(app)
        .delete(`/api/v1/cart/${service._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.cart).toEqual([]);
    });
  });

  describe('DELETE /api/v1/cart', () => {
    it('should clear entire cart', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      const category = await createTestCategory();
      const service1 = await createTestService(category._id);
      const service2 = await createTestService(category._id);

      await request(app)
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({ serviceId: service1._id.toString() });

      await request(app)
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({ serviceId: service2._id.toString() });

      const res = await request(app)
        .delete('/api/v1/cart')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.cart).toEqual([]);
    });
  });
});
