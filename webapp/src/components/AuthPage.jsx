import { useState } from 'react';
import { 
  Waves, 
  LogIn, 
  UserPlus, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  Home, 
  ShieldCheck, 
  Sparkles, 
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Shield,
  GraduationCap,
  Clock,
  X
} from 'lucide-react';
import { INITIAL_USER, INITIAL_STUDENT_2, INITIAL_ADMIN_USER } from '../data/mockData';

export default function AuthPage({ 
  onLoginSuccess, 
  onRegisterRequest,
  pendingUsers = [],
  registeredUsers = []
}) {
  const [isRegister, setIsRegister] = useState(false);
  const [roleMode, setRoleMode] = useState('student'); // 'student' | 'admin'
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [submittedStudentName, setSubmittedStudentName] = useState('');
  const [pendingAlertMessage, setPendingAlertMessage] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    roomNumber: '',
    hostelBlock: 'Block B (Kaveri)',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs = {};
    if (isRegister) {
      if (!formData.name.trim()) errs.name = 'Full name is required';
      if (!formData.phone.trim()) {
        errs.phone = 'Phone number is required';
      } else if (!/^\d{10}$/.test(formData.phone.replace(/[\s-]/g, ''))) {
        errs.phone = 'Enter a valid 10-digit phone number';
      }
      if (!formData.roomNumber.trim()) errs.roomNumber = 'Room number is required (e.g. Room 204)';
      if (formData.password.length < 6) errs.password = 'Password must be at least 6 characters';
      if (formData.password !== formData.confirmPassword) {
        errs.confirmPassword = 'Passwords do not match';
      }
    }

    if (!formData.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errs.email = 'Please enter a valid email address';
    }

    if (!isRegister && !formData.password) {
      errs.password = 'Password is required';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setPendingAlertMessage(null);
    if (!validate()) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (isRegister) {
        // REGISTRATION FLOW: Submit for Warden Approval
        const initials = formData.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        const newStudentRequest = {
          id: 'req_' + Date.now(),
          uid: 'user_' + Date.now(),
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          roomNumber: formData.roomNumber,
          hostelBlock: formData.hostelBlock,
          requestedAt: 'Just now',
          status: 'pending',
          role: 'student',
          dailyLimit: 2,
          avatarInitials: initials || 'ST',
        };

        if (onRegisterRequest) {
          onRegisterRequest(newStudentRequest);
        }

        setSubmittedStudentName(formData.name);
        setSubmittedSuccess(true);
        setIsRegister(false);
        setFormData((prev) => ({ ...prev, password: '', confirmPassword: '' }));
      } else {
        // SIGN IN FLOW: Check verification and approvals
        const trimmedEmail = formData.email.trim().toLowerCase();

        // 1. Check if user is in pending queue
        const pendingEntry = pendingUsers.find(
          (p) => p.email.toLowerCase() === trimmedEmail
        );

        if (pendingEntry) {
          if (pendingEntry.status === 'pending') {
            setPendingAlertMessage({
              type: 'pending',
              title: 'Account Awaiting Warden Approval ⏳',
              message: `Your registration for ${pendingEntry.roomNumber} (${pendingEntry.hostelBlock}) was submitted on ${pendingEntry.requestedAt} and is currently awaiting verification from Prof. K. Sundaram (Hostel Warden). You will be granted access once approved.`
            });
            return;
          }
          if (pendingEntry.status === 'rejected') {
            setPendingAlertMessage({
              type: 'rejected',
              title: 'Registration Application Declined ✕',
              message: `Your account request was reviewed by the administration and was declined. Reason: ${pendingEntry.rejectReason || 'Room number verification mismatch'}. Please visit the warden office.`
            });
            return;
          }
        }

        // 2. Check if admin role or student
        const isAdmin = roleMode === 'admin' || 
          trimmedEmail.includes('admin') || 
          trimmedEmail.includes('warden');

        if (isAdmin) {
          onLoginSuccess(INITIAL_ADMIN_USER);
          return;
        }

        // 3. Check registered verified users
        const verifiedUser = registeredUsers.find(
          (u) => u.email.toLowerCase() === trimmedEmail
        );

        if (verifiedUser) {
          onLoginSuccess(verifiedUser);
          return;
        }

        // 4. Default mock student (Arun)
        const user = {
          ...INITIAL_USER,
          email: formData.email,
        };
        onLoginSuccess(user);
      }
    }, 500);
  };

  const handleDemoLogin = (type) => {
    setLoading(true);
    setPendingAlertMessage(null);
    setTimeout(() => {
      setLoading(false);
      if (type === 'arun') {
        onLoginSuccess(INITIAL_USER);
      } else if (type === 'priya') {
        onLoginSuccess(INITIAL_STUDENT_2);
      } else if (type === 'admin') {
        onLoginSuccess(INITIAL_ADMIN_USER);
      }
    }, 350);
  };

  return (
    <div className="auth-container">
      {/* Background ambient lighting */}
      <div className="auth-ambient-circle-1" />
      <div className="auth-ambient-circle-2" />

      <div className="auth-split-layout">
        {/* Left Side: Pictorial Hero Showcase of the Hostel Laundry Facility */}
        <div className="auth-hero-showcase">
          <div className="auth-hero-image-wrap">
            <img 
              src="/assets/laundry-lounge.jpg" 
              alt="DhobiDesk Luxury Hostel Laundry Lounge" 
              className="auth-hero-bg-img"
            />
            <div className="auth-hero-overlay" />
          </div>

          <div className="auth-hero-content">
            <div className="auth-hero-brand">
              <div className="auth-hero-logo-badge">
                <Waves size={24} />
              </div>
              <span className="auth-hero-brand-name">DHOBIDESK</span>
            </div>

            <div className="auth-hero-text-block">
              <span className="auth-hero-tag">SMART HOSTEL LAUNDRY OPERATIONS</span>
              <h2 className="auth-hero-title">Your Campus Laundry, <em>Elevated.</em></h2>
              <p className="auth-hero-desc">
                Experience seamless zero-queue washing with live IoT sensor telemetry, automated slot reservations, and Warden-verified student safety.
              </p>
            </div>

            <div className="auth-hero-features-grid">
              <div className="auth-feat-item">
                <div className="auth-feat-icon">
                  <Sparkles size={16} />
                </div>
                <div>
                  <strong>Double-Booking Shield</strong>
                  <span>Exclusive reserved time windows with zero waiting</span>
                </div>
              </div>

              <div className="auth-feat-item">
                <div className="auth-feat-icon">
                  <Clock size={16} />
                </div>
                <div>
                  <strong>Live Cycle Telemetry</strong>
                  <span>Watch real-time water, RPM & remaining time</span>
                </div>
              </div>

              <div className="auth-feat-item">
                <div className="auth-feat-icon">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <strong>Warden Verification</strong>
                  <span>Hostel room identity verification before access</span>
                </div>
              </div>
            </div>

            {/* Quick Demo Access Bar */}
            <div className="auth-demo-quick-bar">
              <span className="auth-demo-label">ONE-CLICK DEMO ACCESS:</span>
              <div className="auth-demo-buttons">
                <button
                  type="button"
                  className="btn-demo-pill"
                  onClick={() => handleDemoLogin('student')}
                >
                  <GraduationCap size={14} />
                  <span>Student (Ananya - Room 204)</span>
                </button>
                <button
                  type="button"
                  className="btn-demo-pill"
                  onClick={() => handleDemoLogin('admin')}
                >
                  <Shield size={14} />
                  <span>Warden / Admin (PIN 1234)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Form Card */}
        <div className="auth-card-wrapper">
          {/* Brand Header */}
          <div className="auth-brand-header">
            <div className="auth-logo-badge">
              <Waves className="auth-logo-icon" size={26} />
            </div>
            <h1 className="auth-title">Welcome to DhobiDesk</h1>
            <p className="auth-subtitle">Smart Hostel Laundry Management System</p>
            <div className="auth-tagline-pill">
              <Sparkles size={13} className="sparkle-icon" />
              <span>Campus Washer Fleet Operations</span>
            </div>
          </div>

        {/* REGISTRATION SUBMITTED SUCCESS BANNER */}
        {submittedSuccess && (
          <div className="auth-alert-box success">
            <div className="auth-alert-icon">
              <Clock size={20} />
            </div>
            <div className="auth-alert-content">
              <strong>Application Dispatched to Warden! ⏳</strong>
              <p>
                Registration for <strong>{submittedStudentName}</strong> has been submitted. In accordance with hostel policy, new accounts require approval by <strong>Prof. K. Sundaram (Hostel Warden)</strong> before first login.
              </p>
            </div>
            <button 
              type="button" 
              className="auth-alert-close"
              onClick={() => setSubmittedSuccess(false)}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* PENDING APPROVAL ALERT MESSAGE */}
        {pendingAlertMessage && (
          <div className={`auth-alert-box ${pendingAlertMessage.type}`}>
            <div className="auth-alert-icon">
              <AlertCircle size={20} />
            </div>
            <div className="auth-alert-content">
              <strong>{pendingAlertMessage.title}</strong>
              <p>{pendingAlertMessage.message}</p>
            </div>
            <button 
              type="button" 
              className="auth-alert-close"
              onClick={() => setPendingAlertMessage(null)}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Tab Toggle (Sign In / Register) */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${!isRegister ? 'active' : ''}`}
            onClick={() => {
              setIsRegister(false);
              setErrors({});
              setPendingAlertMessage(null);
            }}
          >
            <LogIn size={16} />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            className={`auth-tab ${isRegister ? 'active' : ''}`}
            onClick={() => {
              setIsRegister(true);
              setErrors({});
              setPendingAlertMessage(null);
            }}
          >
            <UserPlus size={16} />
            <span>New Student Registration</span>
          </button>
        </div>

        {/* Role Mode Selector for Sign In */}
        {!isRegister && (
          <div className="auth-role-selector">
            <button
              type="button"
              className={`role-select-btn ${roleMode === 'student' ? 'active' : ''}`}
              onClick={() => {
                setRoleMode('student');
                setFormData((prev) => ({ ...prev, email: 'student@hostel.edu' }));
                setPendingAlertMessage(null);
              }}
            >
              <GraduationCap size={16} />
              <span>Hostel Student</span>
            </button>
            <button
              type="button"
              className={`role-select-btn ${roleMode === 'admin' ? 'active' : ''}`}
              onClick={() => {
                setRoleMode('admin');
                setFormData((prev) => ({ ...prev, email: 'warden@hostel.edu' }));
                setPendingAlertMessage(null);
              }}
            >
              <Shield size={16} />
              <span>Administrator / Warden</span>
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {isRegister && (
            <>
              {/* Registration notice */}
              <div className="auth-policy-notice">
                <ShieldCheck size={16} />
                <span>
                  All registrations are verified against hostel room records by the Warden before activation.
                </span>
              </div>

              {/* Full Name */}
              <div className="auth-input-group">
                <label className="auth-label">Student Full Name</label>
                <div className="auth-input-field">
                  <User className="input-icon" size={17} />
                  <input
                    type="text"
                    placeholder="e.g. Ananya Iyer"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={errors.name ? 'has-error' : ''}
                  />
                </div>
                {errors.name && <span className="error-text"><AlertCircle size={13} /> {errors.name}</span>}
              </div>

              {/* Phone & Room Number Grid */}
              <div className="auth-two-col">
                <div className="auth-input-group">
                  <label className="auth-label">Mobile Number</label>
                  <div className="auth-input-field">
                    <Phone className="input-icon" size={17} />
                    <input
                      type="tel"
                      placeholder="10-digit mobile"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={errors.phone ? 'has-error' : ''}
                    />
                  </div>
                  {errors.phone && <span className="error-text"><AlertCircle size={13} /> {errors.phone}</span>}
                </div>

                <div className="auth-input-group">
                  <label className="auth-label">Hostel Room</label>
                  <div className="auth-input-field">
                    <Home className="input-icon" size={17} />
                    <input
                      type="text"
                      placeholder="e.g. Room 314"
                      value={formData.roomNumber}
                      onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                      className={errors.roomNumber ? 'has-error' : ''}
                    />
                  </div>
                  {errors.roomNumber && <span className="error-text"><AlertCircle size={13} /> {errors.roomNumber}</span>}
                </div>
              </div>

              {/* Hostel Block Select */}
              <div className="auth-input-group">
                <label className="auth-label">Hostel Residence Hall</label>
                <div className="auth-input-field">
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
              </div>
            </>
          )}

          {/* Email Address */}
          <div className="auth-input-group">
            <label className="auth-label">
              {roleMode === 'admin' && !isRegister ? 'Staff Email' : 'Student Email'}
            </label>
            <div className="auth-input-field">
              <Mail className="input-icon" size={17} />
              <input
                type="email"
                placeholder={roleMode === 'admin' ? 'warden@hostel.edu' : 'student.id@hostel.edu'}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={errors.email ? 'has-error' : ''}
              />
            </div>
            {errors.email && <span className="error-text"><AlertCircle size={13} /> {errors.email}</span>}
          </div>

          {/* Password */}
          <div className="auth-input-group">
            <label className="auth-label">
              {roleMode === 'admin' && !isRegister ? 'Admin Security Password / PIN (e.g. 1234)' : 'Password'}
            </label>
            <div className="auth-input-field">
              <Lock className="input-icon" size={17} />
              <input
                type="password"
                placeholder={roleMode === 'admin' ? 'Enter admin PIN or password' : 'Enter your password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={errors.password ? 'has-error' : ''}
              />
            </div>
            {errors.password && <span className="error-text"><AlertCircle size={13} /> {errors.password}</span>}
          </div>

          {isRegister && (
            <div className="auth-input-group">
              <label className="auth-label">Confirm Password</label>
              <div className="auth-input-field">
                <Lock className="input-icon" size={17} />
                <input
                  type="password"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={errors.confirmPassword ? 'has-error' : ''}
                />
              </div>
              {errors.confirmPassword && (
                <span className="error-text"><AlertCircle size={13} /> {errors.confirmPassword}</span>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? (
              <span className="btn-spinner" />
            ) : (
              <>
                <span>
                  {isRegister 
                    ? 'Submit Registration for Warden Approval' 
                    : roleMode === 'admin' 
                    ? 'Access Administrator Console' 
                    : 'Sign In as Student'}
                </span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* 1-Click Instant Demo Portals */}
        <div className="auth-demo-section">
          <div className="demo-divider">
            <span>Or test immediately via 1-click accounts</span>
          </div>

          {/* Student Demos */}
          <div className="demo-group-label">AUTHORIZED STUDENT PORTALS</div>
          <div className="demo-buttons-grid">
            <button
              type="button"
              className="demo-btn"
              onClick={() => handleDemoLogin('arun')}
            >
              <div className="demo-avatar">AS</div>
              <div className="demo-info">
                <strong>Arun Sharma (Verified)</strong>
                <span>Room 204 • Block B (Kaveri)</span>
              </div>
            </button>

            <button
              type="button"
              className="demo-btn"
              onClick={() => handleDemoLogin('priya')}
            >
              <div className="demo-avatar demo-avatar-alt">PP</div>
              <div className="demo-info">
                <strong>Priya Patel (Verified)</strong>
                <span>Room 108 • Block A (Ganga)</span>
              </div>
            </button>
          </div>

          {/* Administrator Demo */}
          <div className="demo-group-label admin-label">ADMINISTRATOR PORTAL (APPROVER)</div>
          <button
            type="button"
            className="demo-btn demo-btn-admin"
            onClick={() => handleDemoLogin('admin')}
          >
            <div className="demo-avatar demo-avatar-admin">
              <ShieldCheck size={18} />
            </div>
            <div className="demo-info">
              <div className="demo-admin-title">
                <strong>Prof. K. Sundaram (Hostel Warden)</strong>
                <span className="admin-chip">APPROVER ACCESS</span>
              </div>
              <span>Review & approve pending student registrations, manage faults & tokens</span>
            </div>
          </button>
        </div>

        {/* Footer info */}
        <div className="auth-footer">
          <CheckCircle2 size={14} className="safe-icon" />
          <span>Warden Verification Gate • Unapproved Accounts Held in Queue</span>
        </div>
      </div>
    </div>
  </div>
);
}
