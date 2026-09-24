import { useEffect, useState } from 'react';
import { db, getFirebaseMessaging } from './firebase';
import { collection, onSnapshot, query, where, orderBy, doc, setDoc } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';

const statusColors = {
  idle: '#4caf50',
  washing: '#ffc107',
  spinning: '#ff9800',
  done: '#2196f3',
  offline: '#9e9e9e',
};

function formatCountdown(booking, now) {
  if (booking.status !== 'active') return null;
  if (booking.machineOffline) {
    return { text: '⏸ PAUSED (Power Cut)', isPaused: true, isDone: false };
  }
  if (!booking.expectedEndAt) {
    return { text: 'In progress', isPaused: false, isDone: false };
  }
  const endMs = booking.expectedEndAt.toMillis
    ? booking.expectedEndAt.toMillis()
    : (booking.expectedEndAt.seconds ? booking.expectedEndAt.seconds * 1000 : 0);

  const diffSec = Math.floor((endMs - now) / 1000);
  if (diffSec <= 0) {
    return { text: 'Finishing cycle...', isPaused: false, isDone: true };
  }
  const m = Math.floor(diffSec / 60);
  const s = diffSec % 60;
  return {
    text: `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`,
    isPaused: false,
    isDone: false,
  };
}

function formatSchedule(booking, now) {
  if (booking.status === 'active') {
    const cd = formatCountdown(booking, now);
    return cd ? cd.text : 'Active';
  }
  if (booking.status === 'queued') {
    if (booking.estimatedStartAt) {
      const startMs = booking.estimatedStartAt.toMillis
        ? booking.estimatedStartAt.toMillis()
        : (booking.estimatedStartAt.seconds ? booking.estimatedStartAt.seconds * 1000 : 0);
      const timeStr = new Date(startMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `Est. start: ${timeStr} (Queue #${booking.queuePosition || 1})`;
    }
    return `Queue #${booking.queuePosition || 1}`;
  }
  if (booking.status === 'done') return 'Finished — Please collect';
  if (booking.status === 'collected') return 'Collected';
  if (booking.status === 'cancelled') return 'Cancelled';
  return '-';
}

function Dashboard({ user }) {
  const [machines, setMachines] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingMsg, setBookingMsg] = useState('');
  const [notifStatus, setNotifStatus] = useState('unknown');
  const [toast, setToast] = useState(null);
  const [now, setNow] = useState(Date.now());

  // 1-second live ticker for live countdowns
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Foreground push notification listener
  useEffect(() => {
    let unsubscribe = null;
    getFirebaseMessaging().then((msg) => {
      if (!msg) return;
      unsubscribe = onMessage(msg, (payload) => {
        console.log('Foreground push notification received:', payload);
        const title = payload.notification?.title || 'DhobiDesk Alert';
        const body = payload.notification?.body || '';

        // If browser permission is granted, also show system notification
        if (Notification.permission === 'granted') {
          try {
            new Notification(title, { body, icon: '/favicon.svg' });
          } catch (e) {
            console.log('Notification API fallback:', e);
          }
        }

        setToast({ title, body, timestamp: Date.now() });
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'machines'), (snapshot) => {
      setMachines(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, 'bookings'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setBookings(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user.uid]);

  const bookMachine = async (machineId) => {
    setBookingMsg('Booking...');
    try {
      const idToken = await user.getIdToken();
      const bridgeUrl = import.meta.env.VITE_BRIDGE_URL || 'http://localhost:3001';
      const res = await fetch(`${bridgeUrl}/createBooking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ machineId }),
      });
      const data = await res.json();
      setBookingMsg(res.ok
        ? `Booking ${data.status === 'active' ? 'confirmed!' : 'added to queue.'}`
        : `Error: ${data.error}`);
    } catch (err) {
      setBookingMsg('Could not reach booking server. Is bridge/index.js running?');
    }
  };

  const enableNotifications = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setNotifStatus('denied');
        return;
      }
      setNotifStatus('requesting token...');

      let fcmToken = null;
      const messagingInstance = await getFirebaseMessaging();

      if (messagingInstance && 'serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

          if (vapidKey) {
            fcmToken = await getToken(messagingInstance, {
              vapidKey,
              serviceWorkerRegistration: registration,
            });
            console.log('FCM Token received:', fcmToken);
          } else {
            console.warn('VITE_FIREBASE_VAPID_KEY not set in .env');
          }
        } catch (swErr) {
          console.error('Service worker / getToken error:', swErr);
        }
      }

      const updatePayload = { notificationsEnabled: true };
      if (fcmToken) {
        updatePayload.fcmToken = fcmToken;
      }

      await setDoc(doc(db, 'users', user.uid), updatePayload, { merge: true });
      setNotifStatus(fcmToken ? 'active' : 'granted (need VAPID key)');
      setToast({
        title: 'Notifications Activated',
        body: fcmToken
          ? 'Push notifications are registered with your device!'
          : 'Permission granted! Add VITE_FIREBASE_VAPID_KEY in .env to complete web push token registration.',
      });
    } catch (err) {
      console.error('Error enabling notifications:', err);
      setNotifStatus('error');
    }
  };

  const activeBooking = bookings.find((b) => b.status === 'active');
  const activeCountdown = activeBooking ? formatCountdown(activeBooking, now) : null;

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>DhobiDesk</h1>
      <p>Logged in as {user.email}</p>

      <button onClick={enableNotifications} style={{ marginBottom: 16, padding: 8 }}>
        Enable notifications ({notifStatus})
      </button>

      {toast && (
        <div style={{
          background: '#2e7d32',
          color: '#fff',
          padding: '12px 18px',
          borderRadius: 8,
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: 600,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          <div>
            <strong>{toast.title}</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: 14 }}>{toast.body}</p>
          </div>
          <button
            onClick={() => setToast(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 18,
              marginLeft: 16
            }}
          >
            ✕
          </button>
        </div>
      )}

      {bookingMsg && <p style={{ fontWeight: 'bold' }}>{bookingMsg}</p>}

      {/* Prominent Active Booking Countdown Card */}
      {activeBooking && activeCountdown && (
        <div style={{
          background: activeCountdown.isPaused ? '#d32f2f' : '#1976d2',
          color: '#fff',
          padding: 20,
          borderRadius: 10,
          marginBottom: 28,
          maxWidth: 600,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          <h3 style={{ margin: '0 0 8px 0' }}>Current Active Wash: {activeBooking.machineId}</h3>
          <div style={{ fontSize: 36, fontWeight: 'bold', letterSpacing: 2, margin: '8px 0' }}>
            {activeCountdown.text}
          </div>
          {activeBooking.shifted && (
            <p style={{ margin: '4px 0 0 0', fontSize: 13, background: 'rgba(0,0,0,0.25)', padding: '4px 8px', borderRadius: 4, display: 'inline-block' }}>
              Shifted due to power cut recovery
            </p>
          )}
          {activeBooking.expectedEndAt && (
            <p style={{ margin: '6px 0 0 0', fontSize: 14 }}>
              Expected completion: {new Date(activeBooking.expectedEndAt.toMillis ? activeBooking.expectedEndAt.toMillis() : activeBooking.expectedEndAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          )}
        </div>
      )}

      <h2>Machine Status</h2>
      {machines.length === 0 && <p>No machines reporting yet.</p>}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
        {machines.map((m) => (
          <div key={m.id} style={{ background: statusColors[m.status] || '#ccc', color: '#fff', padding: 20, borderRadius: 8, width: 200 }}>
            <h3>{m.id}</h3>
            <p>Status: {m.status}</p>
            <button onClick={() => bookMachine(m.id)} style={{ padding: 6, width: '100%' }}>
              Book this machine
            </button>
          </div>
        ))}
      </div>

      <h2>Your Booking History</h2>
      {bookings.length === 0 && <p>No bookings yet.</p>}
      <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 700 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #555', padding: 8 }}>Machine</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #555', padding: 8 }}>Status</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #555', padding: 8 }}>Timer / Schedule</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id}>
              <td style={{ padding: 8, borderBottom: '1px solid #333' }}>{b.machineId}</td>
              <td style={{ padding: 8, borderBottom: '1px solid #333' }}>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 'bold',
                  background: b.status === 'active' ? '#4caf50' : b.status === 'queued' ? '#ff9800' : '#757575',
                  color: '#fff'
                }}>
                  {b.status}
                </span>
                {b.shifted && <span style={{ marginLeft: 6, fontSize: 11, color: '#ffb74d' }}>shifted</span>}
              </td>
              <td style={{ padding: 8, borderBottom: '1px solid #333', fontFamily: 'monospace', fontSize: 14 }}>
                {formatSchedule(b, now)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Dashboard;