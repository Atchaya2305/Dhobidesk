import { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import SummaryCards from './components/SummaryCards';
import MachineCard from './components/MachineCard';
import BookingModal from './components/BookingModal';
import BookingsView from './components/BookingsView';
import FaultsView from './components/FaultsView';
import NotificationsView from './components/NotificationsView';
import ProfileView from './components/ProfileView';
import ApprovalsView from './components/ApprovalsView';
import AdminModal from './components/AdminModal';

import { 
  loadStoredMachines, 
  saveStoredMachines, 
  loadStoredBookings, 
  saveStoredBookings, 
  loadStoredFaults,
  saveStoredFaults,
  loadStoredNotifications, 
  saveStoredNotifications,
  INITIAL_MACHINES,
  INITIAL_BOOKINGS,
  INITIAL_FAULTS,
  INITIAL_NOTIFICATIONS
} from './data/mockData';

import { 
  Layers, 
  Filter, 
  Search, 
  Sparkles, 
  PlusCircle, 
  CalendarClock, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';

export default function Dashboard({ 
  user, 
  onLogout, 
  onUpdateUser,
  pendingUsers = [],
  registeredUsers = [],
  onApproveStudent,
  onRejectStudent
}) {
  const isAdmin = user?.role === 'admin';

  // Navigation State: 'dashboard' | 'machines' | 'faults' | 'bookings' | 'notifications' | 'profile'
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Core Data States with localStorage initial loading
  const [machines, setMachines] = useState(() => loadStoredMachines());
  const [bookings, setBookings] = useState(() => loadStoredBookings());
  const [faults, setFaults] = useState(() => loadStoredFaults());
  const [notifications, setNotifications] = useState(() => loadStoredNotifications());

  // Filter States for Machines Grid
  const [selectedFloor, setSelectedFloor] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedMachineForBooking, setSelectedMachineForBooking] = useState(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Sync to localStorage whenever states change
  useEffect(() => {
    saveStoredMachines(machines);
  }, [machines]);

  useEffect(() => {
    saveStoredBookings(bookings);
  }, [bookings]);

  useEffect(() => {
    saveStoredFaults(faults);
  }, [faults]);

  useEffect(() => {
    saveStoredNotifications(notifications);
  }, [notifications]);

  // Unread notifications & active user bookings counts
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const activeBookingsCount = useMemo(() => {
    if (isAdmin) {
      return bookings.filter((b) => b.status === 'active' || b.status === 'upcoming').length;
    }
    return bookings.filter(
      (b) => b.userId === user?.uid && (b.status === 'active' || b.status === 'upcoming')
    ).length;
  }, [bookings, user?.uid, isAdmin]);

  const activeFaultsCount = useMemo(() => {
    return faults.filter((f) => f.status !== 'resolved').length;
  }, [faults]);

  const pendingApprovalsCount = useMemo(() => {
    return pendingUsers.filter((u) => u.status === 'pending').length;
  }, [pendingUsers]);

  // =========================================================
  // REAL-TIME SIMULATED IOT TELEMETRY TICKER (1-second interval)
  // =========================================================
  useEffect(() => {
    const timer = setInterval(() => {
      setMachines((prevMachines) => {
        let hasChanges = false;
        const updated = prevMachines.map((m) => {
          if (m.status === 'WASHING') {
            hasChanges = true;
            const newRem = Math.max(0, (m.remainingSeconds || 1200) - 1);
            const totalDurationSec = (m.cycleDurationMinutes || 35) * 60;
            const newProgress = Math.min(99, Math.round(((totalDurationSec - newRem) / totalDurationSec) * 100));

            // Realistic sensor telemetry jitter
            const rpmJitter = 760 + Math.floor(Math.sin(Date.now() / 1000) * 25);
            const vibJitter = +(0.18 + Math.random() * 0.06).toFixed(2);

            // Phase shift: If less than 5 mins (300 sec) left, shift to SPINNING phase
            if (newRem <= 300 && newRem > 0) {
              addNotification({
                title: `${m.name} Phase Shift ⚡`,
                message: `${m.name} (${m.floor}) has transitioned to the SPINNING phase (high-speed extraction).`,
                type: 'info',
                machineId: m.id,
              });

              return {
                ...m,
                status: 'SPINNING',
                remainingSeconds: newRem,
                progress: newProgress,
                waterLevel: 15,
                rpm: 1200,
                vibration: 0.42,
              };
            }

            return {
              ...m,
              remainingSeconds: newRem,
              progress: newProgress,
              rpm: rpmJitter,
              vibration: vibJitter,
              waterLevel: m.waterLevel || 72,
            };
          }

          if (m.status === 'SPINNING') {
            hasChanges = true;
            const newRem = Math.max(0, (m.remainingSeconds || 300) - 1);
            const totalDurationSec = (m.cycleDurationMinutes || 35) * 60;
            const newProgress = Math.min(100, Math.round(((totalDurationSec - newRem) / totalDurationSec) * 100));

            // Spin telemetry
            const rpmJitter = 1200 + Math.floor(Math.sin(Date.now() / 800) * 50);
            const vibJitter = +(0.38 + Math.random() * 0.08).toFixed(2);

            // Cycle Completed!
            if (newRem <= 0) {
              addNotification({
                title: `Laundry Ready! 🎉 (${m.name})`,
                message: `${m.name} on ${m.floor} has completed its wash cycle. Please collect clothes within 15 minutes.`,
                type: 'success',
                machineId: m.id,
              });

              // Mark active booking for this machine as completed
              setBookings((prevBookings) =>
                prevBookings.map((b) =>
                  b.machineId === m.id && b.status === 'active'
                    ? { ...b, status: 'completed', completedAt: 'Just now' }
                    : b
                )
              );

              return {
                ...m,
                status: 'COMPLETED',
                progress: 100,
                remainingSeconds: 0,
                waterLevel: 0,
                rpm: 0,
                vibration: 0.01,
              };
            }

            return {
              ...m,
              remainingSeconds: newRem,
              progress: newProgress,
              rpm: rpmJitter,
              vibration: vibJitter,
              waterLevel: Math.max(0, (m.waterLevel || 15) - 0.05),
            };
          }

          return m;
        });

        return hasChanges ? updated : prevMachines;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Helper to add notifications
  const addNotification = (notif) => {
    const newNotif = {
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      title: notif.title,
      message: notif.message,
      timestamp: 'Just now',
      type: notif.type || 'info',
      read: false,
      machineId: notif.machineId || null,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // =========================================================
  // BOOKING & TOKEN HANDLERS
  // =========================================================
  const handleOpenBookingModal = (machine = null) => {
    setSelectedMachineForBooking(machine);
    setIsBookingModalOpen(true);
  };

  const handleConfirmBooking = (newBooking) => {
    setBookings((prev) => [newBooking, ...prev]);

    // Dispatch booking confirmed notification
    addNotification({
      title: 'Slot Reserved Confirmed 🗓️',
      message: `${newBooking.machineName} (${newBooking.floor}) reserved for ${newBooking.date} at ${newBooking.slotTime}.`,
      type: 'info',
      machineId: newBooking.machineId,
    });
  };

  // CANCELLATION HANDLER: Supports student self-cancellation AND Admin force revocation
  const handleCancelBooking = (bookingId, reason = 'Cancelled by student') => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? { ...b, status: 'cancelled', cancelReason: reason }
          : b
      )
    );

    // Free the machine if it was in cycle or reserved
    setMachines((prev) =>
      prev.map((m) => {
        if (m.id === booking.machineId && (m.currentUserId === booking.userId || isAdmin)) {
          return {
            ...m,
            status: 'IDLE',
            progress: 0,
            remainingSeconds: 0,
            waterLevel: 0,
            rpm: 0,
            vibration: 0.01,
            currentUserId: null,
            currentUser: null,
            currentRoom: null,
            cycleType: null,
          };
        }
        return m;
      })
    );

    if (isAdmin) {
      addNotification({
        title: `Hostel Token #${booking.tokenNumber || booking.id.toUpperCase()} Revoked ✕`,
        message: `Reservation for ${booking.userName} (${booking.roomNumber}) on ${booking.machineName} was revoked by Admin. Reason: ${reason}. Slot freed.`,
        type: 'alert',
        machineId: booking.machineId,
      });
    } else {
      addNotification({
        title: 'Booking Cancelled ✕',
        message: `Your reservation on ${booking.machineName} for ${booking.slotTime} was cancelled and slot released.`,
        type: 'warning',
        machineId: booking.machineId,
      });
    }
  };

  const handleCollectLaundry = (machine) => {
    setMachines((prev) =>
      prev.map((m) => {
        if (m.id === machine.id) {
          return {
            ...m,
            status: 'IDLE',
            progress: 0,
            remainingSeconds: 0,
            waterLevel: 0,
            rpm: 0,
            vibration: 0.01,
            currentUserId: null,
            currentUser: null,
            currentRoom: null,
            cycleType: null,
          };
        }
        return m;
      })
    );

    addNotification({
      title: 'Laundry Collected ✓',
      message: `Clean laundry collected from ${machine.name} (${machine.floor}). Machine is now available for other students.`,
      type: 'success',
      machineId: machine.id,
    });
  };

  // =========================================================
  // FAULT RESOLUTION & REPAIR HANDLERS
  // =========================================================
  const handleResolveFault = (faultId, machineId) => {
    setFaults((prev) =>
      prev.map((f) => (f.id === faultId ? { ...f, status: 'resolved' } : f))
    );

    setMachines((prev) =>
      prev.map((m) => {
        if (m.id === machineId) {
          return {
            ...m,
            status: 'IDLE',
            fault: null,
            offlineReason: null,
          };
        }
        return m;
      })
    );

    addNotification({
      title: 'Machine Restored to Fleet ✓',
      message: `Hardware fault was resolved by Facility Maintenance. Machine is back online and available for bookings.`,
      type: 'success',
      machineId,
    });
  };

  // =========================================================
  // ADMIN OVERRIDE HANDLERS
  // =========================================================
  const handleUpdateMachineStatus = (machineId, newStatus) => {
    setMachines((prev) =>
      prev.map((m) => {
        if (m.id === machineId) {
          let remSec = 0;
          let prog = 0;
          let wLvl = 0;
          let r = 0;
          let vib = 0.01;

          if (newStatus === 'WASHING') {
            remSec = (m.cycleDurationMinutes || 35) * 60;
            prog = 10;
            wLvl = 70;
            r = 750;
            vib = 0.22;
          } else if (newStatus === 'SPINNING') {
            remSec = 300;
            prog = 80;
            wLvl = 15;
            r = 1250;
            vib = 0.44;
          } else if (newStatus === 'COMPLETED') {
            prog = 100;
          }

          return {
            ...m,
            status: newStatus,
            remainingSeconds: remSec,
            progress: prog,
            waterLevel: wLvl,
            rpm: r,
            vibration: vib,
            currentUserId: newStatus === 'IDLE' ? null : m.currentUserId,
            currentUser: newStatus === 'IDLE' ? null : m.currentUser,
            currentRoom: newStatus === 'IDLE' ? null : m.currentRoom,
          };
        }
        return m;
      })
    );

    addNotification({
      title: 'Admin Override Applied ⚙️',
      message: `Machine status manually changed to ${newStatus} by Facility Administration.`,
      type: 'warning',
      machineId,
    });
  };

  const handleAdminRevokeActiveCycle = (machineId) => {
    const targetMachine = machines.find((m) => m.id === machineId);
    if (!targetMachine) return;

    if (window.confirm(`Force stop active laundry cycle on ${targetMachine.name}? This will drain the drum and reset the washer to IDLE.`)) {
      setMachines((prev) =>
        prev.map((m) => {
          if (m.id === machineId) {
            return {
              ...m,
              status: 'IDLE',
              progress: 0,
              remainingSeconds: 0,
              waterLevel: 0,
              rpm: 0,
              vibration: 0.01,
              currentUserId: null,
              currentUser: null,
              currentRoom: null,
              cycleType: null,
            };
          }
          return m;
        })
      );

      // Cancel active booking
      setBookings((prev) =>
        prev.map((b) =>
          b.machineId === machineId && b.status === 'active'
            ? { ...b, status: 'cancelled', cancelReason: 'Revoked by Administration' }
            : b
        )
      );

      addNotification({
        title: `Active Cycle Cancelled by Admin ⚡ (${targetMachine.name})`,
        message: `Cycle on ${targetMachine.name} was aborted and slot cleared by Warden.`,
        type: 'alert',
        machineId,
      });
    }
  };

  const handleResetAllMachines = () => {
    setMachines((prev) =>
      prev.map((m) => ({
        ...m,
        status: 'IDLE',
        progress: 0,
        remainingSeconds: 0,
        waterLevel: 0,
        rpm: 0,
        vibration: 0.01,
        currentUserId: null,
        currentUser: null,
        currentRoom: null,
        cycleType: null,
      }))
    );

    addNotification({
      title: 'Fleet Reset Executed 🔄',
      message: 'All 6 washing machines were reset to IDLE by Facility Admin.',
      type: 'info',
    });
  };

  // Notification actions
  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleMarkOneRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleClearAllNotifs = () => {
    setNotifications([]);
  };

  // =========================================================
  // FILTERED MACHINES LIST
  // =========================================================
  const filteredMachines = useMemo(() => {
    return machines.filter((m) => {
      // Floor filter
      if (selectedFloor !== 'All' && m.floor !== selectedFloor) return false;

      // Status filter
      if (selectedStatus !== 'All' && m.status !== selectedStatus) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = m.name.toLowerCase().includes(query);
        const matchesNum = m.machineNumber.includes(query);
        const matchesFloor = m.floor.toLowerCase().includes(query);
        const matchesType = m.type.toLowerCase().includes(query);
        const matchesUser = m.currentUser && m.currentUser.toLowerCase().includes(query);
        const matchesRoom = m.currentRoom && m.currentRoom.toLowerCase().includes(query);
        return matchesName || matchesNum || matchesFloor || matchesType || matchesUser || matchesRoom;
      }

      return true;
    });
  }, [machines, selectedFloor, selectedStatus, searchQuery]);

  // Dynamic Section Title
  const getSectionTitle = () => {
    switch (activeSection) {
      case 'machines': return 'Campus Washer Fleet Directory';
      case 'approvals': return 'Student Registration Approvals & Directory';
      case 'faults': return 'Machine Faults & Sensor Anomaly Center';
      case 'bookings': return isAdmin ? 'Hostel Tokens & Reservation Console' : 'My Reserved Laundry Slots';
      case 'notifications': return 'System Alerts & IoT Notifications';
      case 'profile': return isAdmin ? 'Hostel Administration Settings' : 'Student Profile & Washing Quota';
      default: return isAdmin ? 'Hostel Laundry Administration Console' : 'Campus Laundry Operations Hub';
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        unreadCount={unreadCount}
        activeBookingsCount={activeBookingsCount}
        activeFaultsCount={activeFaultsCount}
        pendingApprovalsCount={pendingApprovalsCount}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        user={user}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <div className="main-content-wrapper">
        {/* Top Navbar */}
        <Navbar
          user={user}
          onLogout={onLogout}
          unreadCount={unreadCount}
          notifications={notifications}
          onMarkAllNotifsRead={handleMarkAllRead}
          onOpenBookingModal={() => handleOpenBookingModal()}
          onOpenNotifsPage={() => setActiveSection('notifications')}
          setIsMobileOpen={setIsMobileOpen}
          activeSectionTitle={getSectionTitle()}
        />

        {/* Viewport Content */}
        <main className="content-viewport">
          {/* Admin Banner if logged in as Admin */}
          {isAdmin && (
            <div className="admin-status-banner" style={{ background: 'var(--gold-cream)', border: '1px solid var(--primary-border)', color: 'var(--gold-dim)', marginBottom: 20 }}>
              <ShieldAlert size={16} />
              <span>
                <strong>Administrator Mode Active:</strong> You have full privileges to monitor machine sensor telemetry, revoke any student's token, and resolve hardware faults.
              </span>
            </div>
          )}

          {/* SECTION 1: DASHBOARD & FLEET OVERVIEW */}
          {(activeSection === 'dashboard' || activeSection === 'machines') && (
            <>
              {/* Summary KPI Cards (Total, Available, Washing, Completed) */}
              <SummaryCards machines={machines} bookings={bookings} />

              {/* Washing Machines Section Header with Filters */}
              <div className="machines-grid-header">
                <div className="machines-grid-title">
                  <h2>{isAdmin ? 'Fleet Operations & Telemetry Status' : 'Campus Washing Machines Fleet'}</h2>
                  <p>
                    {isAdmin 
                      ? 'Inspect live sensor streams (RPM, Vibration, Temp, Water) and manage machine states'
                      : 'Check real-time machine availability, cycle countdowns, and book your slot'}
                  </p>
                </div>

                <div className="filters-bar-wrapper">
                  {/* Floor Filters */}
                  <div className="filter-pills-group">
                    {['All', 'Floor 1', 'Floor 2', 'Floor 3'].map((f) => (
                      <button
                        key={f}
                        type="button"
                        className={`filter-pill-btn ${selectedFloor === f ? 'active' : ''}`}
                        onClick={() => setSelectedFloor(f)}
                      >
                        {f}
                      </button>
                    ))}
                  </div>

                  {/* Status Filters */}
                  <div className="filter-pills-group">
                    {[
                      { key: 'All', label: 'All Status' },
                      { key: 'IDLE', label: 'Available' },
                      { key: 'WASHING', label: 'Washing' },
                      { key: 'SPINNING', label: 'Spinning' },
                      { key: 'COMPLETED', label: 'Ready' },
                      { key: 'OFFLINE', label: 'Offline' },
                    ].map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        className={`filter-pill-btn ${selectedStatus === s.key ? 'active' : ''}`}
                        onClick={() => setSelectedStatus(s.key)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  {/* Search Bar */}
                  <div className="search-box-field">
                    <Search size={15} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search washer, floor, room..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="search-input"
                    />
                  </div>
                </div>
              </div>

              {/* Responsive 6 Machines Grid */}
              {filteredMachines.length === 0 ? (
                <div className="empty-state-card">
                  <Layers size={40} className="empty-icon" />
                  <h3>No washing machines match your filter</h3>
                  <p>Try resetting the floor or status filter to see all campus units.</p>
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => { setSelectedFloor('All'); setSelectedStatus('All'); setSearchQuery(''); }}
                    style={{ marginTop: 14 }}
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                <div className="washing-machines-grid">
                  {filteredMachines.map((machine) => (
                    <MachineCard
                      key={machine.id}
                      machine={machine}
                      onBookClick={handleOpenBookingModal}
                      onCollectClick={handleCollectLaundry}
                      currentUserId={user?.uid}
                      isAdmin={isAdmin}
                      onAdminStatusOverride={handleUpdateMachineStatus}
                      onAdminRevokeActiveCycle={handleAdminRevokeActiveCycle}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* SECTION: STUDENT APPROVALS VIEW (ADMIN ONLY) */}
          {activeSection === 'approvals' && isAdmin && (
            <ApprovalsView
              pendingUsers={pendingUsers}
              registeredUsers={registeredUsers}
              onApproveStudent={onApproveStudent}
              onRejectStudent={onRejectStudent}
            />
          )}

          {/* SECTION 2: FAULTS VIEW (ADMIN ONLY) */}
          {activeSection === 'faults' && isAdmin && (
            <FaultsView
              faults={faults}
              machines={machines}
              onResolveFault={handleResolveFault}
              onUpdateMachineStatus={handleUpdateMachineStatus}
            />
          )}

          {/* SECTION 3: BOOKINGS VIEW */}
          {activeSection === 'bookings' && (
            <BookingsView
              bookings={bookings}
              machines={machines}
              currentUser={user}
              onCancelBooking={handleCancelBooking}
              onOpenBookingModal={() => handleOpenBookingModal()}
            />
          )}

          {/* SECTION 4: NOTIFICATIONS VIEW */}
          {activeSection === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              onMarkAllRead={handleMarkAllRead}
              onMarkOneRead={handleMarkOneRead}
              onClearAllNotifs={handleClearAllNotifs}
            />
          )}

          {/* SECTION 5: PROFILE VIEW */}
          {activeSection === 'profile' && (
            <ProfileView
              user={user}
              onUpdateUser={onUpdateUser}
              bookings={bookings}
            />
          )}
        </main>
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        machines={machines}
        initialMachine={selectedMachineForBooking}
        existingBookings={bookings}
        currentUser={user}
        onConfirmBooking={handleConfirmBooking}
      />

      {/* Admin Operations Modal (Passcode 1234) */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        machines={machines}
        bookings={bookings}
        onUpdateMachineStatus={handleUpdateMachineStatus}
        onForceCancelBooking={handleCancelBooking}
        onResetAllMachines={handleResetAllMachines}
      />
    </div>
  );
}