const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Category = require('../models/Category');
const Service = require('../models/Service');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  await Category.deleteMany({});
  await Service.deleteMany({});
});

describe('Seed utility', () => {
  const categorySeed = [
    { name: 'Home Cleaning' },
    { name: 'Plumbing' },
    { name: 'Electrical' },
    { name: 'Beauty & Wellness' },
    { name: 'Appliance Repair' },
    { name: 'Painting' },
  ];

  const serviceSeed = [
    { category: 'Home Cleaning', name: 'Basic Home Cleaning', price: 499, duration_mins: 120, tags: ['cleaning'] },
    { category: 'Home Cleaning', name: 'Deep Cleaning', price: 1499, duration_mins: 240, tags: ['cleaning', 'deep'] },
    { category: 'Plumbing', name: 'Tap Repair', price: 349, duration_mins: 60, tags: ['plumbing'] },
    { category: 'Electrical', name: 'Switch Repair', price: 299, duration_mins: 45, tags: ['electrical'] },
    { category: 'Beauty & Wellness', name: 'Facial', price: 599, duration_mins: 60, tags: ['beauty'] },
    { category: 'Appliance Repair', name: 'AC Service', price: 599, duration_mins: 120, tags: ['appliance'] },
    { category: 'Painting', name: 'Interior Painting', price: 2999, duration_mins: 480, tags: ['painting'] },
  ];

  const seedCategories = async () => {
    const categoryMap = {};
    for (const cat of categorySeed) {
      const doc = await Category.findOneAndUpdate(
        { name: cat.name },
        { $setOnInsert: { name: cat.name, parent_id: null, is_active: true } },
        { upsert: true, returnDocument: 'after' }
      );
      categoryMap[cat.name] = doc._id;
    }
    return categoryMap;
  };

  const seedServices = async (categoryMap) => {
    let created = 0;
    for (const svc of serviceSeed) {
      await Service.findOneAndUpdate(
        { name: svc.name },
        {
          $setOnInsert: {
            category_id: categoryMap[svc.category],
            name: svc.name,
            description: `Description for ${svc.name}`,
            price: svc.price,
            duration_mins: svc.duration_mins,
            images: ['https://example.com/image.jpg'],
            tags: svc.tags,
            avg_rating: 0,
            review_count: 0,
            is_active: true,
          },
        },
        { upsert: true }
      );
      created += 1;
    }
    return created;
  };

  it('should seed categories', async () => {
    const categoryMap = await seedCategories();
    const count = await Category.countDocuments();
    expect(count).toBe(categorySeed.length);
    expect(categoryMap['Home Cleaning']).toBeDefined();
    expect(categoryMap['Painting']).toBeDefined();
  });

  it('should seed services', async () => {
    const categoryMap = await seedCategories();
    const created = await seedServices(categoryMap);
    const count = await Service.countDocuments();
    expect(count).toBe(serviceSeed.length);
    expect(created).toBe(serviceSeed.length);
  });

  it('should be idempotent (upsert)', async () => {
    const categoryMap = await seedCategories();
    await seedServices(categoryMap);

    await seedCategories();
    await seedServices(categoryMap);

    const catCount = await Category.countDocuments();
    const svcCount = await Service.countDocuments();
    expect(catCount).toBe(categorySeed.length);
    expect(svcCount).toBe(serviceSeed.length);
  });

  it('should reset when called twice', async () => {
    const categoryMap = await seedCategories();
    await seedServices(categoryMap);

    await Category.deleteMany({});
    await Service.deleteMany({});

    const newMap = await seedCategories();
    await seedServices(newMap);

    const catCount = await Category.countDocuments();
    const svcCount = await Service.countDocuments();
    expect(catCount).toBe(categorySeed.length);
    expect(svcCount).toBe(serviceSeed.length);
  });

  it('should link services to correct categories', async () => {
    const categoryMap = await seedCategories();
    await seedServices(categoryMap);

    const cleaningCategory = await Category.findOne({ name: 'Home Cleaning' });
    const cleaningServices = await Service.find({ category_id: cleaningCategory._id });
    expect(cleaningServices.length).toBe(2);

    const plumbingCategory = await Category.findOne({ name: 'Plumbing' });
    const plumbingServices = await Service.find({ category_id: plumbingCategory._id });
    expect(plumbingServices.length).toBe(1);
  });
});
