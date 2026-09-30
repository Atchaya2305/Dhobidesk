import { useState } from 'react';
import { 
  CalendarClock, 
  PlusCircle, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Layers, 
  Search, 
  Filter, 
  ShieldAlert, 
  User, 
  Phone, 
  Home, 
  AlertOctagon, 
  X,
  FileText
} from 'lucide-react';
import { TIME_SLOTS } from '../data/mockData';

export default function BookingsView({ 
  bookings = [], 
  machines = [], 
  currentUser, 
  onCancelBooking, 
  onOpenBookingModal 
}) {
  const isAdmin = currentUser?.role === 'admin';
  const [activeTab, setActiveTab] = useState(isAdmin ? 'all-tokens' : 'my-bookings');
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // State for Admin Revoke Modal
  const [revokingBooking, setRevokingBooking] = useState(null);
  const [revokeReason, setRevokeReason] = useState('Emergency Machine Maintenance');
  const [customReason, setCustomReason] = useState('');

  // Student's own active/upcoming bookings
  const myCurrentBookings = bookings.filter(
    (b) => b.userId === currentUser.uid && (b.status === 'active' || b.status === 'upcoming')
  );

  // Student's past history
  const myHistoryBookings = bookings.filter(
    (b) => b.userId === currentUser.uid && (b.status === 'completed' || b.status === 'cancelled')
  );

  // All active/upcoming bookings across hostel (for Admin)
  const allHostelBookings = bookings.filter((b) => {
    if (statusFilter !== 'All' && b.status !== statusFilter) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchName = b.userName && b.userName.toLowerCase().includes(q);
      const matchRoom = b.roomNumber && b.roomNumber.toLowerCase().includes(q);
      const matchMachine = b.machineName && b.machineName.toLowerCase().includes(q);
      const matchToken = (b.tokenNumber || b.id).toLowerCase().includes(q);
      return matchName || matchRoom || matchMachine || matchToken;
    }
    return true;
  });

  const handleStudentCancel = (bookingId) => {
    if (window.confirm('Are you sure you want to cancel your reserved laundry slot? This will immediately free the machine for other students.')) {
      onCancelBooking(bookingId, 'Cancelled by student');
    }
  };

  const handleConfirmRevoke = () => {
    if (!revokingBooking) return;
    const finalReason = revokeReason === 'Other' ? (customReason || 'Administrative cancellation') : revokeReason;
    onCancelBooking(revokingBooking.id, finalReason);
    setRevokingBooking(null);
    setCustomReason('');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="booking-status-badge status-active"><Clock size={12} /> Active In Cycle</span>;
      case 'upcoming':
        return <span className="booking-status-badge status-upcoming"><CalendarClock size={12} /> Reserved</span>;
      case 'completed':
        return <span className="booking-status-badge status-completed"><CheckCircle2 size={12} /> Completed</span>;
      case 'cancelled':
        return <span className="booking-status-badge status-cancelled"><AlertTriangle size={12} /> Cancelled</span>;
      default:
        return <span className="booking-status-badge">{status}</span>;
    }
  };

  return (
    <div className="bookings-view-container">
      {/* Top Header */}
      <div className="view-header">
        <div>
          {isAdmin && (
            <div className="admin-view-tag">
              <ShieldAlert size={14} />
              <span>ADMINISTRATIVE TOKEN ROSTER</span>
            </div>
          )}
          <h2 className="view-title">
            {isAdmin ? 'Hostel Laundry Tokens & Reservation Console' : 'My Reserved Laundry Slots'}
          </h2>
          <p className="view-subtitle">
            {isAdmin 
              ? 'Oversee all student laundry tokens, view student room details, and revoke bookings for maintenance' 
              : 'Review your upcoming slots, monitor active cycles, and manage your daily laundry tokens'}
          </p>
        </div>

        {/* Students can book a slot; Admins can too */}
        <button 
          type="button" 
          className="btn-primary"
          onClick={onOpenBookingModal}
        >
          <PlusCircle size={16} />
          <span>{isAdmin ? 'Create Manual Reservation' : 'Book New Laundry Slot'}</span>
        </button>
      </div>

      {/* Tabs Row */}
      <div className="bookings-tabs-bar">
        <div className="bookings-tabs">
          {isAdmin ? (
            <>
              <button
                type="button"
                className={`booking-tab ${activeTab === 'all-tokens' ? 'active' : ''}`}
                onClick={() => setActiveTab('all-tokens')}
              >
                <span>All Hostel Student Tokens</span>
                <span className="tab-pill">{bookings.filter(b => b.status === 'active' || b.status === 'upcoming').length}</span>
              </button>

              <button
                type="button"
                className={`booking-tab ${activeTab === 'campus-schedule' ? 'active' : ''}`}
                onClick={() => setActiveTab('campus-schedule')}
              >
                <span>Hostel Schedule Grid</span>
              </button>

              <button
                type="button"
                className={`booking-tab ${activeTab === 'audit-log' ? 'active' : ''}`}
                onClick={() => setActiveTab('audit-log')}
              >
                <span>All History & Revoked Tokens</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={`booking-tab ${activeTab === 'my-bookings' ? 'active' : ''}`}
                onClick={() => setActiveTab('my-bookings')}
              >
                <span>My Active Slots</span>
                <span className="tab-pill">{myCurrentBookings.length}</span>
              </button>

              <button
                type="button"
                className={`booking-tab ${activeTab === 'campus-schedule' ? 'active' : ''}`}
                onClick={() => setActiveTab('campus-schedule')}
              >
                <span>Hostel Schedule Grid</span>
              </button>

              <button
                type="button"
                className={`booking-tab ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                <span>My Past Laundry</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ADMIN ALL TOKENS ROSTER VIEW */}
      {isAdmin && activeTab === 'all-tokens' && (
        <div className="admin-tokens-section">
          {/* Search & Status Filters */}
          <div className="machines-grid-header">
            <div className="machines-grid-title">
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-navy)' }}>
                Active Student Tokens Across All Floors ({allHostelBookings.length})
              </h3>
            </div>

            <div className="filters-bar-wrapper">
              <div className="filter-pills-group">
                {['All', 'active', 'upcoming'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={`filter-pill-btn ${statusFilter === st ? 'active' : ''}`}
                    onClick={() => setStatusFilter(st)}
                  >
                    {st === 'All' ? 'All Active' : st.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="search-box-field">
                <Search size={15} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search student, room, token..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="search-input"
                  style={{ width: 240 }}
                />
              </div>
            </div>
          </div>

          {/* Tokens Grid / Cards for Admin */}
          {allHostelBookings.length === 0 ? (
            <div className="empty-state-card">
              <CheckCircle2 size={44} style={{ color: 'var(--status-idle)', marginBottom: 12 }} />
              <h3>No Active Tokens Found</h3>
              <p>There are currently no active reservations matching your filter.</p>
            </div>
          ) : (
            <div className="bookings-grid">
              {allHostelBookings.map((booking) => (
                <div key={booking.id} className="booking-item-card admin-token-card">
                  <div className="booking-card-top">
                    <div className="booking-machine-info">
                      <div className="booking-m-icon">
                        <Layers size={18} />
                      </div>
                      <div>
                        <strong className="booking-m-title">{booking.machineName}</strong>
                        <span className="booking-m-floor" style={{ display: 'block' }}>
                          {booking.floor} • Token #{booking.tokenNumber || booking.id.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>

                  {/* Student Credentials Pill */}
                  <div className="student-profile-strip">
                    <div className="student-info-col">
                      <div className="student-field">
                        <User size={13} className="strip-icon" />
                        <span className="student-label">Student:</span>
                        <strong className="student-val">{booking.userName || 'Student'}</strong>
                      </div>
                      <div className="student-field">
                        <Home size={13} className="strip-icon" />
                        <span className="student-label">Room:</span>
                        <span className="student-room-pill">{booking.roomNumber || 'Room N/A'}</span>
                      </div>
                    </div>
                    <div className="student-info-col">
                      <div className="student-field">
                        <Phone size={13} className="strip-icon" />
                        <span className="student-label">Phone:</span>
                        <span className="student-val">{booking.phone || '9876543210'}</span>
                      </div>
                      <div className="student-field">
                        <Clock size={13} className="strip-icon" />
                        <span className="student-label">Reserved:</span>
                        <span className="student-val">{booking.bookedAt || 'Today'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Booking parameters */}
                  <div className="booking-details-grid">
                    <div className="b-detail-item">
                      <span className="b-label">Time Slot</span>
                      <strong className="b-val" style={{ fontFamily: 'var(--font-mono)' }}>
                        {booking.slotTime}
                      </strong>
                    </div>
                    <div className="b-detail-item">
                      <span className="b-label">Cycle Program</span>
                      <strong className="b-val">{booking.cycleType}</strong>
                    </div>
                  </div>

                  {/* Admin Force Cancel Action Bar */}
                  <div className="booking-card-actions">
                    <span className="b-timestamp">Hostel Token Status: Verified</span>
                    <button
                      type="button"
                      className="btn-revoke-token"
                      onClick={() => setRevokingBooking(booking)}
                    >
                      <Trash2 size={14} />
                      <span>Revoke / Cancel Token</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STUDENT MY ACTIVE BOOKINGS TAB */}
      {!isAdmin && activeTab === 'my-bookings' && (
        <div className="student-tokens-section">
          {myCurrentBookings.length === 0 ? (
            <div className="empty-state-card">
              <CalendarClock size={44} className="empty-icon" />
              <h3>No Active Laundry Bookings</h3>
              <p>You have not reserved any laundry slots for today. Reserve an available machine to get started!</p>
              <button 
                type="button" 
                className="btn-primary"
                onClick={onOpenBookingModal}
                style={{ marginTop: 14 }}
              >
                <PlusCircle size={16} />
                <span>Book a Washer Slot</span>
              </button>
            </div>
          ) : (
            <div className="bookings-grid">
              {myCurrentBookings.map((booking) => (
                <div key={booking.id} className="booking-item-card">
                  <div className="booking-card-top">
                    <div className="booking-machine-info">
                      <div className="booking-m-icon">
                        <Layers size={18} />
                      </div>
                      <div>
                        <strong className="booking-m-title">{booking.machineName}</strong>
                        <span className="booking-m-floor" style={{ display: 'block' }}>
                          {booking.floor} • Token #{booking.tokenNumber || booking.id.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>

                  <div className="booking-details-grid">
                    <div className="b-detail-item">
                      <span className="b-label">Time Window</span>
                      <strong className="b-val" style={{ fontFamily: 'var(--font-mono)' }}>
                        {booking.slotTime}
                      </strong>
                    </div>
                    <div className="b-detail-item">
                      <span className="b-label">Date</span>
                      <strong className="b-val">{booking.date}</strong>
                    </div>
                    <div className="b-detail-item">
                      <span className="b-label">Cycle Program</span>
                      <strong className="b-val">{booking.cycleType}</strong>
                    </div>
                    <div className="b-detail-item">
                      <span className="b-label">Room Number</span>
                      <strong className="b-val">{booking.roomNumber}</strong>
                    </div>
                  </div>

                  <div className="booking-card-actions">
                    <span className="b-timestamp">Booked {booking.bookedAt}</span>
                    <button
                      type="button"
                      className="btn-cancel-booking"
                      onClick={() => handleStudentCancel(booking.id)}
                    >
                      <Trash2 size={14} />
                      <span>Cancel Reservation</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* HOSTEL SCHEDULE GRID TAB */}
      {activeTab === 'campus-schedule' && (
        <div className="schedule-matrix-card">
          <div className="schedule-matrix-header">
            <h3>Today's Hostel Washer Timetable Matrix</h3>
            <p>Visual hour-by-hour schedule grid across all 6 machines in the hostel</p>
          </div>

          <div className="table-responsive">
            <table className="schedule-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 160, textAlign: 'left' }}>Time Slot</th>
                  {machines.map((m) => (
                    <th key={m.id}>
                      <div className="th-machine">
                        <span className="th-m-name">{m.name}</span>
                        <span className="th-m-meta">{m.floor}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((slot) => (
                  <tr key={slot}>
                    <td className="slot-col">
                      <Clock size={13} className="inline-clock" />
                      <span>{slot}</span>
                    </td>
                    {machines.map((m) => {
                      const booking = bookings.find(
                        (b) => b.machineId === m.id && b.slotTime === slot && b.status !== 'cancelled'
                      );
                      const isOffline = m.status === 'OFFLINE';

                      if (isOffline) {
                        return (
                          <td key={m.id}>
                            <span className="matrix-badge offline">Maintenance</span>
                          </td>
                        );
                      }

                      if (booking) {
                        const isMine = booking.userId === currentUser.uid;
                        return (
                          <td key={m.id}>
                            <span className={`matrix-badge ${isMine ? 'mine' : 'booked'}`}>
                              {isMine ? 'Your Slot' : isAdmin ? `${booking.userName} (${booking.roomNumber})` : 'Reserved'}
                            </span>
                          </td>
                        );
                      }

                      return (
                        <td key={m.id}>
                          <button
                            type="button"
                            className="matrix-free-btn"
                            onClick={() => onOpenBookingModal()}
                          >
                            + Free
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HISTORY / AUDIT LOG TAB */}
      {(activeTab === 'history' || activeTab === 'audit-log') && (
        <div className="history-section">
          {(!isAdmin ? myHistoryBookings : bookings.filter(b => b.status === 'completed' || b.status === 'cancelled')).length === 0 ? (
            <div className="empty-state-card">
              <FileText size={44} className="empty-icon" />
              <h3>No Past Laundry Records</h3>
              <p>Completed cycles and cancellation logs will appear here.</p>
            </div>
          ) : (
            <div className="bookings-grid">
              {(!isAdmin ? myHistoryBookings : bookings.filter(b => b.status === 'completed' || b.status === 'cancelled')).map((booking) => (
                <div key={booking.id} className="booking-item-card history-card">
                  <div className="booking-card-top">
                    <div className="booking-machine-info">
                      <div className="booking-m-icon">
                        <Layers size={18} />
                      </div>
                      <div>
                        <strong className="booking-m-title">{booking.machineName}</strong>
                        <span className="booking-m-floor" style={{ display: 'block' }}>
                          {booking.floor} • Token #{booking.tokenNumber || booking.id.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>

                  <div className="booking-details-grid">
                    <div className="b-detail-item">
                      <span className="b-label">Student</span>
                      <strong className="b-val">{booking.userName} ({booking.roomNumber})</strong>
                    </div>
                    <div className="b-detail-item">
                      <span className="b-label">Slot Time</span>
                      <strong className="b-val" style={{ fontFamily: 'var(--font-mono)' }}>
                        {booking.slotTime}
                      </strong>
                    </div>
                    <div className="b-detail-item">
                      <span className="b-label">Cycle Program</span>
                      <strong className="b-val">{booking.cycleType}</strong>
                    </div>
                    <div className="b-detail-item">
                      <span className="b-label">Outcome</span>
                      <strong className="b-val">
                        {booking.status === 'completed' 
                          ? `Finished at ${booking.completedAt || 'Scheduled time'}` 
                          : `Cancelled: ${booking.cancelReason || 'By user'}`}
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ADMIN REVOKE TOKEN CONFIRMATION MODAL */}
      {revokingBooking && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div className="modal-title-group">
                <div className="modal-icon-badge" style={{ background: '#FEE2E2', color: '#B91C1C', borderColor: '#FECACA' }}>
                  <AlertOctagon size={20} />
                </div>
                <div>
                  <h3 className="modal-title" style={{ fontSize: '18px' }}>Revoke Student Laundry Token</h3>
                  <p className="modal-subtitle">Administrator Force Cancellation</p>
                </div>
              </div>
              <button 
                type="button" 
                className="modal-close-btn"
                onClick={() => setRevokingBooking(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-form">
              {/* Target booking summary */}
              <div className="booking-summary-box" style={{ background: 'var(--bg-subtle)' }}>
                <div className="summary-row">
                  <span className="summary-label">Target Token:</span>
                  <strong className="summary-value" style={{ fontFamily: 'var(--font-mono)' }}>
                    #{revokingBooking.tokenNumber || revokingBooking.id.toUpperCase()}
                  </strong>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Student Name:</span>
                  <strong className="summary-value">{revokingBooking.userName} ({revokingBooking.roomNumber})</strong>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Machine & Slot:</span>
                  <strong className="summary-value">{revokingBooking.machineName} • {revokingBooking.slotTime}</strong>
                </div>
              </div>

              {/* Cancellation Reason Selector */}
              <div className="form-section">
                <label className="form-label">Reason for Administrative Cancellation</label>
                <select
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  className="custom-select"
                >
                  <option value="Emergency Machine Maintenance">Emergency Machine Maintenance</option>
                  <option value="Hostel Water Supply Disruption">Hostel Water Supply Disruption</option>
                  <option value="Student Unreported No-Show">Student Unreported No-Show</option>
                  <option value="Electrical Power Grid Load Shedding">Electrical Power Grid Load Shedding</option>
                  <option value="Administrative Fleet Reallocation">Administrative Fleet Reallocation</option>
                  <option value="Other">Other Specific Reason</option>
                </select>
              </div>

              {revokeReason === 'Other' && (
                <div className="form-section">
                  <label className="form-label">Specify Reason</label>
                  <input
                    type="text"
                    placeholder="Enter reason for student notification..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="custom-select"
                  />
                </div>
              )}

              <div className="form-error-banner" style={{ background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A' }}>
                <AlertTriangle size={16} />
                <span>
                  This slot will be immediately released back to the fleet and an automated cancellation alert will be dispatched to {revokingBooking.userName}.
                </span>
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '16px 24px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setRevokingBooking(null)}
              >
                Keep Token Active
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ background: '#B91C1C', borderColor: '#B91C1C' }}
                onClick={handleConfirmRevoke}
              >
                <AlertOctagon size={16} />
                <span>Confirm Revoke & Free Slot</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
