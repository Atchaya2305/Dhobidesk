import { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  Bell, 
  LogOut, 
  PlusCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Clock, 
  ChevronDown,
  User,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function Navbar({ 
  user, 
  onLogout, 
  unreadCount, 
  notifications, 
  onMarkAllNotifsRead, 
  onOpenBookingModal,
  onOpenNotifsPage,
  setIsMobileOpen,
  activeSectionTitle
}) {
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const timeFormatted = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateFormatted = currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  const getNotifIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'warning': return <AlertTriangle size={16} className="text-amber-500" />;
      case 'alert': return <AlertTriangle size={16} className="text-rose-500" />;
      default: return <Info size={16} className="text-blue-500" />;
    }
  };

  return (
    <header className="topbar-container">
      {/* Left: Mobile hamburger & Welcome Header */}
      <div className="topbar-left">
        <button 
          type="button" 
          className="topbar-menu-toggle"
          onClick={() => setIsMobileOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu size={22} />
        </button>

        <div className="topbar-welcome">
          <div className="welcome-main">
            <span className="welcome-greeting">
              {user?.role === 'admin' ? (
                <>Admin Console: <strong>{user?.name || 'Warden'}</strong> 🛡️</>
              ) : (
                <>Welcome back, <strong>{user?.name?.split(' ')[0] || 'Student'}</strong> 👋</>
              )}
            </span>
            <span 
              className="welcome-room-pill"
              style={user?.role === 'admin' ? { background: 'var(--gold)', color: '#FFFFFF', fontWeight: 700 } : {}}
            >
              {user?.role === 'admin' ? 'WARDEN / ADMIN' : (user?.roomNumber || 'Room 204')}
            </span>
          </div>
          <span className="topbar-section-title">{activeSectionTitle}</span>
        </div>
      </div>

      {/* Right: Clock, Book Button, Notifications, User Profile */}
      <div className="topbar-right">
        {/* Live Clock Card */}
        <div className="topbar-clock-badge">
          <Clock size={15} className="clock-icon" />
          <div className="clock-text">
            <span className="clock-time">{timeFormatted}</span>
            <span className="clock-date">{dateFormatted}</span>
          </div>
        </div>

        {/* Quick Book Slot Button */}
        <button 
          type="button" 
          className="topbar-book-btn"
          onClick={onOpenBookingModal}
        >
          <PlusCircle size={16} />
          <span>Book Machine</span>
        </button>

        {/* Notifications Icon & Flyout */}
        <div className="topbar-notif-wrapper" ref={notifRef}>
          <button 
            type="button" 
            className="topbar-icon-btn"
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="topbar-badge-pulse">{unreadCount}</span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="notif-dropdown-menu">
              <div className="notif-dropdown-header">
                <div>
                  <h4>Notifications</h4>
                  <span className="notif-subtext">{unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}</span>
                </div>
                {unreadCount > 0 && (
                  <button 
                    type="button" 
                    className="notif-mark-read-btn"
                    onClick={onMarkAllNotifsRead}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="notif-dropdown-list">
                {notifications && notifications.length > 0 ? (
                  notifications.slice(0, 4).map((notif, idx) => (
                    <div 
                      key={notif.id ? `${notif.id}_${idx}` : `notif_${idx}`} 
                      className={`notif-dropdown-item ${!notif.read ? 'unread' : ''}`}
                    >
                      <div className="notif-item-icon">
                        {getNotifIcon(notif.type)}
                      </div>
                      <div className="notif-item-content">
                        <strong className="notif-item-title">{notif.title}</strong>
                        <p className="notif-item-msg">{notif.message}</p>
                        <span className="notif-item-time">{notif.timestamp}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="notif-empty">No notifications yet</div>
                )}
              </div>

              <div className="notif-dropdown-footer">
                <button 
                  type="button" 
                  className="notif-view-all-btn"
                  onClick={() => {
                    setShowNotifDropdown(false);
                    onOpenNotifsPage();
                  }}
                >
                  <span>View All Notifications</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill & Dropdown */}
        <div className="topbar-user-wrapper" ref={profileRef}>
          <button 
            type="button" 
            className="topbar-user-pill"
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
          >
            <div className="user-avatar">
              {user?.avatarInitials || 'AS'}
            </div>
            <div className="user-info-text">
              <span className="user-name">{user?.name || 'Student'}</span>
              <span className="user-meta">{user?.roomNumber || 'Hostel'}</span>
            </div>
            <ChevronDown size={14} className="user-chevron" />
          </button>

          {showProfileDropdown && (
            <div className="user-dropdown-menu">
              <div className="user-dropdown-header">
                <strong>{user?.name}</strong>
                <span>{user?.email}</span>
                <div className="user-block-tag">{user?.hostelBlock}</div>
              </div>
              <div className="user-dropdown-divider" />
              <button 
                type="button" 
                className="user-dropdown-item text-danger"
                onClick={onLogout}
              >
                <LogOut size={16} />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
