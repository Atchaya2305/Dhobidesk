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
    const beforeData = beforeSnap.exists ? beforeSnap.data() : {};
    const beforeStatus = beforeData.status || null;
    const lastEventTimestamp = beforeData.lastEventTimestamp || 0;

    // Ignore out-of-order MQTT messages
    if (timestamp && lastEventTimestamp && timestamp < lastEventTimestamp) {
      console.warn(`Ignoring out-of-order MQTT message for ${machine_id}: event timestamp ${timestamp} < last seen ${lastEventTimestamp}`);
      return;
    }

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

    // Handle machine offline / online transitions
    if (beforeStatus !== 'offline' && state === 'offline') {
      await handleMachineOffline(machine_id);
    } else if (beforeStatus === 'offline' && state !== 'offline') {
      await handleMachineOnline(machine_id);
    }
  } catch (err) {
    console.error('Error processing message:', err);
  }
});

// Stale-data safeguard (unchanged from Step 2.2)
const STALE_THRESHOLD_MS = 90 * 1000;
setInterval(async () => {
  try {
    const snapshot = await db.collection('machines').get();
    const now = Date.now();
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const lastUpdated = data.lastUpdated?.toMillis?.() || 0;
      if (now - lastUpdated > STALE_THRESHOLD_MS && data.status !== 'offline') {
        await doc.ref.update({ status: 'offline' });
        console.log(`Marked ${doc.id} as offline (stale data)`);
        await handleMachineOffline(doc.id);
      }
    }
  } catch (err) {
    console.error('Error in stale-data safeguard:', err);
  }
}, 30 * 1000);

// ---------------------------------------------------------------------
// PART B — Booking/notification logic (replaces Cloud Functions)
// ---------------------------------------------------------------------
async function handleMachineOffline(machineId) {
  try {
    const activeBookingSnap = await db.collection('bookings')
      .where('machineId', '==', machineId)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (!activeBookingSnap.empty) {
      const bookingDoc = activeBookingSnap.docs[0];
      const bookingData = bookingDoc.data();
      if (!bookingData.machineOffline) {
        const nowMs = Date.now();
        const currentExpectedEndAt = bookingData.expectedEndAt;
        const currentEndMs = currentExpectedEndAt?.toMillis
          ? currentExpectedEndAt.toMillis()
          : (currentExpectedEndAt?.seconds ? currentExpectedEndAt.seconds * 1000 : nowMs + 30 * 60 * 1000);
        const remainingMs = Math.max(0, currentEndMs - nowMs);

        const updateData = {
          machineOffline: true,
          offlineSince: admin.firestore.Timestamp.fromMillis(nowMs),
          shifted: true,
          remainingMsAtPause: remainingMs,
        };

        if (!bookingData.originalEndAt && currentExpectedEndAt) {
          updateData.originalEndAt = currentExpectedEndAt;
        }

        await bookingDoc.ref.update(updateData);

        await sendPushNotification(
          bookingData.userId,
          'Power Cut Alert',
          `Power lost on machine ${machineId}. Your cycle is paused and completion time will shift.`
        );
        console.log(`Power cut on ${machineId}: active booking ${bookingDoc.id} marked shifted:true, paused with ${Math.round(remainingMs / 1000)}s remaining`);
        await syncMachineQueue(machineId);
      }
    }
  } catch (err) {
    console.error(`Error in handleMachineOffline for ${machineId}:`, err);
  }
}

