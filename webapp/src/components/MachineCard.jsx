import { useState } from 'react';
import { 
  Droplets, 
  Gauge, 
  Thermometer, 
  Activity, 
  Clock, 
  Sparkles, 
  AlertOctagon, 
  CheckCircle2, 
  CalendarPlus,
  PackageCheck,
  ChevronDown,
  ChevronUp,
  Info,
  AlertTriangle,
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

  const [showAdminDiagnostics, setShowAdminDiagnostics] = useState(false);

  // Distinct status configurations
  const getStatusBadge = () => {
    switch (status) {
      case 'IDLE':
        return {
          label: 'AVAILABLE',
          className: 'status-badge-idle',
          dotClass: 'dot-idle',
          desc: 'Ready for your laundry',
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

      {/* Header: Machine Name, Floor & Status */}
      <div className="machine-card-header">
        <div className="machine-header-left">
          <div className="machine-title-group">
            <span className="machine-unit-label">WASHING MACHINE NO. {machineNumber}</span>
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

      {/* 2. PICTORIAL LUXURY WASHING MACHINE VISUAL */}
      <div className={`washer-stage status-${status.toLowerCase()}`}>
        <div className={`luxury-washer ${status.toLowerCase()} ${isOperating ? 'operating' : ''}`}>
          {/* Washer Top Console */}
          <div className="washer-control-panel">
            <div className="washer-logo">DHOBIDESK</div>
            <div className="washer-knob" />
            <div className="washer-leds">
              <span className={`led-dot ${isAvailable ? 'active-green' : isOperating ? 'active-amber' : isCompleted ? 'active-blue' : 'active-red'}`} />
              <span className="led-dot" />
              <span className="led-dot" />
            </div>
          </div>

          {/* Digital Screen Display */}
          <div className="washer-digital-screen">
            {isOperating && (
              <span className="digital-text pulse-text">
                {Math.ceil(remainingSeconds / 60) || 1} MIN
              </span>
            )}
            {isAvailable && <span className="digital-text green-text">READY</span>}
            {isCompleted && <span className="digital-text gold-text">DONE</span>}
            {isOffline && <span className="digital-text red-text">OFFLINE</span>}
          </div>

          {/* Circular Porthole Door with Washing Drum */}
          <div className="luxury-door">
            <div className="door-rim-outer">
              <div className={`door-glass status-${status.toLowerCase()}`}>
                {/* Active Washing Drum with sloshing water and tumbling clothes */}
                {status === 'WASHING' && (
                  <div className="drum-wash-content">
                    <div className="water-slosh-layer" />
                    <div className="clothes-tumble-item item-1" />
                    <div className="clothes-tumble-item item-2" />
                    <div className="soap-bubble bubble-a" />
                    <div className="soap-bubble bubble-b" />
                  </div>
                )}

                {/* High Speed Spin Drum */}
                {status === 'SPINNING' && (
                  <div className="drum-spin-content">
                    <div className="spin-vortex-ring" />
                    <div className="clothes-spin-blur" />
                  </div>
                )}

                {/* Idle Ready Drum */}
                {isAvailable && (
                  <div className="drum-idle-content">
                    <div className="stainless-rib-circle" />
                    <span className="idle-ready-pill">READY</span>
                  </div>
                )}

                {/* Completed Drum */}
                {isCompleted && (
                  <div className="drum-done-content">
                    <div className="clean-folded-laundry" />
                    <Sparkles size={16} className="done-sparkle-icon" />
                  </div>
                )}

                {/* Offline Drum */}
                {isOffline && (
                  <div className="drum-offline-content">
                    <AlertOctagon size={24} className="drum-offline-icon" />
                  </div>
                )}

                {/* 3D Glass curved reflection */}
                <div className="glass-reflection-shine" />
              </div>
            </div>
          </div>

          {/* Washer Base & Feet */}
          <div className="washer-base-trim">
            <span className="washer-drain-filter-cap" />
            <div className="washer-feet">
              <span className="washer-foot left" />
              <span className="washer-foot right" />
            </div>
          </div>
        </div>

        {/* Soft Ground Shadow */}
        <div className="washer-ground-shadow" />
      </div>

      {/* 3. FRIENDLY PICTORIAL STATUS DESCRIPTOR */}
      <div className={`pictorial-status-banner banner-${status.toLowerCase()}`}>
        <div className="pictorial-icon-wrapper">
          {isAvailable && <CheckCircle2 size={18} className="pictorial-icon emerald" />}
          {status === 'WASHING' && <Droplets size={18} className="pictorial-icon blue pulse" />}
          {status === 'SPINNING' && <Activity size={18} className="pictorial-icon purple spin" />}
          {isCompleted && <PackageCheck size={18} className="pictorial-icon amber" />}
          {isOffline && <AlertOctagon size={18} className="pictorial-icon rose" />}
        </div>
        <div className="pictorial-text-group">
          <strong className="pictorial-main-title">
            {isAvailable && 'Available • Clean Drum Ready'}
            {status === 'WASHING' && `${cycleType || 'Wash Cycle'} • Detergent Wash`}
            {status === 'SPINNING' && 'Rinse & Spin • High-Speed Extraction'}
            {isCompleted && 'Cycle Finished • Clean & Ready'}
            {isOffline && 'Under Maintenance'}
          </strong>
          <span className="pictorial-sub-text">
            {isAvailable && `${machine.cycleDurationMinutes || 30} mins standard wash cycle`}
            {isOperating && `${Math.round(Number(progress) || 0)}% completed • ${formatTime(remainingSeconds)} remaining`}
            {isCompleted && 'Please collect clothes within 15 mins'}
            {isOffline && (offlineReason || 'Routine servicing in progress')}
          </span>
        </div>
      </div>

      {/* Progress Track when operating */}
      {isOperating && (
        <div className="machine-progress-section" style={{ marginBottom: 16 }}>
          <div className="progress-track-wrapper">
            <div 
              className={`progress-fill-bar bar-${status.toLowerCase()}`}
              style={{ width: `${Math.max(Number(progress) || 0, 5)}%` }}
            />
          </div>
        </div>
      )}

      {/* Optional Sensor Diagnostics Drawer for Administrators */}
      {isAdmin && (
        <div className="admin-diagnostics-drawer">
          <button
            type="button"
            className="btn-toggle-diagnostics"
            onClick={() => setShowAdminDiagnostics(!showAdminDiagnostics)}
          >
            <Gauge size={13} />
            <span>{showAdminDiagnostics ? 'Hide Sensor Readings' : 'View Sensor Diagnostics'}</span>
            {showAdminDiagnostics ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showAdminDiagnostics && (
            <div className="admin-sensor-mini-grid">
              <div className="sensor-pill">
                <span className="sensor-name">WATER:</span>
                <strong className="sensor-value">{isOffline ? '--' : `${waterLevel}%`}</strong>
              </div>
              <div className="sensor-pill">
                <span className="sensor-name">RPM:</span>
                <strong className="sensor-value">{isOffline ? '--' : `${rpm}`}</strong>
              </div>
              <div className="sensor-pill">
                <span className="sensor-name">TEMP:</span>
                <strong className="sensor-value">{isOffline ? '--' : `${temperature}°C`}</strong>
              </div>
              <div className="sensor-pill">
                <span className="sensor-name">VIBRATION:</span>
                <strong className="sensor-value">
                  {isOffline ? '--' : typeof vibration === 'number' ? `${vibration.toFixed(2)}g` : `${vibration}g`}
                </strong>
              </div>
            </div>
          )}
        </div>
      )}

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
