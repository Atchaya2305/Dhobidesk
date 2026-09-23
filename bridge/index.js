require('dotenv').config();
const mqtt = require('mqtt');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

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

    if (!machine_id || !state) {
      console.warn('Invalid message, skipping:', payload);
      return;
    }

    await db.collection('machines').doc(machine_id).set({
      status: state,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      lastEventTimestamp: timestamp,
    }, { merge: true });

    console.log(`Firestore updated: ${machine_id} -> ${state}`);
  } catch (err) {
    console.error('Error processing message:', err);
  }
});

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