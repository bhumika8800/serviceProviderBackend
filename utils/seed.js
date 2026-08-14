require('dotenv').config();
const connectDB = require('../config/db');
const Category = require('../models/Category');
const Service = require('../models/Service');

const categorySeed = [
  { name: 'Home Cleaning' },
  { name: 'Plumbing' },
  { name: 'Electrical' },
  { name: 'Beauty & Wellness' },
  { name: 'Appliance Repair' },
  { name: 'Painting' },
];

const serviceSeed = [
  { category: 'Home Cleaning', name: 'Basic Home Cleaning', description: 'Professional cleaning for your entire home including dusting, mopping, and bathroom cleaning', price: 499, duration_mins: 120, images: ['https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop'], tags: ['cleaning', 'home', 'basic'] },
  { category: 'Home Cleaning', name: 'Deep Cleaning', description: 'Thorough deep cleaning with specialized equipment for every corner of your home', price: 1499, duration_mins: 240, images: ['https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop'], tags: ['cleaning', 'deep', 'home'] },
  { category: 'Home Cleaning', name: 'Kitchen Deep Cleaning', description: 'Complete kitchen cleaning including chimney, cabinets, and countertop scrubbing', price: 999, duration_mins: 180, images: ['https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop'], tags: ['cleaning', 'kitchen', 'deep'] },
  { category: 'Plumbing', name: 'Tap & Mixer Repair', description: 'Fix leaking or broken taps, mixers, and faucets in your kitchen and bathrooms', price: 349, duration_mins: 60, images: ['https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400&h=300&fit=crop'], tags: ['plumbing', 'tap', 'repair'] },
  { category: 'Plumbing', name: 'Drain Cleaning', description: 'Clear clogged drains in kitchen sinks, bathroom drains, and floor drains', price: 449, duration_mins: 90, images: ['https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400&h=300&fit=crop'], tags: ['plumbing', 'drain', 'cleaning'] },
  { category: 'Plumbing', name: 'Water Heater Installation', description: 'Expert installation of geysers and water heaters with complete setup and testing', price: 799, duration_mins: 120, images: ['https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400&h=300&fit=crop'], tags: ['plumbing', 'heater', 'installation'] },
  { category: 'Electrical', name: 'Switch & Socket Repair', description: 'Replace or repair damaged switches, sockets, and electrical points', price: 299, duration_mins: 45, images: ['https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=300&fit=crop'], tags: ['electrical', 'switch', 'repair'] },
  { category: 'Electrical', name: 'Fan Installation & Repair', description: 'Install new ceiling fans or repair existing ones with balancing and speed control', price: 399, duration_mins: 60, images: ['https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=300&fit=crop'], tags: ['electrical', 'fan', 'installation'] },
  { category: 'Electrical', name: 'Wiring & Circuit Work', description: 'Complete electrical wiring for new rooms, circuit breaker installation, and troubleshooting', price: 999, duration_mins: 180, images: ['https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=300&fit=crop'], tags: ['electrical', 'wiring', 'circuit'] },
  { category: 'Beauty & Wellness', name: 'Facial & Cleanup', description: 'Rejuvenating facial treatment with cleansing, exfoliation, and mask application', price: 599, duration_mins: 60, images: ['https://images.unsplash.com/photo-1567721913486-6585f069b332?w=400&h=300&fit=crop'], tags: ['beauty', 'facial', 'skincare'] },
  { category: 'Beauty & Wellness', name: 'Haircut & Styling', description: 'Professional haircut and styling for men and women at your doorstep', price: 399, duration_mins: 45, images: ['https://images.unsplash.com/photo-1567721913486-6585f069b332?w=400&h=300&fit=crop'], tags: ['beauty', 'haircut', 'styling'] },
  { category: 'Beauty & Wellness', name: 'Manicure & Pedicure', description: 'Complete nail care with cuticle treatment, shaping, and polish application', price: 499, duration_mins: 75, images: ['https://images.unsplash.com/photo-1567721913486-6585f069b332?w=400&h=300&fit=crop'], tags: ['beauty', 'manicure', 'pedicure'] },
  { category: 'Appliance Repair', name: 'AC Service & Repair', description: 'Air conditioner maintenance, gas refill, and repair for all major brands', price: 599, duration_mins: 120, images: ['https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=400&h=300&fit=crop'], tags: ['appliance', 'ac', 'repair'] },
  { category: 'Appliance Repair', name: 'Washing Machine Repair', description: 'Fix washing machine issues including drum problems, drainage, and electrical faults', price: 499, duration_mins: 90, images: ['https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=400&h=300&fit=crop'], tags: ['appliance', 'washing', 'repair'] },
  { category: 'Appliance Repair', name: 'Refrigerator Service', description: 'Refrigerator repair and maintenance including cooling issues and gas charging', price: 699, duration_mins: 120, images: ['https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=400&h=300&fit=crop'], tags: ['appliance', 'refrigerator', 'repair'] },
  { category: 'Painting', name: 'Interior Wall Painting', description: 'Professional interior painting with premium paints and smooth finish', price: 2999, duration_mins: 480, images: ['https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=400&h=300&fit=crop'], tags: ['painting', 'interior', 'walls'] },
  { category: 'Painting', name: 'Exterior Painting', description: 'Weather-resistant exterior painting for lasting protection and curb appeal', price: 4999, duration_mins: 600, images: ['https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=400&h=300&fit=crop'], tags: ['painting', 'exterior', 'weatherproof'] },
  { category: 'Painting', name: 'Texture & Wallpaper', description: 'Decorative wall textures and professional wallpaper installation for accent walls', price: 1999, duration_mins: 360, images: ['https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=400&h=300&fit=crop'], tags: ['painting', 'texture', 'wallpaper'] },
];

const run = async () => {
  const reset = process.argv.includes('--reset');

  if (reset) {
    await Category.deleteMany({});
    await Service.deleteMany({});
    console.log('Cleared existing categories and services');
  }

  const categoryMap = {};
  for (const cat of categorySeed) {
    const doc = await Category.findOneAndUpdate(
      { name: cat.name },
      { $setOnInsert: { name: cat.name, parent_id: null, is_active: true } },
      { upsert: true, returnDocument: 'after' }
    );
    categoryMap[cat.name] = doc._id;
    console.log(`Category: ${cat.name} upserted`);
  }

  let created = 0;
  for (const svc of serviceSeed) {
    await Service.findOneAndUpdate(
      { name: svc.name },
      {
        $setOnInsert: {
          category_id: categoryMap[svc.category],
          name: svc.name,
          description: svc.description,
          price: svc.price,
          duration_mins: svc.duration_mins,
          images: svc.images,
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

  console.log(`Seeded ${categorySeed.length} categories and ${created} services`);
  process.exit(0);
};

connectDB()
  .then(run)
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });