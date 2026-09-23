// Tests run against a throwaway in-memory MongoDB and their own environment,
// never the real .env — so they can never touch the live database.
process.env.NODE_ENV = 'test';
process.env.ADMIN_EMAIL = 'admin@test.local';
process.env.JWT_SECRET = 'test-secret';
delete process.env.RESEND_API_KEY;

const bcrypt = require('bcryptjs');

const ADMIN_PASSWORD = 'correct-horse-battery-staple';
process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync(ADMIN_PASSWORD, 4);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let memoryServer;

async function startDB() {
  memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri());
}

async function stopDB() {
  await mongoose.disconnect();
  await memoryServer.stop();
}

module.exports = { startDB, stopDB, ADMIN_PASSWORD };