async function handleMachineOnline(machineId) {
  try {
    const machineSnap = await db.collection('machines').doc(machineId).get();
    const cycleDurationMinutes = (machineSnap.exists && machineSnap.data().cycleDurationMinutes) || 30;

    const activeBookingSnap = await db.collection('bookings')
      .where('machineId', '==', machineId)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (!activeBookingSnap.empty) {
      const bookingDoc = activeBookingSnap.docs[0];
      const bookingData = bookingDoc.data();
      if (bookingData.machineOffline) {
        const nowMs = Date.now();
        const remainingMs = typeof bookingData.remainingMsAtPause === 'number'
          ? bookingData.remainingMsAtPause
          : cycleDurationMinutes * 60 * 1000;

        const newExpectedEndAt = admin.firestore.Timestamp.fromMillis(nowMs + remainingMs);

        await bookingDoc.ref.update({
          machineOffline: false,
          resumedAt: admin.firestore.Timestamp.fromMillis(nowMs),
          expectedEndAt: newExpectedEndAt,
        });

        const newTimeStr = new Date(newExpectedEndAt.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        await sendPushNotification(
          bookingData.userId,
          'Power Restored',
          `Power returned to machine ${machineId}. Your cycle has resumed. New finish time: ${newTimeStr}.`
        );
        console.log(`Power restored on ${machineId}: active booking ${bookingDoc.id} resumed, new expectedEndAt: ${new Date(newExpectedEndAt.toMillis()).toISOString()}`);

        // Recompute estimatedStartAt for all queued bookings on this machine
        const queuedSnap = await db.collection('bookings')
          .where('machineId', '==', machineId)
          .where('status', '==', 'queued')
          .orderBy('queuePosition')
          .get();

        if (!queuedSnap.empty) {
          const batch = db.batch();
          queuedSnap.docs.forEach((doc, idx) => {
            const estStartMs = newExpectedEndAt.toMillis() + idx * cycleDurationMinutes * 60 * 1000;
            batch.update(doc.ref, {
              estimatedStartAt: admin.firestore.Timestamp.fromMillis(estStartMs),
            });
          });
          await batch.commit();
          console.log(`Recomputed estimatedStartAt for ${queuedSnap.size} queued bookings on machine ${machineId}`);
        }
      }
      await syncMachineQueue(machineId);
    }
  } catch (err) {
    console.error(`Error in handleMachineOnline for ${machineId}:`, err);
  }
}

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
    await syncMachineQueue(machineId);
  }
}

async function promoteNextInQueue(machineId) {
  const machineSnap = await db.collection('machines').doc(machineId).get();
  const cycleDurationMinutes = (machineSnap.exists && machineSnap.data().cycleDurationMinutes) || 30;

  const queuedSnap = await db.collection('bookings')
    .where('machineId', '==', machineId)
    .where('status', '==', 'queued')
    .orderBy('queuePosition')
    .get();

  if (!queuedSnap.empty) {
    const [nextDoc, ...remainingDocs] = queuedSnap.docs;
    const nowMs = Date.now();
    const startedAt = admin.firestore.Timestamp.fromMillis(nowMs);
    const expectedEndAt = admin.firestore.Timestamp.fromMillis(nowMs + cycleDurationMinutes * 60 * 1000);

    await nextDoc.ref.update({
      status: 'active',
      queuePosition: 0,
      promotedAt: admin.firestore.FieldValue.serverTimestamp(),
      startedAt,
      expectedEndAt,
      estimatedStartAt: null,
      machineOffline: false,
    });
    await sendPushNotification(nextDoc.data().userId, 'Machine is free', 'It is now your turn — machine is available.');
    console.log(`Promoted user ${nextDoc.data().userId} to active on machine ${machineId}`);

    // Re-number remaining queued bookings starting from 1 and update estimatedStartAt
    if (remainingDocs.length > 0) {
      const batch = db.batch();
      remainingDocs.forEach((doc, idx) => {
        const newPos = idx + 1;
        const estStartMs = expectedEndAt.toMillis() + idx * cycleDurationMinutes * 60 * 1000;
        batch.update(doc.ref, {
          queuePosition: newPos,
          estimatedStartAt: admin.firestore.Timestamp.fromMillis(estStartMs),
        });
      });
      await batch.commit();
    }
    await syncMachineQueue(machineId);
  }
}

