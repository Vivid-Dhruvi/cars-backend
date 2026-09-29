const mongoose = require('mongoose');

let isConnected = false;
let connectionPromise = null;

async function connectToDatabase() {
  if (isConnected || mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/carsinsure';

  if (process.env.VERCEL && (uri.includes('127.0.0.1') || uri.includes('localhost'))) {
    throw new Error(
      'Local MongoDB (127.0.0.1) cannot be reached from Vercel in the cloud. Please add your cloud MongoDB Atlas connection string (MONGODB_URI) in Vercel Environment Variables.'
    );
  }

  connectionPromise = mongoose
    .connect(uri, {
      serverSelectionTimeoutMS: 15000,
    })
    .then((db) => {
      isConnected = db.connections[0].readyState === 1;
      console.log('✅ Connected to MongoDB database successfully.');
    })
    .catch((err) => {
      connectionPromise = null;
      console.error('❌ MongoDB connection error:', err.message);
      throw new Error(
        `Database connection failed: ${err.message}. Ensure your MongoDB Atlas IP Access List allows 0.0.0.0/0 for Vercel.`
      );
    });

  return connectionPromise;
}

module.exports = {
  connectToDatabase,
};
