import { useEffect, useState, useMemo } from 'react';
import { db, getFirebaseMessaging, auth } from './firebase';
import { collection, onSnapshot, query, where, orderBy, doc, setDoc } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import './App.css';

function formatCountdown(booking, now) {
  if (booking.status !== 'active') return null;
  if (booking.machineOffline) {
    return { text: 'PAUSED', isPaused: true, isDone: false };
  }
  if (!booking.expectedEndAt) {
    return { text: 'In progress', isPaused: false, isDone: false };
  }
  const endMs = booking.expectedEndAt.toMillis
    ? booking.expectedEndAt.toMillis()
    : (booking.expectedEndAt.seconds ? booking.expectedEndAt.seconds * 1000 : 0);

  const diffSec = Math.floor((endMs - now) / 1000);
  if (diffSec <= 0) {
    return { text: 'Finishing...', isPaused: false, isDone: true };
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

function getMachineWaitInfo(machine, now) {
  const queueLength = typeof machine.queueLength === 'number' ? machine.queueLength : 0;
  const cycleMinutes = machine.cycleDurationMinutes || 30;

  if (machine.status === 'offline') {
    return {
      type: 'offline',
      badgeClass: 'wait-offline',
      text: `Offline (${queueLength} in queue)`,
      isAvailable: false,
    };
  }

  // If idle, no active booking flag, and no queue
  if ((machine.status === 'idle' || machine.status === 'done') && !machine.hasActiveBooking && queueLength === 0) {
    return {
      type: 'available',
      badgeClass: 'wait-available',
      text: 'Available now',
      isAvailable: true,
    };
  }

  // Calculate remaining time on active cycle
  let activeRemainingMins = cycleMinutes;
  if (machine.activeBookingExpectedEndAt) {
    const endMs = machine.activeBookingExpectedEndAt.toMillis
      ? machine.activeBookingExpectedEndAt.toMillis()
      : (machine.activeBookingExpectedEndAt.seconds ? machine.activeBookingExpectedEndAt.seconds * 1000 : 0);
    const diffMs = Math.max(0, endMs - now);
    activeRemainingMins = Math.ceil(diffMs / 60000);
  }

  const totalWaitMins = activeRemainingMins + queueLength * cycleMinutes;
  const prefix = queueLength > 0 ? `Queue: ${queueLength} • ` : (machine.hasActiveBooking ? 'In cycle • ' : '');

  return {
    type: 'busy',
    badgeClass: 'wait-busy',
    text: `${prefix}~${totalWaitMins}m wait`,
    isAvailable: false,
  };
}

function Dashboard({ user }) {
  const [machines, setMachines] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [notifStatus, setNotifStatus] = useState('unknown');
  const [toasts, setToasts] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [actionLoading, setActionLoading] = useState(null); // { type, id }
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all' | 'active_queued' | 'past'

  // 1-second live ticker for countdowns and wait time updates
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper to add auto-dismissing toast notifications
  const addToast = (title, body, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, title, body, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

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

        addToast(title, body, 'info');
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Real-time listener for machines
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'machines'), (snapshot) => {
      setMachines(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Real-time listener for current user's bookings
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

  // Request browser FCM notification permissions & register token
  const enableNotifications = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setNotifStatus('denied');
        addToast('Notifications Denied', 'Permission to display notifications was denied.', 'warning');
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
      addToast(
        'Notifications Activated',
        fcmToken
          ? 'Push notifications are registered with your device!'
          : 'Permission granted! Add VITE_FIREBASE_VAPID_KEY in .env to complete web push token registration.',
        'success'
      );
    } catch (err) {
      console.error('Error enabling notifications:', err);
      setNotifStatus('error');
      addToast('Notification Setup Error', 'Could not activate notifications.', 'error');
    }
  };

  // POST /createBooking
  const bookMachine = async (machineId) => {
    setActionLoading({ type: 'book', id: machineId });
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
      if (res.ok) {
        addToast(
          'Booking Confirmed',
          data.status === 'active'
            ? `Your wash cycle on ${machineId} has started!`
            : `Added to queue (#${data.queuePosition}) for ${machineId}.`,
          'success'
        );
      } else {
        addToast('Booking Failed', data.error || 'Could not complete booking', 'error');
      }
    } catch (err) {
      addToast('Connection Error', 'Could not reach booking server. Is bridge running?', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // POST /cancelBooking
  const cancelBooking = async (bookingId, machineId) => {
    if (!window.confirm(`Are you sure you want to cancel your reservation on ${machineId}?`)) {
      return;
    }

    setActionLoading({ type: 'cancel', id: bookingId });
    try {
      const idToken = await user.getIdToken();
      const bridgeUrl = import.meta.env.VITE_BRIDGE_URL || 'http://localhost:3001';
      const res = await fetch(`${bridgeUrl}/cancelBooking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast('Reservation Cancelled', `Your reservation on ${machineId} was cancelled.`, 'info');
      } else {
        addToast('Cancellation Error', data.error || 'Failed to cancel reservation', 'error');
      }
    } catch (err) {
      addToast('Connection Error', 'Could not reach booking server.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // POST /markCollected
  const markCollected = async (bookingId, machineId) => {
    setActionLoading({ type: 'collect', id: bookingId });
    try {
      const idToken = await user.getIdToken();
      const bridgeUrl = import.meta.env.VITE_BRIDGE_URL || 'http://localhost:3001';
      const res = await fetch(`${bridgeUrl}/markCollected`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast('Laundry Collected', `Marked as collected from ${machineId}. Thank you!`, 'success');
      } else {
        addToast('Error', data.error || 'Failed to mark as collected', 'error');
      }
    } catch (err) {
      addToast('Connection Error', 'Could not reach booking server.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Categorize reservations
  const activeBooking = useMemo(() => bookings.find((b) => b.status === 'active'), [bookings]);

  // Order queued bookings sequentially (#1, #2, #3, ...)
  const queuedBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.status === 'queued')
        .sort((a, b) => (a.queuePosition || 0) - (b.queuePosition || 0)),
    [bookings]
  );

  const pickupBookings = useMemo(() => bookings.filter((b) => b.status === 'done'), [bookings]);
  const historyBookings = useMemo(
    () => bookings.filter((b) => b.status === 'collected' || b.status === 'cancelled' || b.status === 'done'),
    [bookings]
  );

  const displayedBookings = useMemo(() => {
    if (historyFilter === 'past') {
      return bookings.filter((b) => b.status === 'collected' || b.status === 'cancelled' || b.status === 'done');
    }
    if (historyFilter === 'active_queued') {
      return bookings.filter((b) => b.status === 'active' || b.status === 'queued');
    }
    return bookings;
  }, [bookings, historyFilter]);

  const activeCountdown = activeBooking ? formatCountdown(activeBooking, now) : null;

  return (
    <div className="dhobidesk-app">
      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <div>
              <div className="toast-title">{t.title}</div>
              <div className="toast-body">{t.body}</div>
            </div>
            <button className="toast-close" onClick={() => removeToast(t.id)}>✕</button>
          </div>
        ))}
      </div>

      {/* Header Bar */}
      <header className="dhobidesk-header">
        <div className="dhobidesk-title-group">
          <h1>🧺 DhobiDesk</h1>
          <p className="dhobidesk-subtitle">Smart Laundry Machine Monitoring & Booking System</p>
        </div>
        <div className="dhobidesk-user-actions">
          <span className="user-badge">👤 {user.email}</span>
          <button className="btn btn-outline btn-sm" onClick={enableNotifications}>
            🔔 Notifications ({notifStatus})
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => auth.signOut()}>
            Sign out
          </button>
        </div>
      </header>

      {/* SECTION 1: MY RESERVATIONS */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">📋 My Reservations</h2>
        </div>

        {/* Ready for Pickup Alert Card */}
        {pickupBookings.map((b) => (
          <div key={b.id} className="pickup-card">
            <div className="pickup-info">
              <h4>🧺 Laundry Ready for Pickup: {b.machineId}</h4>
              <p>Your wash cycle has finished! Please collect your laundry promptly to free up the machine.</p>
            </div>
            <button
              className="btn btn-success"
              disabled={actionLoading?.id === b.id}
              onClick={() => markCollected(b.id, b.machineId)}
            >
              {actionLoading?.id === b.id ? 'Updating...' : "✓ I've Collected"}
            </button>
          </div>
        ))}

        {/* Active Wash Countdown Card */}
        {activeBooking && activeCountdown && (
          <div className={`active-wash-card ${activeCountdown.isPaused ? 'paused' : 'running'}`}>
            <div className="active-card-top">
              <div className="active-machine-id">Active Wash: {activeBooking.machineId}</div>
              <span className="status-pill" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)' }}>
                {activeCountdown.isPaused ? 'Power Cut (Paused)' : 'In Progress'}
              </span>
            </div>

            <div className="countdown-digits">
              {activeCountdown.text}
            </div>

            {activeCountdown.isPaused && (
              <div className="pause-banner">
                <span>⏸</span> Power lost on machine. Cycle is paused and will automatically resume once power returns.
              </div>
            )}

            {activeBooking.shifted && (
              <div>
                <span className="shifted-badge">⚡ Completion time shifted due to power cut recovery</span>
              </div>
            )}

            {activeBooking.expectedEndAt && (
              <div className="active-card-meta">
                Expected Completion:{' '}
                <strong>
                  {new Date(
                    activeBooking.expectedEndAt.toMillis
                      ? activeBooking.expectedEndAt.toMillis()
                      : activeBooking.expectedEndAt.seconds * 1000
                  ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </strong>
              </div>
            )}

            <div className="active-card-actions">
              <button
                className="btn btn-danger btn-sm"
                disabled={actionLoading?.id === activeBooking.id}
                onClick={() => cancelBooking(activeBooking.id, activeBooking.machineId)}
              >
                {actionLoading?.id === activeBooking.id ? 'Cancelling...' : 'Cancel Reservation'}
              </button>
            </div>
          </div>
        )}

        {/* Queued Reservations List */}
        {queuedBookings.length > 0 && (
          <div>
            <h3 style={{ fontSize: 16, margin: '16px 0 12px 0', color: 'var(--text-main)', fontWeight: 600 }}>
              Queued Reservations ({queuedBookings.length})
            </h3>
            <div className="queued-grid">
              {queuedBookings.map((b) => (
                <div key={b.id} className="queued-card">
                  <div className="queued-card-header">
                    <strong style={{ fontSize: 16 }}>{b.machineId}</strong>
                    <span className="queue-pos-badge">Queue #{b.queuePosition || 1}</span>
                  </div>
                  <div className="queued-time">
                    {b.estimatedStartAt ? (
                      <>
                        Est. Start:{' '}
                        <strong>
                          {new Date(
                            b.estimatedStartAt.toMillis
                              ? b.estimatedStartAt.toMillis()
                              : b.estimatedStartAt.seconds * 1000
                          ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </strong>
                      </>
                    ) : (
                      'Awaiting machine availability'
                    )}
                  </div>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                    disabled={actionLoading?.id === b.id}
                    onClick={() => cancelBooking(b.id, b.machineId)}
                  >
                    {actionLoading?.id === b.id ? 'Cancelling...' : 'Cancel Queue Slot'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state when no active or queued bookings */}
        {!activeBooking && queuedBookings.length === 0 && pickupBookings.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '8px 0 20px 0' }}>
            You have no active or queued reservations. Book an available machine below!
          </p>
        )}
      </section>

      {/* SECTION 2: MACHINE STATUS & BOOKING */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">⚡ Machine Status & Availability</h2>
        </div>

        {machines.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No machines reporting yet. Run simulation to start telemetry.</p>
        )}

        <div className="machine-grid">
          {machines.map((m) => {
            const waitInfo = getMachineWaitInfo(m, now);
            const isOffline = m.status === 'offline';
            const isBookingThis = actionLoading?.type === 'book' && actionLoading?.id === m.id;

            return (
              <div key={m.id} className="machine-card">
                <div>
                  <div className="machine-card-top">
                    <h3 className="machine-name">{m.id}</h3>
                    <span className={`status-pill ${m.status || 'offline'}`}>
                      {m.status || 'unknown'}
                    </span>
                  </div>

                  <div className="machine-wait-box">
                    <div className="wait-label">Wait Estimate</div>
                    <div className={`wait-value ${waitInfo.badgeClass}`}>
                      {waitInfo.text}
                    </div>
                  </div>
                </div>

                <button
                  className={`btn ${waitInfo.isAvailable ? 'btn-success' : isOffline ? 'btn-outline' : 'btn-primary'}`}
                  style={{ width: '100%', marginTop: 8 }}
                  disabled={isBookingThis}
                  onClick={() => bookMachine(m.id)}
                >
                  {isBookingThis
                    ? 'Booking...'
                    : waitInfo.isAvailable
                    ? 'Book My Slot'
                    : isOffline
                    ? 'Book Slot (Queue while Offline)'
                    : 'Book Slot (Join Queue)'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: BOOKING HISTORY */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">📜 Booking History</h2>
          <div className="filter-pills">
            <button
              className={`filter-pill ${historyFilter === 'all' ? 'active' : ''}`}
              onClick={() => setHistoryFilter('all')}
            >
              All ({bookings.length})
            </button>
            <button
              className={`filter-pill ${historyFilter === 'active_queued' ? 'active' : ''}`}
              onClick={() => setHistoryFilter('active_queued')}
            >
              Active & Queued ({(activeBooking ? 1 : 0) + queuedBookings.length})
            </button>
            <button
              className={`filter-pill ${historyFilter === 'past' ? 'active' : ''}`}
              onClick={() => setHistoryFilter('past')}
            >
              Past / Completed ({historyBookings.length})
            </button>
          </div>
        </div>

        {displayedBookings.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {historyFilter === 'past'
              ? 'No completed or collected bookings yet.'
              : 'No bookings found in this view.'}
          </p>
        ) : (
          <div className="table-responsive">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Machine</th>
                  <th>Status</th>
                  <th>Timing / Schedule</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedBookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <strong>{b.machineId}</strong>
                    </td>
                    <td>
                      <span className={`status-pill ${b.status}`}>
                        {b.status}
                      </span>
                      {b.shifted && (
                        <span style={{ marginLeft: 6, fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>
                          shifted
                        </span>
                      )}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13 }}>
                      {formatSchedule(b, now)}
                    </td>
                    <td>
                      {b.status === 'done' ? (
                        <button
                          className="btn btn-success btn-sm"
                          disabled={actionLoading?.id === b.id}
                          onClick={() => markCollected(b.id, b.machineId)}
                        >
                          {actionLoading?.id === b.id ? 'Saving...' : "✓ I've Collected"}
                        </button>
                      ) : b.status === 'active' || b.status === 'queued' ? (
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                          disabled={actionLoading?.id === b.id}
                          onClick={() => cancelBooking(b.id, b.machineId)}
                        >
                          {actionLoading?.id === b.id ? '...' : 'Cancel'}
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default Dashboard;