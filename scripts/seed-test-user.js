/**
 * Seed script: Add a test user to the database
 * Run: node scripts/seed-test-user.js
 * Or with custom credentials: USERNAME=myuser EMAIL=my@email.com PASSWORD=mypass node scripts/seed-test-user.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const AutomationData = require('../models/AutomationData');
const connectDB = require('../config/database');

const TEST_USER = {
    username: process.env.SEED_USERNAME || 'testuser',
    email: process.env.SEED_EMAIL || 'test@example.com',
    password: process.env.SEED_PASSWORD || 'Test123!'
};

const run = async () => {
    try {
        await connectDB();

        const exists = await User.findOne({
            $or: [{ email: TEST_USER.email }, { username: TEST_USER.username }]
        });

        if (exists) {
            console.log('Test user already exists:');
            console.log('  _id:', exists._id.toString());
            console.log('  username:', exists.username);
            console.log('  email:', exists.email);
            process.exit(0);
            return;
        }

        const user = await User.create({
            username: TEST_USER.username,
            email: TEST_USER.email,
            password: TEST_USER.password,
            accountStatus: 'active'
        });

        await AutomationData.create({ userId: user._id });

        console.log('Test user created successfully:');
        console.log('  _id:', user._id.toString());
        console.log('  username:', user.username);
        console.log('  email:', user.email);
        console.log('  accountStatus:', user.accountStatus);
        console.log('');
        console.log('Login with: email =', TEST_USER.email, '| password =', TEST_USER.password);
    } catch (err) {
        console.error('Seed failed:', err.message);
        if (err.code === 11000) {
            console.error('Duplicate key - user with this email or username already exists.');
        }
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

run();
