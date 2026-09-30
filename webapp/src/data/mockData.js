// Mock initial data and local storage helpers for DhobiDesk

export const INITIAL_MACHINES = [
  {
    id: 'machine_01',
    machineNumber: '01',
    name: 'Washer 101',
    floor: 'Floor 1',
    type: 'Top Load',
    capacityKg: 7.0,
    status: 'IDLE', // IDLE, WASHING, SPINNING, COMPLETED, OFFLINE
    progress: 0,
    waterLevel: 0, // %
    rpm: 0,
    temperature: 24, // °C
    vibration: 0.02, // g
    cycleDurationMinutes: 30,
    remainingSeconds: 0,
    currentUserId: null,
    currentUser: null,
    currentRoom: null,
    cycleType: null,
    fault: null,
  },
  {
    id: 'machine_02',
    machineNumber: '02',
    name: 'Washer 102',
    floor: 'Floor 1',
    type: 'Front Load',
    capacityKg: 8.0,
    status: 'WASHING',
    progress: 48,
    waterLevel: 75,
    rpm: 780,
    temperature: 42,
    vibration: 0.22,
    cycleDurationMinutes: 35,
    remainingSeconds: 1090, // ~18 mins
    currentUserId: 'student_priya',
    currentUser: 'Priya Patel',
    currentRoom: 'Room 108',
    cycleType: 'Cotton Wash',
    fault: null,
  },
  {
    id: 'machine_03',
    machineNumber: '03',
    name: 'Washer 201',
    floor: 'Floor 2',
    type: 'Top Load',
    capacityKg: 7.0,
    status: 'SPINNING',
    progress: 85,
    waterLevel: 12,
    rpm: 1250,
    temperature: 36,
    vibration: 0.44,
    cycleDurationMinutes: 30,
    remainingSeconds: 320, // ~5 mins
    currentUserId: 'student_rahul',
    currentUser: 'Rahul Verma',
    currentRoom: 'Room 212',
    cycleType: 'Quick Spin',
    fault: null,
  },
  {
    id: 'machine_04',
    machineNumber: '04',
    name: 'Washer 202',
    floor: 'Floor 2',
    type: 'Front Load',
    capacityKg: 8.5,
    status: 'COMPLETED',
    progress: 100,
    waterLevel: 0,
    rpm: 0,
    temperature: 28,
    vibration: 0.01,
    cycleDurationMinutes: 35,
    remainingSeconds: 0,
    currentUserId: 'demo_user_1',
    currentUser: 'Arun Sharma',
    currentRoom: 'Room 204',
    cycleType: 'Normal Eco',
    fault: null,
  },
  {
    id: 'machine_05',
    machineNumber: '05',
    name: 'Washer 301',
    floor: 'Floor 3',
    type: 'Heavy Duty',
    capacityKg: 10.0,
    status: 'IDLE',
    progress: 0,
    waterLevel: 0,
    rpm: 0,
    temperature: 23,
    vibration: 0.01,
    cycleDurationMinutes: 45,
    remainingSeconds: 0,
    currentUserId: null,
    currentUser: null,
    currentRoom: null,
    cycleType: null,
    fault: {
      errorCode: 'WARN-VIB-02',
      title: 'High Vibration Warning',
      description: 'Accelerometer logged intermittent spikes (>0.62g) during high-speed extraction. Balance calibration recommended.',
      severity: 'warning',
      reportedAt: 'Today, 03:40 PM',
      sensorReading: 'Vibration Peak: 0.64g (Safe threshold: <0.45g)',
    },
  },
  {
    id: 'machine_06',
    machineNumber: '06',
    name: 'Washer 302',
    floor: 'Floor 3',
    type: 'Express Wash',
    capacityKg: 6.0,
    status: 'OFFLINE',
    progress: 0,
    waterLevel: 0,
    rpm: 0,
    temperature: 21,
    vibration: 0.00,
    cycleDurationMinutes: 20,
    remainingSeconds: 0,
    currentUserId: null,
    currentUser: null,
    currentRoom: null,
    cycleType: null,
    offlineReason: 'Drain valve sensor timeout (ERR-DRAIN-04)',
    fault: {
      errorCode: 'ERR-DRAIN-04',
      title: 'Drain Valve Sensor Timeout',
      description: 'Discharge flow rate below 0.15 L/s during spin-drain. Pressure sensor indicates lint trap obstruction.',
      severity: 'critical',
      reportedAt: 'Today, 02:15 PM',
      sensorReading: 'Discharge pressure: 0.12 bar (Normal: >0.8 bar)',
    },
  },
];

