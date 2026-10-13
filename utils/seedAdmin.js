const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const User = require('../models/User');

const seedAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('[Admin Seeder] Error: MONGODB_URI is not set in .env');
      process.exit(1);
    }

    console.log('[Admin Seeder] Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('[Admin Seeder] Connected to MongoDB.');

    const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@danzason.com';
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Admin@123456';
    const adminName = process.env.INITIAL_ADMIN_NAME || 'Main Admin';
    const adminPhone = process.env.INITIAL_ADMIN_PHONE || '+91 9876543210';

    const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existingAdmin) {
      console.log(`[Admin Seeder] Admin user (${adminEmail}) already exists. Role: ${existingAdmin.role}`);
      process.exit(0);
    }

    const adminUser = await User.create({
      name: adminName,
      email: adminEmail.toLowerCase(),
      phone: adminPhone,
      password: adminPassword,
      role: 'Main Admin',
      isActive: true,
    });

    console.log(`[Admin Seeder] Initial Main Admin created successfully!`);
    console.log(`Email: ${adminUser.email}`);
    console.log(`Role: ${adminUser.role}`);
    console.log(`Password: (as specified or default Admin@123456)`);
    process.exit(0);
  } catch (error) {
    console.error(`[Admin Seeder Error] ${error.message}`);
    process.exit(1);
  }
};

seedAdmin();
