import { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, query, where, orderBy, doc, setDoc } from 'firebase/firestore';
import { getMessaging, getToken } from 'firebase/messaging';

const statusColors = {
  idle: '#4caf50',
  washing: '#ffc107',
  spinning: '#ff9800',
  done: '#2196f3',
  offline: '#9e9e9e',
};

function Dashboard({ user }) {
  const [machines, setMachines] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingMsg, setBookingMsg] = useState('');
  const [notifStatus, setNotifStatus] = useState('unknown');

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
      // NOTE: getToken requires a VAPID key + a registered service worker for real push.
      // For this project stage, we record that permission was granted;
      // full FCM token wiring can be added once you generate a VAPID key in
      // Firebase Console > Project Settings > Cloud Messaging.
      setNotifStatus('granted');
      await setDoc(doc(db, 'users', user.uid), { notificationsEnabled: true }, { merge: true });
    } catch (err) {
      console.error(err);
      setNotifStatus('error');
    }
  };

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>DhobiDesk</h1>
      <p>Logged in as {user.email}</p>

      <button onClick={enableNotifications} style={{ marginBottom: 16, padding: 8 }}>
        Enable notifications ({notifStatus})
      </button>

      {bookingMsg && <p style={{ fontWeight: 'bold' }}>{bookingMsg}</p>}

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
      <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 600 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #555', padding: 8 }}>Machine</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #555', padding: 8 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id}>
              <td style={{ padding: 8, borderBottom: '1px solid #333' }}>{b.machineId}</td>
              <td style={{ padding: 8, borderBottom: '1px solid #333' }}>{b.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Dashboard;