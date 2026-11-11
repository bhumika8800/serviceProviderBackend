const request = require('supertest');

jest.mock('../config/firebase', () => {
  const mockVerifyIdToken = jest.fn().mockImplementation(async (token) => {
    if (token === 'invalid_token' || token === 'expired_token') {
      const err = new Error('Invalid token');
      err.codePrefix = 'auth';
      err.code = 'auth/id-token-expired';
      throw err;
    }
    if (token === 'google_token') {
      return {
        uid: 'mock_google_uid',
        email: 'google@example.com',
        picture: 'https://example.com/avatar.jpg',
      };
    }
    return { uid: 'mock_firebase_uid', phone_number: '+1234567890' };
  });

  return {
    getAdmin: () => ({
      auth: () => ({
        verifyIdToken: mockVerifyIdToken,
      }),
    }),
    hasFirebaseConfig: () => true,
    __mocks: { verifyIdToken: mockVerifyIdToken },
  };
});

const app = require('../app');
const { connect, closeDatabase, clearDatabase, createTestUser, generateToken } = require('./setup');

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

describe('Auth Endpoints', () => {
  describe('POST /api/v1/auth/verify', () => {
    it('should return 422 when idToken is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify')
        .send({});

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 when idToken is invalid', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify')
        .send({ idToken: 'invalid_token' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('should return JWT and user on valid token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify')
        .send({ idToken: 'valid_token' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data.user.firebaseUid).toBe('mock_firebase_uid');
    });

    it('should allow Google accounts without a phone number', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify')
        .send({ idToken: 'google_token' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.firebaseUid).toBe('mock_google_uid');
      expect(res.body.data.user.email).toBe('google@example.com');
      expect(res.body.data.user.phone).toBeUndefined();
    });

    it('should link a pre-provisioned admin by email', async () => {
      const User = require('../models/User');
      await User.create({
        email: 'google@example.com',
        role: 'admin',
        is_active: true,
        profile_complete: true,
      });

      const res = await request(app)
        .post('/api/v1/auth/verify')
        .send({ idToken: 'google_token' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('admin');
      expect(res.body.data.user.firebaseUid).toBe('mock_google_uid');
    });
  });

  describe('POST /api/v1/auth/complete-profile', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .post('/api/v1/auth/complete-profile')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 422 when required fields are missing', async () => {
      const user = await createTestUser();
      const token = generateToken(user);

      const res = await request(app)
        .post('/api/v1/auth/complete-profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'John' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should complete profile successfully', async () => {
      const user = await createTestUser({ profile_complete: false });
      const token = generateToken(user);

      const res = await request(app)
        .post('/api/v1/auth/complete-profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          address: {
            line1: '123 Main St',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.firstName).toBe('John');
      expect(res.body.data.user.profileComplete).toBe(true);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout');

      expect(res.status).toBe(401);
    });

    it('should logout successfully', async () => {
      const user = await createTestUser();
      const token = generateToken(user);

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
