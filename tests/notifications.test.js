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
const Notification = require('../models/Notification');

const createTestNotification = async (userId, overrides = {}) => {
  return Notification.create({
    user_id: userId,
    type: 'system',
    title: 'Test Notification',
    message: 'This is a test notification',
    is_read: false,
    ...overrides,
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

describe('Notification Endpoints', () => {
  describe('GET /api/v1/notifications', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/v1/notifications');
      expect(res.status).toBe(401);
    });

    it('should list notifications for user', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      await createTestNotification(user._id, { title: 'First' });
      await createTestNotification(user._id, { title: 'Second', is_read: true });

      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notifications.length).toBe(2);
      expect(res.body.data).toHaveProperty('unreadCount');
      expect(res.body.data.unreadCount).toBe(1);
    });

    it('should only return own notifications', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const token = generateToken(user1);
      await createTestNotification(user1._id, { title: 'Mine' });
      await createTestNotification(user2._id, { title: 'Theirs' });

      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.notifications.length).toBe(1);
      expect(res.body.data.notifications[0].title).toBe('Mine');
    });

    it('should sort unread first', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      await createTestNotification(user._id, { title: 'Read', is_read: true });
      await createTestNotification(user._id, { title: 'Unread', is_read: false });

      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.notifications[0].title).toBe('Unread');
    });

    it('should paginate', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      for (let i = 0; i < 5; i++) {
        await createTestNotification(user._id, { title: `Notif ${i}` });
      }

      const res = await request(app)
        .get('/api/v1/notifications?page=1&limit=2')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.notifications.length).toBe(2);
      expect(res.body.pagination.total).toBe(5);
      expect(res.body.pagination.totalPages).toBe(3);
    });
  });

  describe('PATCH /api/v1/notifications/:id/read', () => {
    it('should mark a notification as read', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      const notif = await createTestNotification(user._id);

      const res = await request(app)
        .patch(`/api/v1/notifications/${notif._id}/read`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isRead).toBe(true);
    });

    it('should return 404 for non-existent notification', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .patch(`/api/v1/notifications/${fakeId}/read`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should not mark another user\'s notification', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const token = generateToken(user1);
      const notif = await createTestNotification(user2._id);

      const res = await request(app)
        .patch(`/api/v1/notifications/${notif._id}/read`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      const user = await createTestUser();
      const token = generateToken(user);
      await createTestNotification(user._id, { title: 'One' });
      await createTestNotification(user._id, { title: 'Two' });

      const res = await request(app)
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const list = await Notification.find({ user_id: user._id });
      expect(list.every((n) => n.is_read === true)).toBe(true);
    });
  });
});
