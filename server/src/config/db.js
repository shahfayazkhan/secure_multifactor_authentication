const mongoose = require('mongoose');
const env = require('./env');

async function connectDB() {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
  } catch (err) {
    console.error(`[db] Could not connect to MongoDB at ${env.mongoUri}`);
    console.error('[db] Is MongoDB running? Try `brew services start mongodb-community` or `npm run mongo:up` (Docker).');
    throw err;
  }
  console.log(`[db] Connected to MongoDB: ${mongoose.connection.name}`);
  return mongoose.connection;
}

module.exports = connectDB;
