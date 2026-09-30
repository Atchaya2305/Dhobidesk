import { 
  LayoutDashboard, 
  Layers, 
  CalendarClock, 
  Bell, 
  UserCheck, 
  ShieldCheck, 
  Waves, 
  Radio, 
  X,
  AlertTriangle,
  FileSpreadsheet,
  Shield,
  GraduationCap,
  LogOut
} from 'lucide-react';

export default function Sidebar({ 
  activeSection, 
  setActiveSection, 
  unreadCount, 
  activeBookingsCount,
  activeFaultsCount = 0,
  pendingApprovalsCount = 0,
  onOpenAdmin,
  isMobileOpen,
  setIsMobileOpen,
  user,
  onLogout
}) {
  const isAdmin = user?.role === 'admin';

  // Navigation Items tailored by role
  const studentNavItems = [
    { id: 'dashboard', label: 'Dashboard & Fleet', icon: LayoutDashboard },
    { id: 'machines', label: 'Washing Machines', icon: Layers },
    { 
      id: 'bookings', 
      label: 'My Bookings', 
      icon: CalendarClock,
      badge: activeBookingsCount > 0 ? activeBookingsCount : null,
      badgeType: 'primary'
    },
    { 
      id: 'notifications', 
      label: 'Notifications', 
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : null,
      badgeType: 'alert'
    },
    { id: 'profile', label: 'Student Profile', icon: UserCheck },
  ];

  const adminNavItems = [
    { id: 'dashboard', label: 'Fleet & Diagnostics', icon: LayoutDashboard },
    { 
      id: 'approvals', 
      label: 'Student Approvals', 
      icon: UserCheck,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
      badgeType: 'alert'
    },
    { 
      id: 'faults', 
      label: 'Machine Fault Center', 
      icon: AlertTriangle,
      badge: activeFaultsCount > 0 ? activeFaultsCount : null,
      badgeType: 'alert'
    },
    { 
      id: 'bookings', 
      label: 'Hostel Tokens Roster', 
      icon: FileSpreadsheet,
      badge: activeBookingsCount > 0 ? activeBookingsCount : null,
      badgeType: 'primary'
    },
    { 
      id: 'notifications', 
      label: 'System Alerts & Logs', 
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : null,
      badgeType: 'alert'
    },
    { id: 'profile', label: 'Admin Settings', icon: ShieldCheck },
  ];

  const navItems = isAdmin ? adminNavItems : studentNavItems;

  const handleNavClick = (id) => {
    setActiveSection(id);
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobileOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setIsMobileOpen(false)} 
        />
      )}

      <aside className={`sidebar-container ${isMobileOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-logo-container">
            <div className="brand-icon-wrapper">
              <Waves className="brand-icon" size={22} />
            </div>
            <div className="brand-text">
              <h2 className="brand-name">DhobiDesk</h2>
              <span className="brand-tagline">
                {isAdmin ? 'Hostel Administration' : 'Smart Hostel Laundry'}
              </span>
            </div>
          </div>

          {/* Mobile close button */}
          <button 
            type="button" 
            className="sidebar-close-btn"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close Sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Role Badge Indicator */}
        <div className={`sidebar-role-indicator ${isAdmin ? 'admin-role' : 'student-role'}`}>
          {isAdmin ? (
            <>
              <Shield size={14} className="role-icon" />
              <span>Administrator Portal</span>
            </>
          ) : (
            <>
              <GraduationCap size={14} className="role-icon" />
              <span>Resident Student Portal</span>
            </>
          )}
        </div>

        {/* Live IoT Status Pill */}
        <div className="sidebar-iot-badge">
          <div className="iot-pulse-dot" />
          <div className="iot-text">
            <span>Campus IoT Mesh: </span>
            <strong className="text-emerald-500">Online</strong>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="sidebar-nav">
          <span className="nav-section-title">
            {isAdmin ? 'ADMINISTRATIVE TOOLS' : 'MAIN NAVIGATION'}
          </span>
          <ul className="nav-list">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <li key={item.id} className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => handleNavClick(item.id)}
                  >
                    <div className="nav-link-left">
                      <Icon size={19} className="nav-icon" />
                      <span className="nav-label">{item.label}</span>
                    </div>
                    {item.badge !== null && item.badge !== undefined && (
                      <span className={`nav-badge ${item.badgeType}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Administration operations modal button ONLY shown to Admin */}
          {isAdmin && (
            <>
              <div className="nav-divider" />
              <span className="nav-section-title">QUICK OVERRIDES</span>
              <ul className="nav-list">
                <li className="nav-item">
                  <button
                    type="button"
                    className="nav-link admin-link"
                    onClick={() => {
                      onOpenAdmin();
                      if (setIsMobileOpen) setIsMobileOpen(false);
                    }}
                  >
                    <div className="nav-link-left">
                      <ShieldCheck size={19} className="nav-icon admin-icon" />
                      <span className="nav-label">Fleet Override Dialog</span>
                    </div>
                    <span className="admin-lock-badge">PIN 1234</span>
                  </button>
                </li>
              </ul>
            </>
          )}
        </nav>

        {/* System telemetry indicator */}
        <div className="system-status-indicator">
          <span>
            <span className="system-dot" />
            Active Fleet
          </span>
          <span className="system-badge">6 Units Stream</span>
        </div>

        {/* User quick profile footer */}
        <div className="sidebar-footer">
          <div className="user-quick-profile">
            <div className={`user-quick-avatar ${isAdmin ? 'admin-avatar' : ''}`}>
              {user?.avatarInitials || (isAdmin ? 'AD' : 'ST')}
            </div>
            <div className="user-quick-info">
              <span className="user-quick-name">{user?.name || 'User'}</span>
              <span className="user-quick-room">{user?.roomNumber || 'Hostel'}</span>
            </div>
          </div>
          {onLogout && (
            <button
              type="button"
              className="logout-icon-btn"
              onClick={onLogout}
              title="Sign Out / Switch Portal"
              aria-label="Sign Out"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