export const INITIAL_FAULTS = [
  {
    id: 'flt_101',
    machineId: 'machine_06',
    machineNumber: '06',
    machineName: 'Washer 302',
    floor: 'Floor 3',
    errorCode: 'ERR-DRAIN-04',
    title: 'Drain Valve Sensor Timeout',
    description: 'Discharge flow rate below 0.15 L/s during spin-drain. Pressure sensor indicates lint trap obstruction.',
    severity: 'critical', // critical, warning, info
    status: 'active', // active, investigating, resolved
    reportedAt: 'Today, 02:15 PM',
    sensorReading: 'Discharge pressure: 0.12 bar (Normal: >0.8 bar)',
  },
  {
    id: 'flt_102',
    machineId: 'machine_05',
    machineNumber: '05',
    machineName: 'Washer 301',
    floor: 'Floor 3',
    errorCode: 'WARN-VIB-02',
    title: 'High Vibration Warning',
    description: 'Accelerometer logged intermittent spikes (>0.62g) during high-speed extraction. Balance calibration recommended.',
    severity: 'warning',
    status: 'active',
    reportedAt: 'Today, 03:40 PM',
    sensorReading: 'Vibration Peak: 0.64g (Safe threshold: <0.45g)',
  },
  {
    id: 'flt_103',
    machineId: 'machine_02',
    machineNumber: '02',
    machineName: 'Washer 102',
    floor: 'Floor 1',
    errorCode: 'INFO-TEMP-01',
    title: 'Heating Element Efficiency Notice',
    description: 'Thermal rise rate slightly slow (+1.2°C/min vs standard +1.8°C/min). Descaling advised during next weekly inspection.',
    severity: 'info',
    status: 'investigating',
    reportedAt: 'Yesterday, 07:10 PM',
    sensorReading: 'Thermal rise: +1.2°C/min',
  },
];

export const TIME_SLOTS = [
  '08:00 AM - 08:45 AM',
  '09:00 AM - 09:45 AM',
  '10:00 AM - 10:45 AM',
  '11:00 AM - 11:45 AM',
  '01:00 PM - 01:45 PM',
  '02:00 PM - 02:45 PM',
  '03:30 PM - 04:15 PM',
  '05:00 PM - 05:45 PM',
  '06:30 PM - 07:15 PM',
  '08:00 PM - 08:45 PM',
  '09:00 PM - 09:45 PM',
];

export const CYCLE_TYPES = [
  { id: 'normal', name: 'Normal Wash', duration: 35, temp: '40°C', icon: 'Sparkles', waterLiters: 45 },
  { id: 'quick', name: 'Express Speed', duration: 20, temp: '30°C', icon: 'Zap', waterLiters: 30 },
  { id: 'heavy', name: 'Heavy Duty / Bedding', duration: 45, temp: '60°C', icon: 'Shield', waterLiters: 60 },
  { id: 'delicate', name: 'Delicate / Wool', duration: 30, temp: 'Cold', icon: 'Feather', waterLiters: 40 },
];

export const INITIAL_USER = {
  uid: 'demo_user_1',
  name: 'Arun Sharma',
  email: 'arun.sharma@hostel.edu',
  phone: '9876543210',
  roomNumber: 'Room 204',
  hostelBlock: 'Block B (Kaveri)',
  dailyLimit: 2,
  role: 'student',
  avatarInitials: 'AS',
};

