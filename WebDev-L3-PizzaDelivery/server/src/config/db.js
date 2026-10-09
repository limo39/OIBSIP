const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

let memoryServer;

async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  mongoose.set('strictQuery', true);

  let uri = process.env.MONGODB_URI && process.env.MONGODB_URI.trim();

  if (!uri) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const dbPath = path.join(__dirname, '../../data/db');
    fs.mkdirSync(dbPath, { recursive: true });
    try {
      memoryServer = await MongoMemoryServer.create({
        instance: {
          dbName: 'forno',
          dbPath,
          storageEngine: 'wiredTiger',
        },
      });
      console.log(`Embedded MongoDB storing data in ${dbPath}`);
    } catch (err) {
      console.warn(`Persistent embedded MongoDB unavailable (${err.message}). Using an in-memory database.`);
      memoryServer = await MongoMemoryServer.create({ instance: { dbName: 'forno' } });
    }
    uri = memoryServer.getUri();
  }

  await mongoose.connect(uri);
  console.log('MongoDB connected');
  return mongoose.connection;
}

async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

module.exports = { connectDB, disconnectDB };
