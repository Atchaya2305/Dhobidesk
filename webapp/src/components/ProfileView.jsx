import { useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Home, 
  ShieldCheck, 
  Sparkles, 
  Edit3, 
  Check, 
  X, 
  Droplet, 
  Award, 
  CalendarCheck,
  CheckCircle2,
  Info
} from 'lucide-react';

export default function ProfileView({ user, onUpdateUser, bookings }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    roomNumber: user?.roomNumber || '',
    hostelBlock: user?.hostelBlock || 'Block B (Kaveri)',
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // User's total bookings
  const myBookings = bookings.filter((b) => b.userId === user?.uid);
  const completedWashes = myBookings.filter((b) => b.status === 'completed').length;
  const activeCount = myBookings.filter((b) => b.status === 'active' || b.status === 'upcoming').length;

  const handleSave = (e) => {
    e.preventDefault();
    const initials = formData.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const updated = {
      ...user,
      name: formData.name,
      phone: formData.phone,
      roomNumber: formData.roomNumber,
      hostelBlock: formData.hostelBlock,
      avatarInitials: initials || user.avatarInitials,
    };

    onUpdateUser(updated);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="profile-view-container">
      {/* Header */}
      <div className="view-header">
        <div>
          <h2 className="view-title">Student Profile & Preferences</h2>
          <p className="view-subtitle">Manage your student credentials, room allocation and laundry statistics</p>
        </div>
        {!isEditing && (
          <button 
            type="button" 
            className="btn-secondary"
            onClick={() => setIsEditing(true)}
          >
            <Edit3 size={16} />
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      {saveSuccess && (
        <div className="save-success-banner">
          <CheckCircle2 size={16} />
          <span>Profile changes saved successfully!</span>
        </div>
      )}

      {/* Main Profile Grid */}
      <div className="profile-grid">
        {/* Left Card: Student Credentials & Avatar */}
        <div className="profile-main-card">
          <div className="profile-avatar-row">
            <div className="profile-large-avatar">
              {user?.avatarInitials || 'ST'}
            </div>
            <div className="profile-name-group">
              <h3 className="profile-fullname">{user?.name}</h3>
              <span className="profile-role-badge">Hostel Resident</span>
              <span className="profile-hostel-sub">{user?.hostelBlock}</span>
            </div>
          </div>

          <div className="profile-divider" />

          {isEditing ? (
            <form onSubmit={handleSave} className="profile-edit-form">
              <div className="edit-field">
                <label>Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="edit-field">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>

              <div className="edit-field">
                <label>Room Number</label>
                <input
                  type="text"
                  value={formData.roomNumber}
                  onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                  required
                />
              </div>

              <div className="edit-field">
                <label>Hostel Block</label>
                <select
                  value={formData.hostelBlock}
                  onChange={(e) => setFormData({ ...formData, hostelBlock: e.target.value })}
                >
                  <option value="Block A (Ganga)">Block A (Ganga)</option>
                  <option value="Block B (Kaveri)">Block B (Kaveri)</option>
                  <option value="Block C (Yamuna)">Block C (Yamuna)</option>
                  <option value="Block D (Godavari)">Block D (Godavari)</option>
                </select>
              </div>

              <div className="edit-actions">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setIsEditing(false)}
                >
                  <X size={15} /> Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <Check size={15} /> Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-details-list">
              <div className="profile-detail-row">
                <div className="detail-icon"><Mail size={16} /></div>
                <div className="detail-content">
                  <span className="detail-label">Email Address</span>
                  <strong className="detail-value">{user?.email}</strong>
                </div>
              </div>

              <div className="profile-detail-row">
                <div className="detail-icon"><Phone size={16} /></div>
                <div className="detail-content">
                  <span className="detail-label">Mobile Phone</span>
                  <strong className="detail-value">{user?.phone || 'Not set'}</strong>
                </div>
              </div>

              <div className="profile-detail-row">
                <div className="detail-icon"><Home size={16} /></div>
                <div className="detail-content">
                  <span className="detail-label">Allocated Room</span>
                  <strong className="detail-value">{user?.roomNumber}</strong>
                </div>
              </div>

              <div className="profile-detail-row">
                <div className="detail-icon"><ShieldCheck size={16} /></div>
                <div className="detail-content">
                  <span className="detail-label">Hostel Building</span>
                  <strong className="detail-value">{user?.hostelBlock}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Quota & Metrics */}
        <div className="profile-stats-col">
          {/* Daily Quota Card */}
          <div className="profile-stat-card quota-card">
            <div className="stat-card-header">
              <div className="stat-icon-box bg-blue">
                <CalendarCheck size={20} className="text-primary" />
              </div>
              <div>
                <h4>Daily Washing Quota</h4>
                <span className="stat-sub">Hostel Regulation: 2 slots / day</span>
              </div>
            </div>

            <div className="quota-meter-wrapper">
              <div className="quota-labels">
                <span>Slots Booked Today</span>
                <strong>{activeCount} of {user?.dailyLimit || 2} used</strong>
              </div>
              <div className="quota-track">
                <div 
                  className="quota-fill" 
                  style={{ width: `${Math.min(100, (activeCount / (user?.dailyLimit || 2)) * 100)}%` }} 
                />
              </div>
            </div>

            <p className="quota-hint">
              {activeCount >= (user?.dailyLimit || 2)
                ? 'Your daily quota is fully booked. Slots reset tomorrow at midnight.'
                : `You have ${(user?.dailyLimit || 2) - activeCount} free slot(s) remaining for today.`}
            </p>
          </div>

          {/* Eco Stats Card */}
          <div className="profile-stat-card eco-card">
            <div className="stat-card-header">
              <div className="stat-icon-box bg-emerald">
                <Award size={20} className="text-emerald" />
              </div>
              <div>
                <h4>Eco Efficiency Stats</h4>
                <span className="stat-sub">Automated IoT Water Conservation</span>
              </div>
            </div>

            <div className="eco-metrics-grid">
              <div className="eco-metric">
                <strong className="eco-num">{completedWashes}</strong>
                <span className="eco-label">Total Cycles Run</span>
              </div>

              <div className="eco-metric">
                <strong className="eco-num">{completedWashes * 28}L</strong>
                <span className="eco-label">Water Conserved</span>
              </div>

              <div className="eco-metric">
                <strong className="eco-num">98%</strong>
                <span className="eco-label">Eco Score</span>
              </div>
            </div>
          </div>

          {/* Hostel Guidelines notice */}
          <div className="guidelines-card">
            <div className="guideline-header">
              <Info size={16} />
              <strong>Hostel Laundry Etiquette</strong>
            </div>
            <ul className="guidelines-list">
              <li>Please collect washed laundry promptly within 15 minutes of completion.</li>
              <li>Clean the lint and detergent tray after every cycle.</li>
              <li>Do not wash heavy blankets in 6 kg express machines (use Machine 05).</li>
            </ul>
          </div>

          {/* Pictorial Facility Showcase */}
          <div className="profile-facility-showcase-card">
            <div className="profile-facility-img-wrap">
              <img 
                src="/assets/laundry-lounge.jpg" 
                alt="Campus Laundry Lounge" 
                className="profile-facility-img" 
              />
              <div className="profile-facility-overlay" />
              <div className="profile-facility-badge">
                <Sparkles size={12} />
                <span>{user?.hostelBlock || 'Hostel Central Bay'}</span>
              </div>
            </div>
            <div className="profile-facility-info">
              <h4>Modern Smart Laundry Lounge</h4>
              <p>Equipped with 6 high-speed IoT washers, automated double-booking protection, and 24/7 telemetry monitoring.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