export const INITIAL_STUDENT_2 = {
  uid: 'student_priya',
  name: 'Priya Patel',
  email: 'priya.patel@hostel.edu',
  phone: '9845123456',
  roomNumber: 'Room 108',
  hostelBlock: 'Block A (Ganga)',
  dailyLimit: 2,
  role: 'student',
  avatarInitials: 'PP',
};

export const INITIAL_ADMIN_USER = {
  uid: 'admin_warden_1',
  name: 'Prof. K. Sundaram',
  email: 'warden@hostel.edu',
  phone: '9840012345',
  roomNumber: 'Warden Office (Ground Floor)',
  hostelBlock: 'Hostel Administration Wing',
  dailyLimit: 99,
  role: 'admin',
  avatarInitials: 'AD',
};

export const INITIAL_BOOKINGS = [
  {
    id: 'bk_101',
    tokenNumber: 'TK-101',
    machineId: 'machine_04',
    machineNumber: '04',
    machineName: 'Washer 202',
    floor: 'Floor 2',
    slotTime: '01:00 PM - 01:45 PM',
    date: 'Today',
    status: 'completed', // completed, active, upcoming, cancelled
    cycleType: 'Normal Wash (35 min)',
    temperature: '40°C',
    userId: 'demo_user_1',
    userName: 'Arun Sharma',
    roomNumber: 'Room 204',
    phone: '9876543210',
    bookedAt: 'Today, 12:45 PM',
    completedAt: 'Today, 01:35 PM',
  },
  {
    id: 'bk_102',
    tokenNumber: 'TK-102',
    machineId: 'machine_02',
    machineNumber: '02',
    machineName: 'Washer 102',
    floor: 'Floor 1',
    slotTime: '03:30 PM - 04:15 PM',
    date: 'Today',
    status: 'active',
    cycleType: 'Cotton Wash (35 min)',
    temperature: '42°C',
    userId: 'student_priya',
    userName: 'Priya Patel',
    roomNumber: 'Room 108',
    phone: '9845123456',
    bookedAt: 'Today, 03:00 PM',
  },
  {
    id: 'bk_103',
    tokenNumber: 'TK-103',
    machineId: 'machine_03',
    machineNumber: '03',
    machineName: 'Washer 201',
    floor: 'Floor 2',
    slotTime: '05:00 PM - 05:45 PM',
    date: 'Today',
    status: 'upcoming',
    cycleType: 'Quick Spin (30 min)',
    temperature: '36°C',
    userId: 'student_rahul',
    userName: 'Rahul Verma',
    roomNumber: 'Room 212',
    phone: '9765432109',
    bookedAt: 'Today, 02:15 PM',
  },
  {
    id: 'bk_104',
    tokenNumber: 'TK-104',
    machineId: 'machine_01',
    machineNumber: '01',
    machineName: 'Washer 101',
    floor: 'Floor 1',
    slotTime: '06:30 PM - 07:15 PM',
    date: 'Today',
    status: 'upcoming',
    cycleType: 'Delicate Wash (30 min)',
    temperature: 'Cold',
    userId: 'demo_user_1',
    userName: 'Arun Sharma',
    roomNumber: 'Room 204',
    phone: '9876543210',
    bookedAt: 'Today, 02:40 PM',
  },
];

export const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif_1',
    title: 'Laundry Cycle Completed 🎉',
    message: 'Machine 04 (Floor 2) has finished your wash cycle. Please collect your clothes within 15 minutes.',
    timestamp: '5 mins ago',
    type: 'success',
    read: false,
    machineId: 'machine_04',
  },
  {
    id: 'notif_2',
    title: 'Upcoming Slot Confirmed 🗓️',
    message: 'Slot booked: Machine 01 (Floor 1) at 06:30 PM - 07:15 PM for Delicate Wash.',
    timestamp: '1 hour ago',
    type: 'info',
    read: false,
    machineId: 'machine_01',
  },
  {
    id: 'notif_3',
    title: 'Hostel Maintenance Alert ⚠️',
    message: 'Washer 302 on Floor 3 is under scheduled drain valve inspection.',
    timestamp: '2 hours ago',
    type: 'warning',
    read: true,
    machineId: 'machine_06',
  },
];

