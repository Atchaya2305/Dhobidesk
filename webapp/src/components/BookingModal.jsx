import { useState, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Sparkles, 
  Layers, 
  Thermometer, 
  CheckCircle2, 
  AlertCircle, 
  Check, 
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { TIME_SLOTS, CYCLE_TYPES } from '../data/mockData';

export default function BookingModal({ 
  isOpen, 
  onClose, 
  machines, 
  initialMachine, 
  existingBookings, 
  currentUser, 
  onConfirmBooking 
}) {
  if (!isOpen) return null;

  // Selected state
  const [selectedMachineId, setSelectedMachineId] = useState(
    initialMachine?.id || machines.find((m) => m.status === 'IDLE')?.id || machines[0]?.id
  );
  const [selectedDate, setSelectedDate] = useState('Today');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedCycleId, setSelectedCycleId] = useState('normal');
  const [selectedTemp, setSelectedTemp] = useState('40°C');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Find machine details
  const selectedMachine = machines.find((m) => m.id === selectedMachineId) || machines[0];
  const selectedCycle = CYCLE_TYPES.find((c) => c.id === selectedCycleId) || CYCLE_TYPES[0];

  // Calculate booked slots for this machine & date
  const bookedSlotsMap = useMemo(() => {
    const map = {};
    existingBookings.forEach((b) => {
      if (
        b.machineId === selectedMachineId && 
        b.date === selectedDate && 
        (b.status === 'active' || b.status === 'upcoming')
      ) {
        map[b.slotTime] = b;
      }
    });
    return map;
  }, [existingBookings, selectedMachineId, selectedDate]);

  // Check user daily quota limit (2 per day)
  const userBookingsToday = existingBookings.filter(
    (b) => b.userId === currentUser.uid && b.date === selectedDate && b.status !== 'cancelled'
  );
  const isQuotaReached = userBookingsToday.length >= (currentUser.dailyLimit || 2);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedSlot) {
      setErrorMessage('Please select an available time slot.');
      return;
    }

    if (bookedSlotsMap[selectedSlot]) {
      const bookedBy = bookedSlotsMap[selectedSlot].userName || 'another resident';
      setErrorMessage(`Double Booking Prevented: This slot is already reserved by ${bookedBy}.`);
      return;
    }

    if (isQuotaReached) {
      setErrorMessage(`Daily quota exceeded! You have already booked ${userBookingsToday.length} slots today.`);
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const newBooking = {
        id: 'bk_' + Date.now(),
        machineId: selectedMachine.id,
        machineNumber: selectedMachine.machineNumber,
        machineName: selectedMachine.name,
        floor: selectedMachine.floor,
        slotTime: selectedSlot,
        date: selectedDate,
        status: 'upcoming',
        cycleType: `${selectedCycle.name} (${selectedCycle.duration} min)`,
        temperature: selectedTemp,
        userId: currentUser.uid,
        userName: currentUser.name,
        roomNumber: currentUser.roomNumber,
        phone: currentUser.phone,
        bookedAt: `${selectedDate}, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      };

      onConfirmBooking(newBooking);
      onClose();
    }, 400);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card booking-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="modal-title">Book a Washing Slot</h3>
              <p className="modal-subtitle">Reserve a slot with real-time double-booking prevention</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="modal-form">
          {/* Step 1: Machine Selector */}
          <div className="form-section">
            <label className="form-label">
              <Layers size={16} />
              <span>Select Washing Machine</span>
            </label>
            <div className="machine-selector-grid">
              {machines.map((m) => {
                const isSelected = m.id === selectedMachineId;
                const isOff = m.status === 'OFFLINE';
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={isOff}
                    className={`machine-select-tile ${isSelected ? 'selected' : ''} ${isOff ? 'disabled' : ''}`}
                    onClick={() => {
                      setSelectedMachineId(m.id);
                      setSelectedSlot(null);
                      setErrorMessage('');
                    }}
                  >
                    <div className="tile-top">
                      <span className="tile-num">No. {m.machineNumber}</span>
                      <span className={`tile-status ${m.status.toLowerCase()}`}>
                        {m.status}
                      </span>
                    </div>
                    <span className="tile-name">{m.name}</span>
                    <span className="tile-floor">{m.floor} • {m.capacityKg}kg</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Date Selector */}
          <div className="form-section">
            <label className="form-label">
              <Calendar size={16} />
              <span>Select Date</span>
            </label>
            <div className="date-tabs">
              {['Today', 'Tomorrow'].map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`date-tab ${selectedDate === d ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedDate(d);
                    setSelectedSlot(null);
                    setErrorMessage('');
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Time Slot Picker with Double-Booking Prevention */}
          <div className="form-section">
            <div className="slot-section-header">
              <label className="form-label">
                <Clock size={16} />
                <span>Choose Time Slot</span>
              </label>
              <div className="slot-legend">
                <span className="legend-item"><span className="legend-dot available" /> Available</span>
                <span className="legend-item"><span className="legend-dot booked" /> Reserved</span>
              </div>
            </div>

            <div className="time-slots-grid">
              {TIME_SLOTS.map((slot) => {
                const isBooked = !!bookedSlotsMap[slot];
                const isSelected = selectedSlot === slot;
                const bookingDetails = bookedSlotsMap[slot];

                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={isBooked}
                    className={`time-slot-chip ${isSelected ? 'selected' : ''} ${isBooked ? 'booked' : 'available'}`}
                    onClick={() => {
                      if (!isBooked) {
                        setSelectedSlot(slot);
                        setErrorMessage('');
                      }
                    }}
                    title={isBooked ? `Reserved by ${bookingDetails.userName} (${bookingDetails.roomNumber})` : 'Available to book'}
                  >
                    <span className="slot-time-text">{slot}</span>
                    <span className="slot-availability-tag">
                      {isBooked ? (
                        <>Booked • {bookingDetails.roomNumber || 'Resident'}</>
                      ) : isSelected ? (
                        <><Check size={12} /> Selected</>
                      ) : (
                        'Available'
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 4: Wash Cycle Type & Temperature */}
          <div className="form-two-col">
            <div className="form-section">
              <label className="form-label">
                <Sparkles size={16} />
                <span>Wash Cycle Preset</span>
              </label>
              <select
                value={selectedCycleId}
                onChange={(e) => setSelectedCycleId(e.target.value)}
                className="custom-select"
              >
                {CYCLE_TYPES.map((cycle) => (
                  <option key={cycle.id} value={cycle.id}>
                    {cycle.name} ({cycle.duration} min)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-section">
              <label className="form-label">
                <Thermometer size={16} />
                <span>Water Temperature</span>
              </label>
              <select
                value={selectedTemp}
                onChange={(e) => setSelectedTemp(e.target.value)}
                className="custom-select"
              >
                <option value="Cold (Eco)">Cold (Eco) - 20°C</option>
                <option value="30°C Warm">30°C Mild Warm</option>
                <option value="40°C Standard">40°C Standard</option>
                <option value="60°C Sanitized">60°C Sanitized</option>
              </select>
            </div>
          </div>

          {/* Quota warning */}
          {isQuotaReached && (
            <div className="quota-warning-banner">
              <AlertCircle size={16} />
              <span>Daily limit reached (2/2 slots booked). You cannot book more slots for {selectedDate}.</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="form-error-banner">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Booking Summary Box */}
          <div className="booking-summary-box">
            <div className="summary-row">
              <span className="summary-label">Resident:</span>
              <strong className="summary-value">{currentUser.name} ({currentUser.roomNumber})</strong>
            </div>
            <div className="summary-row">
              <span className="summary-label">Machine:</span>
              <strong className="summary-value">{selectedMachine.name} • {selectedMachine.floor}</strong>
            </div>
            <div className="summary-row">
              <span className="summary-label">Reserved Slot:</span>
              <strong className="summary-value text-primary">
                {selectedDate}, {selectedSlot || 'Please pick a slot'}
              </strong>
            </div>
            <div className="summary-row">
              <span className="summary-label">Cycle Details:</span>
              <strong className="summary-value">{selectedCycle.name} • {selectedTemp}</strong>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={!selectedSlot || isQuotaReached || isSubmitting}
            >
              {isSubmitting ? (
                <span className="btn-spinner" />
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Confirm Slot Reservation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
