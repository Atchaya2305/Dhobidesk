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

      {/* Header: Machine Name, Big Unit Number & Status */}
      <div className="machine-card-header">
        <div className="machine-header-left">
          <div className="machine-title-group">
            <span className="machine-eyebrow">WASHING MACHINE</span>
            <div className="machine-heading-row">
              <h2 className="machine-big-number">No. {machineNumber}</h2>
              <span className="floor-chip">{floor}</span>
            </div>
            <div className="machine-sub-row">
              <span className="machine-model-text">{name}</span>
              <span className="machine-spec-dot">•</span>
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

      {/* 2. REALISTIC LUXURY MACHINE PHOTO SHOWCASE */}
      <div className={`machine-photo-showcase status-${status.toLowerCase()}`}>
        <div className="photo-inner-wrapper">
          <img
            src={
              status === 'WASHING'
                ? '/assets/machines/washer-washing.jpg'
                : status === 'SPINNING'
                ? '/assets/machines/washer-spinning.jpg'
                : status === 'COMPLETED'
                ? '/assets/machines/washer-completed.jpg'
                : '/assets/machines/washer-idle.jpg'
            }
            alt={`Washing Machine ${machineNumber} - ${status}`}
            className={`machine-hero-image ${status.toLowerCase()} ${isOperating ? 'operating' : ''}`}
            loading="lazy"
          />

          {/* Floating Live State Pill */}
          {isOperating && (
            <div className="floating-photo-pill pill-timer">
              <Clock size={15} className="pulse-icon" />
              <div className="pill-timer-text">
                <span className="pill-label">REMAINING TIME</span>
                <strong className="pill-digits">{formatTime(remainingSeconds)}</strong>
              </div>
            </div>
          )}

          {isAvailable && (
            <div className="floating-photo-pill pill-ready">
              <CheckCircle2 size={15} />
              <span>CLEAN DRUM READY</span>
            </div>
          )}

          {isCompleted && (
            <div className="floating-photo-pill pill-done">
              <Sparkles size={15} />
              <span>CYCLE COMPLETED</span>
            </div>
          )}

          {isOffline && (
            <div className="floating-photo-pill pill-offline">
              <AlertOctagon size={15} />
              <span>OUT OF SERVICE</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. FRIENDLY PICTORIAL STATUS DESCRIPTOR */}
      <div className={`pictorial-status-banner banner-${status.toLowerCase()}`}>
        <div className="pictorial-icon-wrapper">
          {isAvailable && <CheckCircle2 size={20} className="pictorial-icon emerald" />}
          {status === 'WASHING' && <Droplets size={20} className="pictorial-icon blue pulse" />}
          {status === 'SPINNING' && <Activity size={20} className="pictorial-icon purple spin" />}
          {isCompleted && <PackageCheck size={20} className="pictorial-icon amber" />}
          {isOffline && <AlertOctagon size={20} className="pictorial-icon rose" />}
        </div>
        <div className="pictorial-text-group">
          <strong className="pictorial-main-title">
            {isAvailable && 'Available • Clean Drum Ready'}
            {status === 'WASHING' && `${cycleType || 'Wash Cycle'} • Detergent Wash`}
            {status === 'SPINNING' && 'Rinse & Spin • High-Speed Extraction'}
            {isCompleted && 'Cycle Finished • Collect Laundry'}
            {isOffline && 'Under Maintenance'}
          </strong>
          <span className="pictorial-sub-text">
            {isAvailable && `${machine.cycleDurationMinutes || 30} mins standard wash cycle`}
            {isOperating && `${Math.round(Number(progress) || 0)}% complete • ${formatTime(remainingSeconds)} remaining`}
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
