import { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Wrench, 
  Activity, 
  Thermometer, 
  Droplets, 
  Gauge, 
  Power, 
  RotateCcw, 
  Search, 
  Filter, 
  AlertOctagon, 
  ShieldAlert, 
  ExternalLink,
  Cpu
} from 'lucide-react';

export default function FaultsView({ 
  faults = [], 
  machines = [], 
  onResolveFault, 
  onUpdateMachineStatus 
}) {
  const [filterSeverity, setFilterSeverity] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const activeFaults = faults.filter((f) => f.status !== 'resolved');
  const criticalCount = activeFaults.filter((f) => f.severity === 'critical').length;
  const warningCount = activeFaults.filter((f) => f.severity === 'warning').length;
  const healthyCount = machines.length - activeFaults.length;

  const filteredFaults = faults.filter((fault) => {
    if (filterSeverity !== 'All' && fault.severity !== filterSeverity) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        fault.machineName.toLowerCase().includes(q) ||
        fault.errorCode.toLowerCase().includes(q) ||
        fault.title.toLowerCase().includes(q) ||
        fault.floor.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="faults-view-container">
      {/* Header */}
      <div className="view-header">
        <div>
          <div className="admin-view-tag">
            <ShieldAlert size={14} />
            <span>STAFF DIAGNOSTICS CONSOLE</span>
          </div>
          <h2 className="view-title">Machine Faults & Sensor Anomaly Center</h2>
          <p className="view-subtitle">
            Real-time IoT telemetry diagnostics, hardware error codes, and maintenance dispatch
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="summary-cards-grid">
        <div className="summary-kpi-card">
          <div className="summary-card-accent-bar" style={{ background: '#B91C1C' }} />
          <div className="summary-kpi-header">
            <span className="summary-kpi-title">Critical Faults</span>
            <span className="summary-status-pill badge-amber" style={{ background: '#FEE2E2', color: '#B91C1C', borderColor: '#FECACA' }}>
              Action Needed
            </span>
          </div>
          <div className="summary-kpi-value-row">
            <span className="summary-kpi-number" style={{ color: '#B91C1C' }}>{criticalCount}</span>
            <span className="summary-kpi-unit">machine(s)</span>
          </div>
          <div className="summary-kpi-footer">
            <span className="summary-kpi-detail">Units automatically marked offline</span>
          </div>
        </div>

        <div className="summary-kpi-card">
          <div className="summary-card-accent-bar" style={{ background: '#D97706' }} />
          <div className="summary-kpi-header">
            <span className="summary-kpi-title">Telemetry Warnings</span>
            <span className="summary-status-pill badge-amber">Under Watch</span>
          </div>
          <div className="summary-kpi-value-row">
            <span className="summary-kpi-number" style={{ color: '#D97706' }}>{warningCount}</span>
            <span className="summary-kpi-unit">anomaly alert(s)</span>
          </div>
          <div className="summary-kpi-footer">
            <span className="summary-kpi-detail">Vibration spikes & thermal rise checks</span>
          </div>
        </div>

        <div className="summary-kpi-card">
          <div className="summary-card-accent-bar" style={{ background: '#15803D' }} />
          <div className="summary-kpi-header">
            <span className="summary-kpi-title">Healthy Washers</span>
            <span className="summary-status-pill badge-emerald">Optimal</span>
          </div>
          <div className="summary-kpi-value-row">
            <span className="summary-kpi-number" style={{ color: '#15803D' }}>{healthyCount}</span>
            <span className="summary-kpi-unit">/ {machines.length} fleet</span>
          </div>
          <div className="summary-kpi-footer">
            <span className="summary-kpi-detail">Telemetry within safe margins</span>
          </div>
        </div>

        <div className="summary-kpi-card">
          <div className="summary-card-accent-bar accent-amber" />
          <div className="summary-kpi-header">
            <span className="summary-kpi-title">Campus IoT Mesh</span>
            <span className="summary-status-pill badge-emerald">Online</span>
          </div>
          <div className="summary-kpi-value-row">
            <span className="summary-kpi-number">100%</span>
            <span className="summary-kpi-unit">polling rate</span>
          </div>
          <div className="summary-kpi-footer">
            <span className="summary-kpi-detail">1-second accelerometer & RPM streaming</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="machines-grid-header">
        <div className="machines-grid-title">
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-navy)' }}>
            Active Hardware Fault Tickets ({filteredFaults.length})
          </h3>
        </div>

        <div className="filters-bar-wrapper">
          <div className="filter-pills-group">
            {['All', 'critical', 'warning', 'info'].map((sev) => (
              <button
                key={sev}
                type="button"
                className={`filter-pill-btn ${filterSeverity === sev ? 'active' : ''}`}
                onClick={() => setFilterSeverity(sev)}
              >
                {sev === 'All' ? 'All Severities' : sev.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="search-box-field">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Search error code, washer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </div>

      {/* Faults Cards Grid */}
      <div className="fault-tickets-grid">
        {filteredFaults.length === 0 ? (
          <div className="empty-state-card" style={{ gridColumn: '1 / -1' }}>
            <CheckCircle2 size={44} style={{ color: 'var(--status-idle)', marginBottom: 12 }} />
            <h3>No Faults Reported</h3>
            <p>All monitored campus washing machines are operating within normal parameters.</p>
          </div>
        ) : (
          filteredFaults.map((fault) => {
            const isResolved = fault.status === 'resolved';
            const isCritical = fault.severity === 'critical';
            const isWarning = fault.severity === 'warning';

            return (
              <div 
                key={fault.id} 
                className={`fault-ticket-card ${fault.severity} ${isResolved ? 'resolved' : ''}`}
              >
                <div className="fault-ticket-top">
                  <div className="fault-header-info">
                    <span className={`fault-severity-badge ${fault.severity}`}>
                      {isCritical ? <AlertOctagon size={12} /> : <AlertTriangle size={12} />}
                      <span>{fault.severity.toUpperCase()}</span>
                    </span>
                    <span className="fault-code-chip">{fault.errorCode}</span>
                    <span className="fault-timestamp">{fault.reportedAt}</span>
                  </div>

                  <span className={`fault-status-tag status-${fault.status}`}>
                    {fault.status.toUpperCase()}
                  </span>
                </div>

                <div className="fault-ticket-main">
                  <h4 className="fault-ticket-title">{fault.title}</h4>
                  <div className="fault-meta-row">
                    <strong>{fault.machineName} ({fault.floor})</strong>
                    <span className="dot-divider">•</span>
                    <span>Machine #{fault.machineNumber}</span>
                  </div>
                  <p className="fault-ticket-desc">{fault.description}</p>
                </div>

                {/* Sensor reading callout */}
                {fault.sensorReading && (
                  <div className="fault-sensor-box">
                    <Activity size={14} className="sensor-box-icon" />
                    <span className="sensor-box-label">Live Sensor Reading:</span>
                    <strong className="sensor-box-val">{fault.sensorReading}</strong>
                  </div>
                )}

                {/* Admin Actions */}
                <div className="fault-actions-bar">
                  {!isResolved ? (
                    <>
                      <button
                        type="button"
                        className="btn-resolve-fault"
                        onClick={() => onResolveFault(fault.id, fault.machineId)}
                      >
                        <CheckCircle2 size={15} />
                        <span>Resolve & Return to Service</span>
                      </button>

                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => onUpdateMachineStatus(fault.machineId, 'OFFLINE')}
                      >
                        <Power size={14} />
                        <span>Force Offline</span>
                      </button>
                    </>
                  ) : (
                    <div className="resolved-confirmation">
                      <CheckCircle2 size={16} style={{ color: 'var(--status-idle)' }} />
                      <span>Fault marked as resolved • Machine restored to fleet</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Fleet Telemetry Diagnostics Table */}
      <div className="schedule-matrix-card" style={{ marginTop: 32 }}>
        <div className="schedule-matrix-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Cpu size={20} style={{ color: 'var(--gold)' }} />
            <h3 style={{ margin: 0 }}>Fleet IoT Hardware Sensor Matrix</h3>
          </div>
          <p style={{ marginTop: 4 }}>
            Direct telemetry streams from onboard ESP32 controller modules
          </p>
        </div>

        <div className="table-responsive">
          <table className="schedule-table">
            <thead>
              <tr>
                <th>Machine</th>
                <th>Floor</th>
                <th>Status</th>
                <th>Water Level</th>
                <th>Motor RPM</th>
                <th>Temperature</th>
                <th>Vibration Sensor</th>
                <th>Hardware Health</th>
                <th>Quick Actions</th>
              </tr>
            </thead>
            <tbody>
              {machines.map((m) => {
                const hasFault = m.fault || m.status === 'OFFLINE';
                return (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-navy)', textAlign: 'left' }}>
                      {m.name} (#{m.machineNumber})
                    </td>
                    <td>{m.floor}</td>
                    <td>
                      <span className={`status-pill pill-${m.status.toLowerCase()}`}>
                        {m.status}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {m.status === 'OFFLINE' ? '--' : `${m.waterLevel}%`}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {m.status === 'OFFLINE' ? '--' : `${m.rpm} RPM`}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {m.status === 'OFFLINE' ? '--' : `${m.temperature}°C`}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {m.status === 'OFFLINE' 
                        ? '--' 
                        : typeof m.vibration === 'number' 
                        ? `${m.vibration.toFixed(2)} g` 
                        : `${m.vibration} g`}
                    </td>
                    <td>
                      {hasFault ? (
                        <span className="badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4, fontSize: '11px', fontWeight: 700, background: '#FEE2E2', color: '#B91C1C', borderColor: '#FECACA' }}>
                          <AlertTriangle size={11} />
                          <span>Fault Flag</span>
                        </span>
                      ) : (
                        <span className="badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4, fontSize: '11px', fontWeight: 700, background: '#ECFDF5', color: '#15803D', borderColor: '#A7F3D0' }}>
                          <CheckCircle2 size={11} />
                          <span>Normal</span>
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="btn-tiny btn-idle"
                          title="Reset machine to IDLE"
                          onClick={() => onUpdateMachineStatus(m.id, 'IDLE')}
                        >
                          Reset IDLE
                        </button>
                        <button
                          type="button"
                          className="btn-tiny btn-off"
                          title="Set machine to Maintenance"
                          onClick={() => onUpdateMachineStatus(m.id, 'OFFLINE')}
                        >
                          Offline
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