// Synchronize machine queue length and active cycle timing to machines collection
async function syncMachineQueue(machineId) {
  try {
    const queueSnap = await db.collection('bookings')
      .where('machineId', '==', machineId)
      .where('status', 'in', ['queued', 'active'])
      .get();

    const activeDoc = queueSnap.docs.find((d) => d.data().status === 'active');
    const queuedDocs = queueSnap.docs.filter((d) => d.data().status === 'queued');

    const updatePayload = {
      queueLength: queuedDocs.length,
      hasActiveBooking: !!activeDoc,
      activeBookingExpectedEndAt: activeDoc ? (activeDoc.data().expectedEndAt || null) : null,
      activeBookingOffline: activeDoc ? !!activeDoc.data().machineOffline : false,
    };

    await db.collection('machines').doc(machineId).set(updatePayload, { merge: true });
    console.log(`Synced machine queue info for ${machineId}: queueLength=${queuedDocs.length}, hasActive=${!!activeDoc}`);
  } catch (err) {
    console.error(`Error in syncMachineQueue for ${machineId}:`, err.message);
  }
}

async function syncAllMachines() {
  try {
    const machinesSnap = await db.collection('machines').get();
    for (const doc of machinesSnap.docs) {
      await syncMachineQueue(doc.id);
    }
  } catch (err) {
    console.error('Error in syncAllMachines:', err.message);
  }
}
syncAllMachines();

