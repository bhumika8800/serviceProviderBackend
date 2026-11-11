require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');

const email = (process.argv[2] || '').trim().toLowerCase();

if (!email) {
  console.error('Usage: npm run make-admin -- admin@example.com');
  process.exit(1);
}

const run = async () => {
  const user = await User.findOne({ email });

  if (!user) {
    await User.create({
      email,
      role: 'admin',
      is_active: true,
      profile_complete: true,
    });
    console.log(`Created admin account for ${email}`);
  } else {
    user.role = 'admin';
    user.is_active = true;
    await user.save();
    console.log(`Promoted ${email} to admin`);
  }

  process.exit(0);
};

connectDB()
  .then(run)
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
