import { useState } from 'react';
import { 
  ShieldCheck, 
  X, 
  Lock, 
  KeyRound, 
  AlertTriangle, 
  RefreshCw, 
  Power, 
  Wrench, 
  CheckCircle2, 
  Sparkles,
  Layers,
  Trash2
} from 'lucide-react';

export default function AdminModal({ 
  isOpen, 
  onClose, 
  machines, 
  bookings, 
  onUpdateMachineStatus, 
  onForceCancelBooking,
  onResetAllMachines 
}) {
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleVerify = (e) => {
    e.preventDefault();
    if (passcode === '1234') {
      setIsAuthenticated(true);
      setErrorMsg('');
    } else {
      setErrorMsg('Invalid passcode! Use default admin passcode: 1234');
    }
  };

  const handleStatusChange = (machineId, newStatus) => {
    onUpdateMachineStatus(machineId, newStatus);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card admin-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge admin-badge">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="modal-title">Facility Operations Center</h3>
              <p className="modal-subtitle">Master override console for campus warden & maintenance staff</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        {!isAuthenticated ? (
          <form onSubmit={handleVerify} className="admin-lock-screen">
            <div className="lock-icon-box">
              <KeyRound size={32} />
            </div>
            <h4>Enter Facility Admin Passcode</h4>
            <p className="lock-prompt-text">
              Authorized personnel only. (Default admin passcode is <code>1234</code>)
            </p>

            <div className="admin-input-group">
              <input
                type="password"
                maxLength={4}
                placeholder="••••"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setErrorMsg('');
                }}
                autoFocus
                className="admin-passcode-input"
              />
            </div>

            {errorMsg && (
              <span className="admin-error-text">
                <AlertTriangle size={14} /> {errorMsg}
              </span>
            )}

            <div className="admin-modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Unlock Admin Console
              </button>
            </div>
          </form>
        ) : (
          <div className="admin-console-body">
            <div className="admin-status-banner">
              <CheckCircle2 size={16} className="text-emerald" />
              <span>Admin Session Active • Master Access Enabled (PIN: 1234)</span>
            </div>

            {/* Quick Actions Bar */}
            <div className="admin-quick-actions">
              <button 
                type="button" 
                className="btn-admin-action"
                onClick={onResetAllMachines}
              >
                <RefreshCw size={15} />
                <span>Reset All to IDLE</span>
              </button>
            </div>

            {/* Machine Fleet Override Table */}
            <h4 className="admin-section-heading">Fleet Status & Sensor Overrides</h4>
            <div className="admin-machines-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Machine</th>
                    <th>Floor</th>
                    <th>Current Status</th>
                    <th>Current User</th>
                    <th>Quick Override Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {machines.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <strong>{m.name}</strong>
                        <div className="sub-text">M{m.machineNumber} • {m.type}</div>
                      </td>
                      <td>{m.floor}</td>
                      <td>
                        <span className={`status-pill pill-${m.status.toLowerCase()}`}>
                          {m.status}
                        </span>
                      </td>
                      <td>
                        {m.currentUser ? `${m.currentUser} (${m.currentRoom})` : '—'}
                      </td>
                      <td>
                        <div className="override-btn-group">
                          <button
                            type="button"
                            className="btn-tiny btn-idle"
                            onClick={() => handleStatusChange(m.id, 'IDLE')}
                            title="Set to Available"
                          >
                            Free (IDLE)
                          </button>
                          <button
                            type="button"
                            className="btn-tiny btn-wash"
                            onClick={() => handleStatusChange(m.id, 'WASHING')}
                            title="Simulate Active Wash"
                          >
                            Wash
                          </button>
                          <button
                            type="button"
                            className="btn-tiny btn-spin"
                            onClick={() => handleStatusChange(m.id, 'SPINNING')}
                            title="Simulate Spin Cycle"
                          >
                            Spin
                          </button>
                          <button
                            type="button"
                            className="btn-tiny btn-done"
                            onClick={() => handleStatusChange(m.id, 'COMPLETED')}
                            title="Simulate Completed Cycle"
                          >
                            Complete
                          </button>
                          <button
                            type="button"
                            className="btn-tiny btn-off"
                            onClick={() => handleStatusChange(m.id, 'OFFLINE')}
                            title="Set Offline for Maintenance"
                          >
                            Offline
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Active Bookings Manager */}
            <h4 className="admin-section-heading" style={{ marginTop: 24 }}>
              Active Reserved Slots ({bookings.filter(b => b.status === 'active' || b.status === 'upcoming').length})
            </h4>
            <div className="admin-bookings-table-wrapper">
              {bookings.filter(b => b.status === 'active' || b.status === 'upcoming').length === 0 ? (
                <p className="no-bookings-note">No active reservations currently in the queue.</p>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Resident</th>
                      <th>Room</th>
                      <th>Machine</th>
                      <th>Time Slot</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings
                      .filter(b => b.status === 'active' || b.status === 'upcoming')
                      .map((b) => (
                        <tr key={b.id}>
                          <td><strong>{b.userName}</strong></td>
                          <td>{b.roomNumber}</td>
                          <td>{b.machineName} ({b.floor})</td>
                          <td>{b.date}, {b.slotTime}</td>
                          <td>
                            <span className={`booking-status-badge status-${b.status}`}>
                              {b.status}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn-danger-tiny"
                              onClick={() => onForceCancelBooking(b.id)}
                            >
                              <Trash2 size={13} />
                              <span>Force Release</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="admin-modal-footer">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Close Admin Console
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
