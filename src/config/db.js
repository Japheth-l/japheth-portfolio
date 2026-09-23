const mongoose = require('mongoose');

let memoryServer = null;

async function connectDB() {
  // Pasting into a hosting dashboard often carries stray whitespace or wrapping quotes.
  let uri = (process.env.MONGODB_URI || '').trim().replace(/^["']|["']$/g, '');

  if (uri && !/^mongodb(\+srv)?:\/\//.test(uri)) {
    throw new Error(
      `MONGODB_URI must start with "mongodb+srv://" or "mongodb://", but starts with "${uri.slice(0, 12)}...". ` +
      'Check the value for a stray prefix, quotes, or a truncated paste.',
    );
  }

  if (!uri) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MONGODB_URI must be set in production.');
    }
    // Dev convenience: spin up an in-memory MongoDB so the app runs with zero setup.
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
    console.log('No MONGODB_URI set — using an in-memory MongoDB for development.');
  }

  await mongoose.connect(uri);
  console.log('MongoDB connected.');
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}

module.exports = { connectDB, disconnectDB };
