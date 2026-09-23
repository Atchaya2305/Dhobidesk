const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

const DAILY_BOOKING_CAP = 2;
const GRACE_PERIOD_MINUTES = 15;

// --- 1. Create a booking (reserve if free, else queue) ---
exports.createBooking = functions.https.onCall(async (data, context) => {
  const { machineId, userId } = data;
  const today = new Date().toISOString().slice(0, 10);

  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();
  const userData = userSnap.data() || {};

  const bookingCountToday =
    userData.lastBookingDate === today ? (userData.dailyBookingCount || 0) : 0;

  if (bookingCountToday >= DAILY_BOOKING_CAP) {
    throw new functions.https.HttpsError('resource-exhausted', 'Daily booking cap reached');
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

  await userRef.set({
    dailyBookingCount: bookingCountToday + 1,
    lastBookingDate: today,
  }, { merge: true });

  return { bookingId: ref.id, status: booking.status };
});

// --- 2. Watch for "done" transitions and notify the active booking's user ---
exports.onMachineDone = functions.firestore
  .document('machines/{machineId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    if (before.status !== 'done' && after.status === 'done') {
      const machineId = context.params.machineId;

      const activeBooking = await db.collection('bookings')
        .where('machineId', '==', machineId)
        .where('status', '==', 'active')
        .limit(1)
        .get();

      if (!activeBooking.empty) {
        const bookingDoc = activeBooking.docs[0];
        await sendPushNotification(bookingDoc.data().userId,
          'Your laundry is done!', 'Please collect it soon.');
        await bookingDoc.ref.update({
          status: 'completed',
          notifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await promoteNextInQueue(machineId);
      }
    }
  });

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
    await sendPushNotification(nextDoc.data().userId,
      'Machine is free', 'It is now your turn — machine is available.');
  }
}

// --- 3. Grace-period checker: reminder if "done" machine isn't collected ---
exports.gracePeriodCheck = functions.pubsub.schedule('every 5 minutes').onRun(async () => {
  const cutoff = Date.now() - GRACE_PERIOD_MINUTES * 60 * 1000;

  const completedBookings = await db.collection('bookings')
    .where('status', '==', 'completed')
    .get();

  for (const doc of completedBookings.docs) {
    const data = doc.data();
    const notifiedAt = data.notifiedAt?.toMillis?.() || 0;
    if (notifiedAt < cutoff && !data.reminderSent) {
      await sendPushNotification(data.userId,
        'Reminder', 'Your laundry is still in the machine — others are waiting.');
      await doc.ref.update({ reminderSent: true });
    }
  }
  return null;
});

async function sendPushNotification(userId, title, body) {
  const userSnap = await db.collection('users').doc(userId).get();
  const fcmToken = userSnap.data()?.fcmToken;
  if (!fcmToken) return console.warn(`No FCM token for user ${userId}`);

  await admin.messaging().send({
    token: fcmToken,
    notification: { title, body },
  });
}