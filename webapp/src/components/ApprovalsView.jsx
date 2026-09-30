import { useState } from 'react';
import { 
  UserCheck, 
  UserX, 
  Clock, 
  ShieldCheck, 
  Search, 
  Mail, 
  Phone, 
  Home, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  GraduationCap, 
  Calendar,
  Building,
  UserPlus
} from 'lucide-react';

export default function ApprovalsView({ 
  pendingUsers = [], 
  registeredUsers = [], 
  onApproveStudent, 
  onRejectStudent 
}) {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'verified'
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectingStudent, setRejectingStudent] = useState(null);
  const [rejectReason, setRejectReason] = useState('Room number does not match hostel roster');
  const [customReason, setCustomReason] = useState('');

  const activePendingList = pendingUsers.filter((u) => u.status === 'pending');
  const verifiedStudents = registeredUsers.filter((u) => u.role === 'student');

  const filteredPending = activePendingList.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.roomNumber.toLowerCase().includes(q) ||
      u.hostelBlock.toLowerCase().includes(q)
    );
  });

  const filteredVerified = verifiedStudents.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.roomNumber.toLowerCase().includes(q) ||
      u.hostelBlock.toLowerCase().includes(q)
    );
  });

  const handleConfirmReject = () => {
    if (!rejectingStudent) return;
    const finalReason = rejectReason === 'Other' ? (customReason || 'Registration declined') : rejectReason;
    onRejectStudent(rejectingStudent.id, finalReason);
    setRejectingStudent(null);
    setCustomReason('');
  };

  return (
    <div className="approvals-view-container">
      {/* Header */}
      <div className="view-header">
        <div>
          <div className="admin-view-tag">
            <ShieldCheck size={14} />
            <span>WARDEN VERIFICATION CONSOLE</span>
          </div>
          <h2 className="view-title">Student Account Approvals & Roster</h2>
          <p className="view-subtitle">
            Verify student residence records before granting laundry booking permissions
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="summary-cards-grid">
        <div className="summary-kpi-card">
          <div className="summary-card-accent-bar" style={{ background: '#D97706' }} />
          <div className="summary-kpi-header">
            <span className="summary-kpi-title">Awaiting Approval</span>
            <span className="summary-status-pill badge-amber">Action Required</span>
          </div>
          <div className="summary-kpi-value-row">
            <span className="summary-kpi-number" style={{ color: '#D97706' }}>
              {activePendingList.length}
            </span>
            <span className="summary-kpi-unit">student(s)</span>
          </div>
          <div className="summary-kpi-footer">
            <span className="summary-kpi-detail">Pending room number confirmation</span>
          </div>
        </div>

        <div className="summary-kpi-card">
          <div className="summary-card-accent-bar accent-emerald" />
          <div className="summary-kpi-header">
            <span className="summary-kpi-title">Verified Students</span>
            <span className="summary-status-pill badge-emerald">Authorized</span>
          </div>
          <div className="summary-kpi-value-row">
            <span className="summary-kpi-number" style={{ color: '#15803D' }}>
              {verifiedStudents.length}
            </span>
            <span className="summary-kpi-unit">active residents</span>
          </div>
          <div className="summary-kpi-footer">
            <span className="summary-kpi-detail">Permitted 2 laundry slots/day</span>
          </div>
        </div>

        <div className="summary-kpi-card">
          <div className="summary-card-accent-bar accent-amber" />
          <div className="summary-kpi-header">
            <span className="summary-kpi-title">Hostel Blocks</span>
            <span className="summary-status-pill badge-amber">4 Residence Halls</span>
          </div>
          <div className="summary-kpi-value-row">
            <span className="summary-kpi-number">4</span>
            <span className="summary-kpi-unit">blocks mapped</span>
          </div>
          <div className="summary-kpi-footer">
            <span className="summary-kpi-detail">Ganga, Kaveri, Yamuna, Godavari</span>
          </div>
        </div>

        <div className="summary-kpi-card">
          <div className="summary-card-accent-bar accent-blue" />
          <div className="summary-kpi-header">
            <span className="summary-kpi-title">Access Policy</span>
            <span className="summary-status-pill badge-blue">Enforced</span>
          </div>
          <div className="summary-kpi-value-row">
            <span className="summary-kpi-number">100%</span>
            <span className="summary-kpi-unit">Warden Verified</span>
          </div>
          <div className="summary-kpi-footer">
            <span className="summary-kpi-detail">Zero unverified registrations permitted</span>
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="bookings-tabs-bar">
        <div className="bookings-tabs">
          <button
            type="button"
            className={`booking-tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            <span>Pending Authorization Requests</span>
            <span className="tab-pill">{activePendingList.length}</span>
          </button>

          <button
            type="button"
            className={`booking-tab ${activeTab === 'verified' ? 'active' : ''}`}
            onClick={() => setActiveTab('verified')}
          >
            <span>Authorized Student Directory</span>
            <span className="tab-pill">{verifiedStudents.length}</span>
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="machines-grid-header">
        <div className="machines-grid-title">
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-navy)' }}>
            {activeTab === 'pending' ? 'Pending Applications Queue' : 'Active Hostel Residents'}
          </h3>
        </div>

        <div className="search-box-field">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search student, room, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            style={{ width: 260 }}
          />
        </div>
      </div>

      {/* TAB 1: PENDING APPLICATIONS */}
      {activeTab === 'pending' && (
        <div className="pending-students-list">
          {filteredPending.length === 0 ? (
            <div className="empty-state-card">
              <CheckCircle2 size={44} style={{ color: 'var(--status-idle)', marginBottom: 12 }} />
              <h3>All Registrations Processed</h3>
              <p>There are no pending student applications awaiting approval at this moment.</p>
            </div>
          ) : (
            <div className="bookings-grid">
              {filteredPending.map((student) => (
                <div key={student.id} className="booking-item-card pending-student-card">
                  <div className="booking-card-top">
                    <div className="booking-machine-info">
                      <div className="demo-avatar" style={{ width: 42, height: 42, fontSize: '15px' }}>
                        {student.avatarInitials || student.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <strong className="booking-m-title" style={{ fontSize: '17px' }}>
                          {student.name}
                        </strong>
                        <span className="booking-m-floor" style={{ display: 'block' }}>
                          Submitted: {student.requestedAt || 'Just now'}
                        </span>
                      </div>
                    </div>
                    <span className="booking-status-badge status-upcoming" style={{ background: '#FFFBEB', color: '#B45309', borderColor: '#FDE68A' }}>
                      <Clock size={12} /> Awaiting Approval
                    </span>
                  </div>

                  {/* Student Details Strip */}
                  <div className="student-profile-strip">
                    <div className="student-info-col">
                      <div className="student-field">
                        <Mail size={13} className="strip-icon" />
                        <span className="student-label">Email:</span>
                        <strong className="student-val">{student.email}</strong>
                      </div>
                      <div className="student-field">
                        <Phone size={13} className="strip-icon" />
                        <span className="student-label">Mobile:</span>
                        <span className="student-val">{student.phone}</span>
                      </div>
                    </div>
                    <div className="student-info-col">
                      <div className="student-field">
                        <Home size={13} className="strip-icon" />
                        <span className="student-label">Room:</span>
                        <span className="student-room-pill">{student.roomNumber}</span>
                      </div>
                      <div className="student-field">
                        <Building size={13} className="strip-icon" />
                        <span className="student-label">Residence:</span>
                        <span className="student-val">{student.hostelBlock}</span>
                      </div>
                    </div>
                  </div>

                  {/* Warden Action Buttons */}
                  <div className="booking-card-actions" style={{ gap: 10 }}>
                    <button
                      type="button"
                      className="btn-outline-danger"
                      onClick={() => setRejectingStudent(student)}
                    >
                      <UserX size={15} />
                      <span>Decline Request</span>
                    </button>

                    <button
                      type="button"
                      className="btn-primary"
                      style={{ background: 'linear-gradient(135deg, #15803D, #166534)' }}
                      onClick={() => onApproveStudent(student.id)}
                    >
                      <UserCheck size={16} />
                      <span>Approve & Grant Access</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: VERIFIED STUDENTS DIRECTORY */}
      {activeTab === 'verified' && (
        <div className="verified-students-table schedule-matrix-card">
          <div className="table-responsive">
            <table className="schedule-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Student Name</th>
                  <th>Student Email</th>
                  <th>Hostel Room</th>
                  <th>Hostel Block</th>
                  <th>Contact</th>
                  <th>Daily Quota</th>
                  <th>Verification Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredVerified.map((st) => (
                  <tr key={st.uid}>
                    <td style={{ fontWeight: 700, color: 'var(--text-navy)', textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="demo-avatar" style={{ width: 28, height: 28, fontSize: '11px' }}>
                          {st.avatarInitials || 'ST'}
                        </div>
                        <span>{st.name}</span>
                      </div>
                    </td>
                    <td>{st.email}</td>
                    <td>
                      <span className="student-room-pill">{st.roomNumber}</span>
                    </td>
                    <td>{st.hostelBlock}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{st.phone}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{st.dailyLimit || 2} slots/day</td>
                    <td>
                      <span className="badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4, fontSize: '11px', fontWeight: 700 }}>
                        <CheckCircle2 size={11} />
                        <span>Verified</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectingStudent && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div className="modal-title-group">
                <div className="modal-icon-badge" style={{ background: '#FEE2E2', color: '#B91C1C', borderColor: '#FECACA' }}>
                  <UserX size={20} />
                </div>
                <div>
                  <h3 className="modal-title" style={{ fontSize: '18px' }}>Decline Student Registration</h3>
                  <p className="modal-subtitle">Warden Verification Rejection</p>
                </div>
              </div>
              <button 
                type="button" 
                className="modal-close-btn"
                onClick={() => setRejectingStudent(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-form">
              <div className="booking-summary-box">
                <div className="summary-row">
                  <span className="summary-label">Applicant:</span>
                  <strong className="summary-value">{rejectingStudent.name}</strong>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Reported Room:</span>
                  <strong className="summary-value">{rejectingStudent.roomNumber} ({rejectingStudent.hostelBlock})</strong>
                </div>
              </div>

              <div className="form-section">
                <label className="form-label">Reason for Declining</label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="custom-select"
                >
                  <option value="Room number does not match hostel roster">Room number does not match hostel roster</option>
                  <option value="Duplicate account detected">Duplicate account detected</option>
                  <option value="Unverified student ID credentials">Unverified student ID credentials</option>
                  <option value="Temporary hostel suspension">Temporary hostel suspension</option>
                  <option value="Other">Other Reason</option>
                </select>
              </div>

              {rejectReason === 'Other' && (
                <div className="form-section">
                  <label className="form-label">Specify Rejection Reason</label>
                  <input
                    type="text"
                    placeholder="Enter reason for student notification..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="custom-select"
                  />
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ padding: '16px 24px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setRejectingStudent(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ background: '#B91C1C', borderColor: '#B91C1C' }}
                onClick={handleConfirmReject}
              >
                <UserX size={15} />
                <span>Confirm Decline</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
