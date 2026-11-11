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

describe('Service Endpoints', () => {
  describe('GET /api/v1/categories', () => {
    it('should return empty array when no categories exist', async () => {
      const res = await request(app).get('/api/v1/categories');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('should return categories', async () => {
      await createTestCategory({ name: 'Cleaning' });
      await createTestCategory({ name: 'Plumbing' });

      const res = await request(app).get('/api/v1/categories');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });
  });

  describe('GET /api/v1/services', () => {
    it('should return empty array when no services exist', async () => {
      const res = await request(app).get('/api/v1/services');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination.total).toBe(0);
    });

    it('should return services with pagination', async () => {
      const category = await createTestCategory();
      await createTestService(category._id, { name: 'Service 1' });
      await createTestService(category._id, { name: 'Service 2' });

      const res = await request(app).get('/api/v1/services');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination.total).toBe(2);
    });

    it('should filter by category', async () => {
      const cat1 = await createTestCategory({ name: 'Cat 1' });
      const cat2 = await createTestCategory({ name: 'Cat 2' });
      await createTestService(cat1._id, { name: 'Service A' });
      await createTestService(cat2._id, { name: 'Service B' });

      const res = await request(app).get(`/api/v1/services?categoryId=${cat1._id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Service A');
    });

    it('should filter by tag', async () => {
      const category = await createTestCategory();
      await createTestService(category._id, { name: 'Service 1', tags: ['cleaning', 'home'] });
      await createTestService(category._id, { name: 'Service 2', tags: ['plumbing'] });

      const res = await request(app).get('/api/v1/services?tag=cleaning');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Service 1');
    });

    it('should search by text', async () => {
      const category = await createTestCategory();
      await createTestService(category._id, { name: 'Home Cleaning' });
      await createTestService(category._id, { name: 'Plumbing Repair' });

      const res = await request(app).get('/api/v1/services?q=cleaning');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/services/:id', () => {
    it('should return 404 for non-existent service', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/v1/services/${fakeId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return service by id', async () => {
      const category = await createTestCategory();
      const service = await createTestService(category._id);

      const res = await request(app).get(`/api/v1/services/${service._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(service.name);
    });
  });

  describe('POST /api/v1/services', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .post('/api/v1/services')
        .send({ name: 'Test Service' });

      expect(res.status).toBe(401);
    });

    it('should return 403 when user is not admin/provider', async () => {
      const user = await createTestUser({ role: 'customer' });
      const token = generateToken(user);

      const res = await request(app)
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Service' });

      expect(res.status).toBe(403);
    });

    it('should create service when user is admin', async () => {
      const user = await createTestUser({ role: 'admin' });
      const token = generateToken(user);
      const category = await createTestCategory();

      const res = await request(app)
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${token}`)
        .send({
          categoryId: category._id.toString(),
          name: 'New Service',
          description: 'A new service',
          price: 599,
          durationMins: 60,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('New Service');
    });
  });

  describe('POST /api/v1/categories', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .send({ name: 'New Category' });

      expect(res.status).toBe(401);
    });

    it('should return 403 when user is not an admin', async () => {
      const user = await createTestUser({ role: 'provider' });
      const token = generateToken(user);

      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Category' });

      expect(res.status).toBe(403);
    });

    it('should create a category when user is admin', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin);

      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Category' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('New Category');
      expect(res.body.data.parentId).toBeNull();
    });

    it('should reject duplicate category names', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin);
      await createTestCategory({ name: 'Duplicate' });

      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Duplicate' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/categories/:id', () => {
    it('should rename a category', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin);
      const category = await createTestCategory({ name: 'Old Name' });

      const res = await request(app)
        .patch(`/api/v1/categories/${category._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('New Name');
    });

    it('should deactivate a category', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin);
      const category = await createTestCategory();

      const res = await request(app)
        .patch(`/api/v1/categories/${category._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });
  });

  describe('Inactive visibility', () => {
    it('should hide inactive categories from public but show them to admins', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin);
      await createTestCategory({ name: 'Active Cat' });
      await createTestCategory({ name: 'Hidden Cat', is_active: false });

      const publicRes = await request(app).get('/api/v1/categories');
      expect(publicRes.body.data.length).toBe(1);

      const adminRes = await request(app)
        .get('/api/v1/categories?includeInactive=true')
        .set('Authorization', `Bearer ${token}`);
      expect(adminRes.body.data.length).toBe(2);
    });

    it('should hide inactive services from public but show them to admins', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin);
      const category = await createTestCategory();
      await createTestService(category._id, { name: 'Visible' });
      await createTestService(category._id, { name: 'Hidden', is_active: false });

      const publicRes = await request(app).get('/api/v1/services');
      expect(publicRes.body.data.length).toBe(1);

      const adminRes = await request(app)
        .get('/api/v1/services?includeInactive=true')
        .set('Authorization', `Bearer ${token}`);
      expect(adminRes.body.data.length).toBe(2);
    });
  });

  describe('DELETE /api/v1/services/:id', () => {
    it('should soft delete service', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin);
      const category = await createTestCategory();
      const service = await createTestService(category._id);

      const res = await request(app)
        .delete(`/api/v1/services/${service._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(false);
    });
  });
});
