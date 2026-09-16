const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

let mongoServer;

const connect = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
};

const closeDatabase = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) await mongoServer.stop();
};

const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

const createTestUser = async (overrides = {}) => {
  const User = mongoose.model('User');
  const user = await User.create({
    firebase_uid: overrides.firebase_uid || `test_${Date.now()}`,
    phone: overrides.phone || '+1234567890',
    first_name: overrides.first_name || 'Test',
    last_name: overrides.last_name || 'User',
    email: overrides.email || `test_${Date.now()}@example.com`,
    role: overrides.role || 'customer',
    is_active: true,
    profile_complete: true,
    ...overrides,
  });
  return user;
};

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET || 'test_secret',
    { expiresIn: '7d' }
  );
};

const createTestCategory = async (overrides = {}) => {
  const Category = mongoose.model('Category');
  return Category.create({
    name: `Test Category ${Date.now()}`,
    parent_id: null,
    is_active: true,
    ...overrides,
  });
};

const createTestService = async (categoryId, overrides = {}) => {
  const Service = mongoose.model('Service');
  return Service.create({
    category_id: categoryId,
    name: `Test Service ${Date.now()}`,
    description: 'A test service description',
    price: 999,
    duration_mins: 60,
    images: ['https://example.com/image.jpg'],
    tags: ['test', 'service'],
    avg_rating: 0,
    review_count: 0,
    is_active: true,
    ...overrides,
  });
};

module.exports = {
  connect,
  closeDatabase,
  clearDatabase,
  createTestUser,
  generateToken,
  createTestCategory,
  createTestService,
};
