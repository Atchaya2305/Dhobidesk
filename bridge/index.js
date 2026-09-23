const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const mqtt = require('mqtt');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

let credential;
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    const serviceAccountJson = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    credential = admin.credential.cert(serviceAccountJson);
  } catch (err) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON string:', err);
    throw err;
  }
} else {
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : path.resolve(__dirname, 'serviceAccountKey.json');

  if (fs.existsSync(keyPath)) {
    credential = admin.credential.cert(require(keyPath));
  } else {
    console.warn(`Service account file not found at ${keyPath}, attempting applicationDefault credentials...`);
    credential = admin.credential.applicationDefault();
  }
}

admin.initializeApp({ credential });
const db = admin.firestore();

const DAILY_BOOKING_CAP = 2;
const GRACE_PERIOD_MINUTES = 15;

// ---------------------------------------------------------------------
// PART A — MQTT listener: sensor data -> Firestore (same as Step 2.2)
// ---------------------------------------------------------------------
const client = mqtt.connect(process.env.HIVEMQ_URL, {
  username: process.env.HIVEMQ_USERNAME,
  password: process.env.HIVEMQ_PASSWORD,
  reconnectPeriod: 2000,
});

client.on('connect', () => {
  console.log('Connected to HiveMQ');
  client.subscribe('dhobidesk/machines/+/state', { qos: 1 });
});

client.on('reconnect', () => console.log('Reconnecting to MQTT broker...'));
client.on('error', (err) => console.error('MQTT error:', err));

client.on('message', async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    const { machine_id, state, timestamp } = payload;
    if (!machine_id || !state) return console.warn('Invalid message, skipping:', payload);

    const machineRef = db.collection('machines').doc(machine_id);
    const beforeSnap = await machineRef.get();
    const beforeStatus = beforeSnap.exists ? beforeSnap.data().status : null;

    await machineRef.set({
      status: state,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      lastEventTimestamp: timestamp,
    }, { merge: true });

    console.log(`Firestore updated: ${machine_id} -> ${state}`);

    // Replaces Cloud Function "onMachineDone"
    if (beforeStatus !== 'done' && state === 'done') {
      await handleMachineDone(machine_id);
    }
  } catch (err) {
    console.error('Error processing message:', err);
  }
});

// Stale-data safeguard (unchanged from Step 2.2)
const STALE_THRESHOLD_MS = 90 * 1000;
setInterval(async () => {
  const snapshot = await db.collection('machines').get();
  const now = Date.now();
  snapshot.forEach(async (doc) => {
    const data = doc.data();
    const lastUpdated = data.lastUpdated?.toMillis?.() || 0;
    if (now - lastUpdated > STALE_THRESHOLD_MS && data.status !== 'offline') {
      await doc.ref.update({ status: 'offline' });
      console.log(`Marked ${doc.id} as offline (stale data)`);
    }
  });
}, 30 * 1000);

// ---------------------------------------------------------------------
// PART B — Booking/notification logic (replaces Cloud Functions)
// ---------------------------------------------------------------------
async function handleMachineDone(machineId) {
  const activeBooking = await db.collection('bookings')
    .where('machineId', '==', machineId)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (!activeBooking.empty) {
    const bookingDoc = activeBooking.docs[0];
    await sendPushNotification(bookingDoc.data().userId, 'Your laundry is done!', 'Please collect it soon.');
    await bookingDoc.ref.update({
      status: 'done',
      notifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`Notified user ${bookingDoc.data().userId}, booking marked done`);
    await promoteNextInQueue(machineId);
  }
}

async function promoteNextInQueue(machineId) {
  const nextInQueue = await db.collection('bookings')
    .where('machineId', '==', machineId)
    .where('status', '==', 'queued')
    .orderBy('queuePosition')
    .limit(1)
    .get();

  if (!nextInQueue.empty) {
    const nextDoc = nextInQueue.docs[0];
    await nextDoc.ref.update({ status: 'active' });
    await sendPushNotification(nextDoc.data().userId, 'Machine is free', 'It is now your turn — machine is available.');
    console.log(`Promoted next user ${nextDoc.data().userId} to active`);
  }
}

// Grace-period checker — runs every 5 minutes (replaces scheduled Cloud Function)
setInterval(async () => {
  const cutoff = Date.now() - GRACE_PERIOD_MINUTES * 60 * 1000;
  const doneBookings = await db.collection('bookings').where('status', '==', 'done').get();

  for (const doc of doneBookings.docs) {
    const data = doc.data();
    const notifiedAt = data.notifiedAt?.toMillis?.() || 0;
    if (notifiedAt < cutoff && !data.reminderSent) {
      await sendPushNotification(data.userId, 'Reminder', 'Your laundry is still in the machine — others are waiting.');
      await doc.ref.update({ reminderSent: true });
      console.log(`Sent grace-period reminder to ${data.userId}`);
    }
  }
}, 5 * 60 * 1000);

async function sendPushNotification(userId, title, body) {
  const userSnap = await db.collection('users').doc(userId).get();
  const fcmToken = userSnap.data()?.fcmToken;
  if (!fcmToken) return console.warn(`No FCM token for user ${userId}`);

  await admin.messaging().send({ token: fcmToken, notification: { title, body } });
}

// ---------------------------------------------------------------------
// PART C — Local HTTP API for the web app to create bookings
// ---------------------------------------------------------------------
const app = express();

const corsOriginEnv = process.env.CORS_ORIGIN || 'http://localhost:5173';
const allowedOrigins = corsOriginEnv.includes(',')
  ? corsOriginEnv.split(',').map((o) => o.trim())
  : corsOriginEnv;

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

app.use(express.json());

// GET /health
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication middleware verifying Firebase ID token
async function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header' });
  }

  const idToken = authHeader.split('Bearer ')[1].trim();
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}

app.post('/createBooking', authenticateUser, async (req, res) => {
  try {
    const { machineId } = req.body;
    const userId = req.user.uid;
    if (!machineId) return res.status(400).json({ error: 'machineId required' });

    const today = new Date().toISOString().slice(0, 10);
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    const userData = userSnap.data() || {};
    const bookingCountToday = userData.lastBookingDate === today ? (userData.dailyBookingCount || 0) : 0;

    if (bookingCountToday >= DAILY_BOOKING_CAP) {
      return res.status(429).json({ error: 'Daily booking cap reached' });
    }

    const machineSnap = await db.collection('machines').doc(machineId).get();
    const machineStatus = machineSnap.data()?.status;
    const isFree = machineStatus === 'idle' || machineStatus === 'done';

    const existingQueue = await db.collection('bookings')
      .where('machineId', '==', machineId)
      .where('status', 'in', ['queued', 'active'])
      .get();

    const booking = {
      machineId,
      userId,
      status: isFree && existingQueue.empty ? 'active' : 'queued',
      queuePosition: existingQueue.size,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      notifiedAt: null,
    };

    const ref = await db.collection('bookings').add(booking);
    await userRef.set({ dailyBookingCount: bookingCountToday + 1, lastBookingDate: today }, { merge: true });

    res.json({ bookingId: ref.id, status: booking.status });
  } catch (err) {
    console.error('createBooking error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Local booking API listening on http://localhost:${PORT}`));