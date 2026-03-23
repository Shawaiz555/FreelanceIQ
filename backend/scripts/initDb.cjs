/**
 * initDb.js — Creates all FreelanceIQ collections and indexes in MongoDB Atlas.
 * Run once: node scripts/initDb.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const URI = process.env.MONGODB_URI;
if (!URI) {
  console.error('ERROR: MONGODB_URI not set in .env');
  process.exit(1);
}

async function init() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(URI, { bufferCommands: false, connectTimeoutMS: 15000 });
  console.log('Connected.');

  const db = mongoose.connection.db;

  // ── List existing collections ──────────────────────────────────────────────
  const existing = (await db.listCollections().toArray()).map((c) => c.name);
  console.log('Existing collections:', existing.length ? existing : '(none)');

  // ── users collection ───────────────────────────────────────────────────────
  if (!existing.includes('users')) {
    await db.createCollection('users');
    console.log('Created collection: users');
  } else {
    console.log('Collection already exists: users');
  }

  const usersCol = db.collection('users');
  await usersCol.createIndex({ email: 1 }, { unique: true, name: 'email_unique' });
  console.log('Index ensured: users.email (unique)');

  // ── analyses collection ────────────────────────────────────────────────────
  if (!existing.includes('analyses')) {
    await db.createCollection('analyses');
    console.log('Created collection: analyses');
  } else {
    console.log('Collection already exists: analyses');
  }

  const analysesCol = db.collection('analyses');
  await analysesCol.createIndex(
    { user_id: 1, created_at: -1 },
    { name: 'user_history' }
  );
  console.log('Index ensured: analyses.user_id + created_at');

  // ── Verify ─────────────────────────────────────────────────────────────────
  const final = (await db.listCollections().toArray()).map((c) => c.name);
  console.log('\nCollections in database "' + db.databaseName + '":', final);

  await mongoose.disconnect();
  console.log('Done.');
}

init().catch((err) => {
  console.error('Init failed:', err.message);
  process.exit(1);
});
