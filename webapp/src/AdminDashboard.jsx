import { useEffect, useState } from 'react';
import './App.css';

function AdminDashboard({ onBackToStudent, addToast }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMachine, setNewMachine] = useState({
    id: '',
    type: 'Top Load',
    floor: 'Floor 1',
    capacityKg: 7,
    cycleDurationMinutes: 30,
  });

  const bridgeUrl = import.meta.env.VITE_BRIDGE_URL || 'http://localhost:3001';
  const adminHeaders = {
    'Content-Type': 'application/json',
    'x-admin-passcode': '1234',
  };

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${bridgeUrl}/admin/overview`, {
        headers: adminHeaders,
      });
      const data = await res.json();
      if (res.ok) {
        setOverview(data);
      } else {
        addToast('Admin Error', data.error || 'Failed to fetch admin data', 'error');
      }
    } catch (err) {
      addToast('Connection Error', 'Could not reach bridge server', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSetStatus = async (machineId, status) => {
    setActionLoading(`status-${machineId}`);
    try {
      const res = await fetch(`${bridgeUrl}/admin/setMachineStatus`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ machineId, status }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast('Machine Updated', `${machineId} status changed to ${status.toUpperCase()}`, 'success');
        fetchOverview();
      } else {
        addToast('Update Failed', data.error, 'error');
      }
    } catch (err) {
      addToast('Error', 'Failed to communicate with bridge', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleForceCancel = async (bookingId, machineId) => {
    if (!window.confirm(`Force cancel booking on ${machineId}? Next queued student will be automatically promoted.`)) {
      return;
    }
    setActionLoading(`cancel-${bookingId}`);
    try {
      const res = await fetch(`${bridgeUrl}/admin/forceCancelBooking`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast('Booking Force Cancelled', `Drum on ${machineId} released by admin`, 'info');
        fetchOverview();
      } else {
        addToast('Action Failed', data.error, 'error');
      }
    } catch (err) {
      addToast('Error', 'Failed to cancel booking', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddMachine = async (e) => {
    e.preventDefault();
    if (!newMachine.id.trim()) {
      addToast('Validation Error', 'Machine ID is required', 'warning');
      return;
    }
    setActionLoading('add-machine');
    try {
      const res = await fetch(`${bridgeUrl}/admin/addMachine`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify(newMachine),
      });
      const data = await res.json();
      if (res.ok) {
        addToast('Machine Added', `${newMachine.id} added to ${newMachine.floor}`, 'success');
        setShowAddModal(false);
        setNewMachine({ id: '', type: 'Top Load', floor: 'Floor 1', capacityKg: 7, cycleDurationMinutes: 30 });
        fetchOverview();
      } else {
        addToast('Failed to Add', data.error, 'error');
      }
    } catch (err) {
      addToast('Error', 'Failed to add machine', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const stats = overview?.stats || {
    totalMachines: 0,
    activeMachines: 0,
    idleMachines: 0,
    maintenanceMachines: 0,
    offlineMachines: 0,
    totalQueued: 0,
    totalActiveWashes: 0,
    totalBookingsToday: 0,
  };

  return (
    <div className="dhobidesk-app">
      {/* Header Bar */}
      <header className="dhobidesk-header">
        <div className="dhobidesk-title-group">
          <h1>🛡️ DhobiDesk Admin Operations Center</h1>
          <p className="dhobidesk-subtitle">Facility Management, Machine Fleet Controls & Global Queue Monitor</p>
        </div>
        <div className="dhobidesk-user-actions">
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
            + Add Machine
          </button>
          <button className="btn btn-outline btn-sm" onClick={fetchOverview}>
            ↻ Refresh
          </button>
          <button className="btn btn-outline btn-sm" onClick={onBackToStudent}>
            ← Switch to Student View
          </button>
        </div>
      </header>

      {/* KPI Stats Bar */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="stat-label">Total Fleet</div>
          <div className="stat-val">{stats.totalMachines} <span className="stat-sub">machines</span></div>
          <div className="stat-detail">{stats.idleMachines} Available • {stats.activeMachines} Washing</div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-label">Students Waiting</div>
          <div className="stat-val" style={{ color: '#f59e0b' }}>{stats.totalQueued} <span className="stat-sub">in queue</span></div>
          <div className="stat-detail">{stats.totalActiveWashes} loads in progress</div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-label">Facility Health</div>
          <div className="stat-val" style={{ color: stats.maintenanceMachines > 0 ? '#ef4444' : '#10b981' }}>
            {stats.maintenanceMachines + stats.offlineMachines} <span className="stat-sub">issues</span>
          </div>
          <div className="stat-detail">{stats.maintenanceMachines} in maintenance • {stats.offlineMachines} offline</div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-label">Usage Today</div>
          <div className="stat-val" style={{ color: '#3b82f6' }}>{stats.totalBookingsToday} <span className="stat-sub">cycles</span></div>
          <div className="stat-detail">Across all hostel blocks</div>
        </div>
      </div>

      {/* SECTION 1: Machine Fleet Controls */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">⚙️ Machine Fleet Status & Overrides</h2>
        </div>

        {loading && !overview ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading fleet data...</p>
        ) : (
          <div className="table-responsive">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Machine</th>
                  <th>Location & Type</th>
                  <th>Status</th>
                  <th>Cycle Time</th>
                  <th>Current Queue</th>
                  <th>Admin Overrides</th>
                </tr>
              </thead>
              <tbody>
                {overview?.machines?.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <strong>{m.id}</strong>
                    </td>
                    <td>
                      <div>{m.floor || 'Floor 1'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {m.type || 'Standard'} • {m.capacityKg || 7} kg
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${m.status || 'offline'}`}>
                        {m.status || 'offline'}
                      </span>
                    </td>
                    <td>{m.cycleDurationMinutes || 30} mins</td>
                    <td>
                      <span className="queue-pos-badge">
                        {m.queueLength || 0} queued {m.hasActiveBooking ? '(1 active)' : ''}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {m.status !== 'idle' && (
                          <button
                            className="btn btn-success btn-sm"
                            disabled={actionLoading === `status-${m.id}`}
                            onClick={() => handleSetStatus(m.id, 'idle')}
                          >
                            Set Free
                          </button>
                        )}
                        {m.status !== 'maintenance' ? (
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ borderColor: 'var(--warning)', color: '#d97706' }}
                            disabled={actionLoading === `status-${m.id}`}
                            onClick={() => handleSetStatus(m.id, 'maintenance')}
                          >
                            Maintenance
                          </button>
                        ) : (
                          <button
                            className="btn btn-success btn-sm"
                            disabled={actionLoading === `status-${m.id}`}
                            onClick={() => handleSetStatus(m.id, 'idle')}
                          >
                            Restore
                          </button>
                        )}
                        {m.status !== 'offline' && (
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ borderColor: 'var(--text-muted)', color: 'var(--text-muted)' }}
                            disabled={actionLoading === `status-${m.id}`}
                            onClick={() => handleSetStatus(m.id, 'offline')}
                          >
                            Offline
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SECTION 2: Global Reservations & Queues */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">📋 Global Active Reservations & Queues</h2>
        </div>

        {overview?.bookings?.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No active or queued bookings across the facility.</p>
        ) : (
          <div className="table-responsive">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Machine</th>
                  <th>Status</th>
                  <th>Student ID</th>
                  <th>Queue / Timing</th>
                  <th>Admin Action</th>
                </tr>
              </thead>
              <tbody>
                {overview?.bookings?.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <strong>{b.machineId}</strong>
                    </td>
                    <td>
                      <span className={`status-pill ${b.status}`}>{b.status}</span>
                      {b.shifted && (
                        <span style={{ marginLeft: 6, fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>shifted</span>
                      )}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {b.userId ? `${b.userId.slice(0, 10)}...` : 'Unknown'}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {b.status === 'active'
                        ? 'Currently washing'
                        : b.status === 'queued'
                        ? `Position #${b.queuePosition || 1}`
                        : 'Done — Awaiting collection'}
                    </td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        disabled={actionLoading === `cancel-${b.id}`}
                        onClick={() => handleForceCancel(b.id, b.machineId)}
                      >
                        {actionLoading === `cancel-${b.id}` ? 'Releasing...' : 'Force Release'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add Machine Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Add New Laundry Machine</h3>
              <button className="toast-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddMachine}>
              <div className="form-group">
                <label>Machine ID</label>
                <input
                  type="text"
                  placeholder="e.g. machine_07"
                  value={newMachine.id}
                  onChange={(e) => setNewMachine({ ...newMachine, id: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Floor Location</label>
                <select
                  value={newMachine.floor}
                  onChange={(e) => setNewMachine({ ...newMachine, floor: e.target.value })}
                >
                  <option value="Floor 1">Floor 1 (Ground)</option>
                  <option value="Floor 2">Floor 2</option>
                  <option value="Floor 3">Floor 3</option>
                  <option value="Floor 4">Floor 4</option>
                </select>
              </div>

              <div className="form-group">
                <label>Machine Type</label>
                <select
                  value={newMachine.type}
                  onChange={(e) => setNewMachine({ ...newMachine, type: e.target.value })}
                >
                  <option value="Top Load">Top Load</option>
                  <option value="Front Load">Front Load</option>
                  <option value="Heavy Duty">Heavy Duty (10kg)</option>
                  <option value="Express Wash">Express Wash</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Capacity (kg)</label>
                  <input
                    type="number"
                    value={newMachine.capacityKg}
                    onChange={(e) => setNewMachine({ ...newMachine, capacityKg: e.target.value })}
                    min="4"
                    max="15"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Cycle Duration (mins)</label>
                  <input
                    type="number"
                    value={newMachine.cycleDurationMinutes}
                    onChange={(e) => setNewMachine({ ...newMachine, cycleDurationMinutes: e.target.value })}
                    min="10"
                    max="90"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading === 'add-machine'}>
                  {actionLoading === 'add-machine' ? 'Adding...' : 'Add to Fleet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
