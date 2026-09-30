import { 
  Droplets, 
  Gauge, 
  Thermometer, 
  Activity, 
  Clock, 
  Layers, 
  Sparkles, 
  AlertOctagon, 
  CheckCircle,
  CalendarPlus,
  PackageCheck,
  ChevronRight,
  Info,
  AlertTriangle,
  Power,
  RotateCcw,
  ShieldCheck,
  User
} from 'lucide-react';

function formatTime(seconds) {
  if (!seconds || seconds <= 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function MachineCard({ 
  machine, 
  onBookClick, 
  onCollectClick,
  currentUserId,
  isAdmin = false,
  onAdminStatusOverride,
  onAdminRevokeActiveCycle
}) {
  const {
    machineNumber,
    name,
    floor,
    type,
    capacityKg,
    status,
    progress = 0,
    waterLevel = 0,
    rpm = 0,
    temperature = 24,
    vibration = 0.01,
    remainingSeconds = 0,
    currentUser,
    currentRoom,
    cycleType,
    offlineReason,
    fault,
  } = machine;

  // Distinct status configurations
  const getStatusBadge = () => {
    switch (status) {
      case 'IDLE':
        return {
          label: 'AVAILABLE',
          className: 'status-badge-idle',
          dotClass: 'dot-idle',
          desc: 'Ready for use',
        };
      case 'WASHING':
        return {
          label: 'WASHING',
          className: 'status-badge-washing',
          dotClass: 'dot-washing',
          desc: 'Main Wash Cycle',
        };
      case 'SPINNING':
        return {
          label: 'SPINNING',
          className: 'status-badge-spinning',
          dotClass: 'dot-spinning',
          desc: 'High-Speed Extractor',
        };
      case 'COMPLETED':
        return {
          label: 'COMPLETED',
          className: 'status-badge-completed',
          dotClass: 'dot-completed',
          desc: 'Ready for Collection',
        };
      case 'OFFLINE':
      default:
        return {
          label: 'OFFLINE',
          className: 'status-badge-offline',
          dotClass: 'dot-offline',
          desc: 'Under Maintenance',
        };
    }
  };

  const statusInfo = getStatusBadge();
  const isAvailable = status === 'IDLE';
  const isOperating = status === 'WASHING' || status === 'SPINNING';
  const isCompleted = status === 'COMPLETED';
  const isOffline = status === 'OFFLINE';

  const isUserOwner = machine.currentUserId === currentUserId;

  return (
    <div className={`machine-card ${status.toLowerCase()} ${isUserOwner ? 'user-active-machine' : ''}`}>
      {/* Top Banner / User Owner Indicator */}
      {isUserOwner && !isAdmin && (
        <div className="machine-owner-banner">
          <Sparkles size={13} />
          <span>Your Laundry In Progress ({currentRoom || 'Your Room'})</span>
        </div>
      )}

      {/* Admin Notice Banner if running */}
      {isAdmin && currentUser && (
        <div className="machine-owner-banner" style={{ background: '#EFF6FF', borderColor: '#BFDBFE', color: '#1D4ED8' }}>
          <User size={13} />
          <span>Resident: {currentUser} ({currentRoom || 'Room N/A'})</span>
        </div>
      )}

      {/* Header: Machine Number, Floor & Status */}
      <div className="machine-card-header">
        <div className="machine-header-left">
          <div className="machine-num-badge">
            <span className="num-prefix">M</span>
            <span className="num-value">{machineNumber}</span>
          </div>
          <div className="machine-title-group">
            <h3 className="machine-name">{name}</h3>
            <div className="machine-meta-chips">
              <span className="floor-chip">{floor}</span>
              <span className="capacity-chip">{type} • {capacityKg} kg</span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`machine-status-badge ${statusInfo.className}`}>
          <span className={`status-pulsing-dot ${statusInfo.dotClass}`} />
          <span className="status-label-text">{statusInfo.label}</span>
        </div>
      </div>

      {/* Progress Section */}
      <div className="machine-progress-section">
        <div className="progress-label-row">
          <span className="progress-phase-text">
            {isOperating ? `${cycleType || 'Wash Cycle'} in progress` : statusInfo.desc}
          </span>
          <span className="progress-percent-text">
            {isOffline ? 'Offline' : `${Math.round(Number(progress) || 0)}%`}
          </span>
        </div>

        {/* Progress Track */}
        <div className="progress-track-wrapper">
          <div 
            className={`progress-fill-bar bar-${status.toLowerCase()}`}
            style={{ width: `${isOffline ? 0 : Math.max(Number(progress) || 0, isAvailable ? 0 : 4)}%` }}
          />
        </div>
      </div>

      {/* 4 IoT Telemetry Metrics Grid (Water Level, RPM, Temp, Vibration) */}
      <div className="machine-telemetry-grid">
        {/* 1. Water Level */}
        <div className="telemetry-item">
          <div className="telemetry-icon-box water">
            <Droplets size={16} />
          </div>
          <div className="telemetry-info">
            <span className="telemetry-label">Water Level</span>
            <strong className="telemetry-val">
              {isOffline ? '--' : `${waterLevel}%`}
            </strong>
          </div>
        </div>

        {/* 2. RPM */}
        <div className="telemetry-item">
          <div className="telemetry-icon-box rpm">
            <Gauge size={16} />
          </div>
          <div className="telemetry-info">
            <span className="telemetry-label">Motor RPM</span>
            <strong className="telemetry-val">
              {isOffline ? '--' : `${rpm} RPM`}
            </strong>
          </div>
        </div>

        {/* 3. Temperature */}
        <div className="telemetry-item">
          <div className="telemetry-icon-box temp">
            <Thermometer size={16} />
          </div>
          <div className="telemetry-info">
            <span className="telemetry-label">Temperature</span>
            <strong className="telemetry-val">
              {isOffline ? '--' : `${temperature}°C`}
            </strong>
          </div>
        </div>

        {/* 4. Vibration */}
        <div className="telemetry-item">
          <div className="telemetry-icon-box vibration">
            <Activity size={16} />
          </div>
          <div className="telemetry-info">
            <span className="telemetry-label">Vibration</span>
            <strong className="telemetry-val">
              {isOffline
                ? '--'
                : typeof vibration === 'number'
                ? `${vibration.toFixed(2)} g`
                : !isNaN(parseFloat(vibration))
                ? `${parseFloat(vibration).toFixed(2)} g`
                : `${vibration || '0.00'} g`}
            </strong>
          </div>
        </div>
      </div>

      {/* Remaining Time Banner */}
      <div className={`remaining-time-box box-${status.toLowerCase()}`}>
        <div className="remaining-icon-label">
          <Clock size={16} className="remaining-icon" />
          <span className="remaining-label">
            {isOperating ? 'Remaining Time' : isCompleted ? 'Completed At' : 'Cycle Duration'}
          </span>
        </div>
        <div className="remaining-value">
          {isOperating && (
            <span className="time-countdown">{formatTime(remainingSeconds)}</span>
          )}
          {isAvailable && (
            <span className="time-idle-text">{machine.cycleDurationMinutes || 30} mins std</span>
          )}
          {isCompleted && (
            <span className="time-done-text">Waiting Pickup</span>
          )}
          {isOffline && (
            <span className="time-offline-text">Paused</span>
          )}
        </div>
      </div>

      {/* FAULT NOTIFICATION: Shown prominently if machine has a fault */}
      {fault && (
        <div className={`machine-fault-callout severity-${fault.severity}`}>
          <div className="fault-callout-header">
            <AlertTriangle size={14} className="fault-callout-icon" />
            <strong className="fault-callout-code">{fault.errorCode}</strong>
            <span className={`fault-sev-pill ${fault.severity}`}>
              {fault.severity.toUpperCase()}
            </span>
          </div>
          <p className="fault-callout-title">{fault.title}</p>
          {isAdmin && (
            <>
              <p className="fault-callout-desc">{fault.description}</p>
              {fault.sensorReading && (
                <div className="fault-callout-sensor">
                  <Activity size={12} />
                  <span>{fault.sensorReading}</span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Offline reason for student if no formal fault object */}
      {!fault && isOffline && (
        <div className="machine-offline-notice">
          <Info size={14} className="notice-icon" />
          <span>Under Maintenance — {offlineReason || 'Routine servicing in progress'}</span>
        </div>
      )}

      {/* ADMINISTRATOR CONTROL BAR ON CARD */}
      {isAdmin && (
        <div className="admin-card-controls">
          <span className="admin-card-controls-label">ADMIN QUICK ACTIONS:</span>
          <div className="admin-card-buttons">
            <button
              type="button"
              className="btn-tiny btn-idle"
              title="Reset machine to IDLE"
              onClick={() => onAdminStatusOverride && onAdminStatusOverride(machine.id, 'IDLE')}
            >
              Reset IDLE
            </button>
            <button
              type="button"
              className="btn-tiny btn-off"
              title="Take machine offline for repair"
              onClick={() => onAdminStatusOverride && onAdminStatusOverride(machine.id, 'OFFLINE')}
            >
              Take Offline
            </button>
            {isOperating && (
              <button
                type="button"
                className="btn-tiny btn-danger-tiny"
                title="Revoke active student cycle"
                onClick={() => onAdminRevokeActiveCycle && onAdminRevokeActiveCycle(machine.id)}
              >
                Revoke Cycle
              </button>
            )}
          </div>
        </div>
      )}

      {/* STUDENT / STANDARD ACTION FOOTER */}
      <div className="machine-card-footer">
        {isAvailable && (
          <button 
            type="button" 
            className="btn-machine-action btn-book-slot"
            onClick={() => onBookClick(machine)}
          >
            <CalendarPlus size={16} />
            <span>{isAdmin ? 'Manual Reserve' : 'Book This Slot'}</span>
          </button>
        )}

        {isOperating && (
          <button 
            type="button" 
            className="btn-machine-action btn-queue-slot"
            onClick={() => onBookClick(machine)}
          >
            <Clock size={16} />
            <span>Reserve Next Slot</span>
          </button>
        )}

        {isCompleted && (
          <button 
            type="button" 
            className="btn-machine-action btn-collect-laundry"
            onClick={() => onCollectClick(machine)}
          >
            <PackageCheck size={16} />
            <span>{isUserOwner ? 'Collect My Laundry' : 'Mark Collected'}</span>
          </button>
        )}

        {isOffline && (
          <button 
            type="button" 
            className="btn-machine-action btn-machine-disabled" 
            disabled
          >
            <AlertOctagon size={16} />
            <span>{isAdmin ? 'Machine Offline (Maintenance)' : 'Temporarily Unavailable'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