export const INITIAL_REGISTERED_USERS = [
  INITIAL_USER,
  INITIAL_STUDENT_2,
  {
    uid: 'student_rahul',
    name: 'Rahul Verma',
    email: 'rahul.verma@hostel.edu',
    phone: '9765432109',
    roomNumber: 'Room 212',
    hostelBlock: 'Block B (Kaveri)',
    dailyLimit: 2,
    role: 'student',
    status: 'approved',
    avatarInitials: 'RV',
  },
  INITIAL_ADMIN_USER,
];

export const INITIAL_PENDING_USERS = [
  {
    id: 'req_101',
    name: 'Ananya Iyer',
    email: 'ananya.iyer@hostel.edu',
    phone: '9820198201',
    roomNumber: 'Room 314',
    hostelBlock: 'Block C (Yamuna)',
    requestedAt: 'Today, 03:20 PM',
    status: 'pending', // pending, approved, rejected
    role: 'student',
    dailyLimit: 2,
    avatarInitials: 'AI',
  },
];

// Local Storage Keys
const STORAGE_KEYS = {
  USER: 'dhobidesk_user',
  MACHINES: 'dhobidesk_machines',
  BOOKINGS: 'dhobidesk_bookings',
  FAULTS: 'dhobidesk_faults',
  NOTIFICATIONS: 'dhobidesk_notifications',
  REGISTERED_USERS: 'dhobidesk_registered_users',
  PENDING_USERS: 'dhobidesk_pending_users',
};

// Storage helper methods
export function loadStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading stored user:', e);
    return null;
  }
}

export function saveStoredUser(user) {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  } catch (e) {
    console.error('Error saving user to storage:', e);
  }
}

export function loadStoredMachines() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MACHINES);
    if (!raw) return INITIAL_MACHINES;
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_MACHINES;
  }
}

export function saveStoredMachines(machines) {
  try {
    localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(machines));
  } catch (e) {
    console.error('Error saving machines to storage:', e);
  }
}

export function loadStoredBookings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
    if (!raw) return INITIAL_BOOKINGS;
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_BOOKINGS;
  }
}

export function saveStoredBookings(bookings) {
  try {
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
  } catch (e) {
    console.error('Error saving bookings to storage:', e);
  }
}

export function loadStoredFaults() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FAULTS);
    if (!raw) return INITIAL_FAULTS;
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_FAULTS;
  }
}

export function saveStoredFaults(faults) {
  try {
    localStorage.setItem(STORAGE_KEYS.FAULTS, JSON.stringify(faults));
  } catch (e) {
    console.error('Error saving faults to storage:', e);
  }
}

export function loadStoredNotifications() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (!raw) return INITIAL_NOTIFICATIONS;
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_NOTIFICATIONS;
  }
}

export function saveStoredNotifications(notifs) {
  try {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
  } catch (e) {
    console.error('Error saving notifications to storage:', e);
  }
}

export function loadStoredRegisteredUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REGISTERED_USERS);
    if (!raw) return INITIAL_REGISTERED_USERS;
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_REGISTERED_USERS;
  }
}

export function saveStoredRegisteredUsers(users) {
  try {
    localStorage.setItem(STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(users));
  } catch (e) {
    console.error('Error saving registered users to storage:', e);
  }
}

export function loadStoredPendingUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PENDING_USERS);
    if (!raw) return INITIAL_PENDING_USERS;
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_PENDING_USERS;
  }
}

export function saveStoredPendingUsers(pending) {
  try {
    localStorage.setItem(STORAGE_KEYS.PENDING_USERS, JSON.stringify(pending));
  } catch (e) {
    console.error('Error saving pending users to storage:', e);
  }
}
