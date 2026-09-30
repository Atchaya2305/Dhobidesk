import { useState } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Trash2, 
  CheckCheck, 
  Clock, 
  Sparkles,
  Inbox
} from 'lucide-react';

export default function NotificationsView({ 
  notifications, 
  onMarkAllRead, 
  onMarkOneRead, 
  onClearAllNotifs 
}) {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'unread' | 'completed'

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifs = notifications.filter((n) => {
    if (filterType === 'unread') return !n.read;
    if (filterType === 'completed') return n.type === 'success';
    return true;
  });

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} className="notif-icon-success" />;
      case 'warning':
        return <AlertTriangle size={18} className="notif-icon-warning" />;
      case 'alert':
        return <AlertTriangle size={18} className="notif-icon-alert" />;
      default:
        return <Info size={18} className="notif-icon-info" />;
    }
  };

  return (
    <div className="notifications-view-container">
      {/* Header */}
      <div className="view-header">
        <div>
          <div className="title-with-badge">
            <h2 className="view-title">Laundry Notifications & Alerts</h2>
            {unreadCount > 0 && (
              <span className="notif-unread-pill">{unreadCount} Unread</span>
            )}
          </div>
          <p className="view-subtitle">Live IoT telemetry alerts, cycle completion notices and slot confirmations</p>
        </div>

        <div className="header-actions-row">
          {unreadCount > 0 && (
            <button 
              type="button" 
              className="btn-secondary"
              onClick={onMarkAllRead}
            >
              <CheckCheck size={16} />
              <span>Mark All as Read</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button 
              type="button" 
              className="btn-outline-danger"
              onClick={onClearAllNotifs}
            >
              <Trash2 size={16} />
              <span>Clear Feed</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="notif-filters-bar">
        <button
          type="button"
          className={`notif-filter-tab ${filterType === 'all' ? 'active' : ''}`}
          onClick={() => setFilterType('all')}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          type="button"
          className={`notif-filter-tab ${filterType === 'unread' ? 'active' : ''}`}
          onClick={() => setFilterType('unread')}
        >
          Unread ({unreadCount})
        </button>
        <button
          type="button"
          className={`notif-filter-tab ${filterType === 'completed' ? 'active' : ''}`}
          onClick={() => setFilterType('completed')}
        >
          Cycles Completed
        </button>
      </div>

      {/* List */}
      <div className="notifications-full-list">
        {filteredNotifs.length === 0 ? (
          <div className="empty-state-card">
            <Inbox size={44} className="empty-icon" />
            <h3>No notifications here</h3>
            <p>You are all caught up! New alerts will appear here when machines change status or cycles finish.</p>
          </div>
        ) : (
          filteredNotifs.map((item, idx) => (
            <div 
              key={item.id ? `${item.id}_${idx}` : `notif_${idx}`}
              className={`notification-item-card ${!item.read ? 'unread' : 'read'} type-${item.type}`}
              onClick={() => onMarkOneRead && onMarkOneRead(item.id)}
            >
              <div className="notif-item-left">
                <div className={`notif-icon-avatar icon-${item.type}`}>
                  {getIcon(item.type)}
                </div>
                <div className="notif-text-block">
                  <div className="notif-title-row">
                    <strong className="notif-item-title">{item.title}</strong>
                    {!item.read && <span className="new-badge">NEW</span>}
                  </div>
                  <p className="notif-item-desc">{item.message}</p>
                  <span className="notif-item-time">
                    <Clock size={12} className="inline-clock" />
                    <span>{item.timestamp}</span>
                  </span>
                </div>
              </div>

              {!item.read && (
                <div className="notif-unread-indicator" title="Unread alert" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
