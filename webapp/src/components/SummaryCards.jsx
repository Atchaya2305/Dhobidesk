import { 
  Layers, 
  CheckCircle2, 
  RotateCw, 
  PackageCheck,
  TrendingUp,
  Sparkles
} from 'lucide-react';

export default function SummaryCards({ machines, bookings }) {
  const totalMachines = machines.length;
  const availableMachines = machines.filter((m) => m.status === 'IDLE').length;
  const washingMachines = machines.filter(
    (m) => m.status === 'WASHING' || m.status === 'SPINNING'
  ).length;
  const completedMachines = machines.filter((m) => m.status === 'COMPLETED').length;
  
  // Total completed bookings today
  const completedTodayCount = bookings.filter((b) => b.status === 'completed').length;

  const cards = [
    {
      id: 'total',
      title: 'Total Fleet Machines',
      value: totalMachines,
      label: 'Campus IoT Units',
      detail: 'Hostel Floors 1, 2 & 3',
      icon: Layers,
      colorClass: 'card-primary',
      iconBg: '#eff6ff',
      iconColor: '#2563eb',
      badge: 'Active Fleet',
      badgeColor: 'badge-blue',
    },
    {
      id: 'available',
      title: 'Available Machines',
      value: availableMachines,
      label: 'Ready for Wash',
      detail: availableMachines > 0 ? 'Instant slot booking open' : 'All machines in use',
      icon: CheckCircle2,
      colorClass: 'card-emerald',
      iconBg: '#ecfdf5',
      iconColor: '#10b981',
      badge: `${availableMachines} Free Now`,
      badgeColor: 'badge-emerald',
    },
    {
      id: 'washing',
      title: 'Currently Washing',
      value: washingMachines,
      label: 'In Operation',
      detail: 'Running wash / spin cycles',
      icon: RotateCw,
      colorClass: 'card-indigo',
      iconBg: '#f5f3ff',
      iconColor: '#7c3aed',
      badge: 'Live Motors',
      badgeColor: 'badge-indigo',
      spinningIcon: true,
    },
    {
      id: 'completed',
      title: 'Completed Cycles',
      value: completedMachines + completedTodayCount,
      label: 'Finished / Ready',
      detail: `${completedMachines} awaiting pickup in bays`,
      icon: PackageCheck,
      colorClass: 'card-amber',
      iconBg: '#fffbeb',
      iconColor: '#d97706',
      badge: `${completedMachines} Pickup Ready`,
      badgeColor: 'badge-amber',
    },
  ];

  return (
    <div className="summary-cards-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.id} className={`summary-kpi-card ${card.colorClass}`}>
            <div className="summary-kpi-top">
              <div 
                className="summary-icon-box"
                style={{ backgroundColor: card.iconBg, color: card.iconColor }}
              >
                <Icon size={24} className={card.spinningIcon && card.value > 0 ? 'spin-animation' : ''} />
              </div>
              <span className={`summary-status-pill ${card.badgeColor}`}>
                {card.badge}
              </span>
            </div>

            <div className="summary-kpi-main">
              <span className="summary-kpi-title">{card.title}</span>
              <div className="summary-kpi-value-row">
                <span className="summary-kpi-number">{card.value}</span>
                <span className="summary-kpi-unit">{card.label}</span>
              </div>
            </div>

            <div className="summary-kpi-footer">
              <span className="summary-kpi-detail">{card.detail}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