// Grace-period checker — runs every 5 minutes (replaces scheduled Cloud Function)
setInterval(async () => {
  const cutoff = Date.now() - GRACE_PERIOD_MINUTES * 60 * 1000;
  try {
    const doneBookings = await db.collection('bookings').where('status', '==', 'done').get();

    for (const doc of doneBookings.docs) {
      const data = doc.data();
      const notifiedAt = data.notifiedAt?.toMillis?.() || 0;
      if (notifiedAt < cutoff && !data.reminderSent) {
        // Atomic check-and-set using transaction to ensure idempotency
        let shouldSend = false;
        await db.runTransaction(async (t) => {
          const freshSnap = await t.get(doc.ref);
          if (!freshSnap.exists) return;
          const freshData = freshSnap.data();
          if (!freshData.reminderSent && (freshData.notifiedAt?.toMillis?.() || 0) < cutoff) {
            t.update(doc.ref, {
              reminderSent: true,
              reminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            shouldSend = true;
          }
        });

        if (shouldSend) {
          await sendPushNotification(data.userId, 'Reminder', 'Your laundry is still in the machine — others are waiting.');
          console.log(`Sent grace-period reminder to ${data.userId}`);
        }
      }
    }
  } catch (err) {
    console.error('Error in grace-period checker:', err);
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

// POST /createBooking — Atomic booking creation with quota & queue assignment
app.post('/createBooking', authenticateUser, async (req, res) => {
  try {
    const { machineId } = req.body;
    const userId = req.user.uid;
    if (!machineId) return res.status(400).json({ error: 'machineId required' });

    const today = new Date().toISOString().slice(0, 10);
    const userRef = db.collection('users').doc(userId);
    const machineRef = db.collection('machines').doc(machineId);

    const result = await db.runTransaction(async (transaction) => {
      // 1. Quota check
      const userSnap = await transaction.get(userRef);
      const userData = userSnap.data() || {};
      const bookingCountToday = userData.lastBookingDate === today ? (userData.dailyBookingCount || 0) : 0;

      if (bookingCountToday >= DAILY_BOOKING_CAP) {
        const error = new Error('Daily booking cap reached');
        error.statusCode = 429;
        throw error;
      }

      // 2. Machine check
      const machineSnap = await transaction.get(machineRef);
      const machineData = machineSnap.exists ? machineSnap.data() : {};
      const machineStatus = machineData.status || 'offline';
      const cycleDurationMinutes = machineData.cycleDurationMinutes || 30;
      const isFree = machineStatus === 'idle' || machineStatus === 'done';

      // 3. Queue check
      const existingQueueQuery = db.collection('bookings')
        .where('machineId', '==', machineId)
        .where('status', 'in', ['queued', 'active']);
      const existingQueueSnap = await transaction.get(existingQueueQuery);

      const activeDoc = existingQueueSnap.docs.find((d) => d.data().status === 'active');
      const hasActive = !!activeDoc;
      const queuedDocs = existingQueueSnap.docs.filter((d) => d.data().status === 'queued');

      let status;
      let queuePosition;
      let startedAt = null;
      let expectedEndAt = null;
      let estimatedStartAt = null;

      const nowMs = Date.now();

      if (isFree && !hasActive && queuedDocs.length === 0) {
        status = 'active';
        queuePosition = 0;
        startedAt = admin.firestore.Timestamp.fromMillis(nowMs);
        expectedEndAt = admin.firestore.Timestamp.fromMillis(nowMs + cycleDurationMinutes * 60 * 1000);
      } else {
        status = 'queued';
        const maxPos = queuedDocs.reduce((max, d) => Math.max(max, d.data().queuePosition || 0), 0);
        queuePosition = maxPos + 1;

        let baseEndMs = nowMs;
        if (activeDoc && activeDoc.data().expectedEndAt) {
          const endTs = activeDoc.data().expectedEndAt;
          baseEndMs = endTs.toMillis ? endTs.toMillis() : (endTs.seconds ? endTs.seconds * 1000 : nowMs);
        } else {
          baseEndMs = nowMs + cycleDurationMinutes * 60 * 1000;
        }

        const estStartMs = baseEndMs + (queuePosition - 1) * cycleDurationMinutes * 60 * 1000;
        estimatedStartAt = admin.firestore.Timestamp.fromMillis(estStartMs);
      }

      const newBookingRef = db.collection('bookings').doc();
      const booking = {
        machineId,
        userId,
        status,
        queuePosition,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        notifiedAt: null,
        startedAt,
        expectedEndAt,
        estimatedStartAt,
      };

      transaction.set(newBookingRef, booking);
      transaction.set(userRef, {
        dailyBookingCount: bookingCountToday + 1,
        lastBookingDate: today,
      }, { merge: true });

      return { bookingId: newBookingRef.id, status, queuePosition, startedAt, expectedEndAt, estimatedStartAt };
    });

    await syncMachineQueue(machineId);

    res.json(result);
  } catch (err) {
    console.error('createBooking error:', err.message);
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /cancelBooking — Cancel booking, renumber queue, promote next if active was cancelled
app.post('/cancelBooking', authenticateUser, async (req, res) => {
  try {
    const { bookingId } = req.body;
    const userId = req.user.uid;
    if (!bookingId) return res.status(400).json({ error: 'bookingId required' });

    const bookingRef = db.collection('bookings').doc(bookingId);
    let promotedUserId = null;
    let targetMachineId = null;

    await db.runTransaction(async (transaction) => {
      const bookingSnap = await transaction.get(bookingRef);
      if (!bookingSnap.exists) {
        const error = new Error('Booking not found');
        error.statusCode = 404;
        throw error;
      }

      const booking = bookingSnap.data();
      if (booking.userId !== userId) {
        const error = new Error('Unauthorized to cancel this booking');
        error.statusCode = 403;
        throw error;
      }

      if (booking.status !== 'queued' && booking.status !== 'active') {
        const error = new Error(`Cannot cancel booking with status '${booking.status}'`);
        error.statusCode = 400;
        throw error;
      }

      targetMachineId = booking.machineId;
      const wasActive = booking.status === 'active';

      const targetMachineSnap = await transaction.get(db.collection('machines').doc(targetMachineId));
      const cycleDurationMinutes = (targetMachineSnap.exists && targetMachineSnap.data().cycleDurationMinutes) || 30;

      transaction.update(bookingRef, {
        status: 'cancelled',
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const queuedQuery = db.collection('bookings')
        .where('machineId', '==', targetMachineId)
        .where('status', '==', 'queued')
        .orderBy('queuePosition');
      const queuedSnap = await transaction.get(queuedQuery);

      const remainingQueued = queuedSnap.docs.filter((d) => d.id !== bookingId);

      if (wasActive) {
        if (remainingQueued.length > 0) {
          const nextDoc = remainingQueued[0];
          promotedUserId = nextDoc.data().userId;
          const nowMs = Date.now();
          const startedAt = admin.firestore.Timestamp.fromMillis(nowMs);
          const expectedEndAt = admin.firestore.Timestamp.fromMillis(nowMs + cycleDurationMinutes * 60 * 1000);

          transaction.update(nextDoc.ref, {
            status: 'active',
            queuePosition: 0,
            promotedAt: admin.firestore.FieldValue.serverTimestamp(),
            startedAt,
            expectedEndAt,
            estimatedStartAt: null,
            machineOffline: false,
          });

          for (let i = 1; i < remainingQueued.length; i++) {
            const newPos = i;
            const estStartMs = expectedEndAt.toMillis() + (i - 1) * cycleDurationMinutes * 60 * 1000;
            transaction.update(remainingQueued[i].ref, {
              queuePosition: newPos,
              estimatedStartAt: admin.firestore.Timestamp.fromMillis(estStartMs),
            });
          }
        }
      } else {
        let baseEndMs = Date.now() + cycleDurationMinutes * 60 * 1000;
        const activeSnap = await transaction.get(
          db.collection('bookings').where('machineId', '==', targetMachineId).where('status', '==', 'active').limit(1)
        );
        if (!activeSnap.empty && activeSnap.docs[0].data().expectedEndAt) {
          const ts = activeSnap.docs[0].data().expectedEndAt;
          baseEndMs = ts.toMillis ? ts.toMillis() : (ts.seconds ? ts.seconds * 1000 : baseEndMs);
        }

        for (let i = 0; i < remainingQueued.length; i++) {
          const newPos = i + 1;
          const estStartMs = baseEndMs + i * cycleDurationMinutes * 60 * 1000;
          transaction.update(remainingQueued[i].ref, {
            queuePosition: newPos,
            estimatedStartAt: admin.firestore.Timestamp.fromMillis(estStartMs),
          });
        }
      }
    });

    if (promotedUserId) {
      await sendPushNotification(
        promotedUserId,
        'Machine is free',
        'It is now your turn — machine is available.'
      );
      console.log(`Promoted user ${promotedUserId} to active on cancellation of active booking on ${targetMachineId}`);
    }

    if (targetMachineId) {
      await syncMachineQueue(targetMachineId);
    }

    res.json({ success: true, bookingId, status: 'cancelled' });
  } catch (err) {
    console.error('cancelBooking error:', err.message);
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /markCollected — User marks finished laundry as collected
app.post('/markCollected', authenticateUser, async (req, res) => {
  try {
    const { bookingId } = req.body;
    const userId = req.user.uid;
    if (!bookingId) return res.status(400).json({ error: 'bookingId required' });

    const bookingRef = db.collection('bookings').doc(bookingId);
    let targetMachineId = null;

    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(bookingRef);
      if (!snap.exists) {
        const error = new Error('Booking not found');
        error.statusCode = 404;
        throw error;
      }

      const booking = snap.data();
      if (booking.userId !== userId) {
        const error = new Error('Unauthorized');
        error.statusCode = 403;
        throw error;
      }

      if (booking.status !== 'done') {
        const error = new Error(`Cannot collect laundry: current status is '${booking.status}', must be 'done'`);
        error.statusCode = 400;
        throw error;
      }

      targetMachineId = booking.machineId;

      transaction.update(bookingRef, {
        status: 'collected',
        collectedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    if (targetMachineId) {
      await syncMachineQueue(targetMachineId);
    }

    res.json({ success: true, bookingId, status: 'collected' });
  } catch (err) {
    console.error('markCollected error:', err.message);
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    res.status(500).json({ error: 'Internal error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Local booking API listening on http://localhost:${PORT}`));