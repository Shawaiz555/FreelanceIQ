const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set');
}

let cached = global._mongoConn;
if (!cached) {
  cached = global._mongoConn = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        connectTimeoutMS: 10000,
      })
      .then((m) => {
        console.log('[DB] MongoDB connected');
        return m;
      });

    mongoose.connection.on('error', (err) => {
      console.error('[DB] Connection error:', err);
    });
    mongoose.connection.on('disconnected', () => {
      console.warn('[DB] Disconnected');
      cached.conn = null;
      cached.promise = null;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectDB;
