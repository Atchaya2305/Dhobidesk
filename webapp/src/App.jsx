import { useState, useEffect } from 'react';
import AuthPage from './components/AuthPage';
import Dashboard from './Dashboard';
import { 
  loadStoredUser, 
  saveStoredUser,
  loadStoredRegisteredUsers,
  saveStoredRegisteredUsers,
  loadStoredPendingUsers,
  saveStoredPendingUsers,
  loadStoredNotifications,
  saveStoredNotifications
} from './data/mockData';
import './App.css';

function App() {
  // Starts with login page by default if no user is active in session
  const [user, setUser] = useState(() => {
    return loadStoredUser();
  });

  const [registeredUsers, setRegisteredUsers] = useState(() => {
    return loadStoredRegisteredUsers();
  });

  const [pendingUsers, setPendingUsers] = useState(() => {
    return loadStoredPendingUsers();
  });

  // Sync users to storage
  useEffect(() => {
    saveStoredRegisteredUsers(registeredUsers);
  }, [registeredUsers]);

  useEffect(() => {
    saveStoredPendingUsers(pendingUsers);
  }, [pendingUsers]);

  const handleLogin = (newUser) => {
    setUser(newUser);
    saveStoredUser(newUser);
  };

  const handleLogout = () => {
    setUser(null);
    saveStoredUser(null);
  };

  const handleUpdateUser = (updatedUser) => {
    setUser(updatedUser);
    saveStoredUser(updatedUser);
    setRegisteredUsers((prev) =>
      prev.map((u) => (u.uid === updatedUser.uid ? updatedUser : u))
    );
  };

  // Student registers: Dispatched to Warden's queue & creates notification for admin
  const handleRegisterRequest = (newStudentRequest) => {
    const updatedPending = [newStudentRequest, ...pendingUsers];
    setPendingUsers(updatedPending);
    saveStoredPendingUsers(updatedPending);

    // Dispatch system notification for warden
    const existingNotifs = loadStoredNotifications();
    const newNotif = {
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      title: `New Student Account Request 🎓 (${newStudentRequest.name})`,
      message: `${newStudentRequest.name} (${newStudentRequest.roomNumber}, ${newStudentRequest.hostelBlock}) submitted a registration. Awaiting Warden approval before access is granted.`,
      timestamp: 'Just now',
      type: 'info',
      read: false,
    };
    saveStoredNotifications([newNotif, ...existingNotifs]);
  };

  // Warden approves student
  const handleApproveStudent = (studentId) => {
    const student = pendingUsers.find((s) => s.id === studentId);
    if (!student) return;

    const approvedUser = {
      ...student,
      uid: student.uid || ('user_' + Date.now()),
      status: 'approved',
    };

    setRegisteredUsers((prev) => [approvedUser, ...prev]);
    setPendingUsers((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status: 'approved' } : s))
    );
  };

  // Warden declines student
  const handleRejectStudent = (studentId, reason) => {
    setPendingUsers((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status: 'rejected', rejectReason: reason } : s))
    );
  };

  if (!user) {
    return (
      <AuthPage 
        onLoginSuccess={handleLogin}
        onRegisterRequest={handleRegisterRequest}
        pendingUsers={pendingUsers}
        registeredUsers={registeredUsers}
      />
    );
  }

  return (
    <Dashboard 
      user={user} 
      onLogout={handleLogout} 
      onUpdateUser={handleUpdateUser}
      pendingUsers={pendingUsers}
      registeredUsers={registeredUsers}
      onApproveStudent={handleApproveStudent}
      onRejectStudent={handleRejectStudent}
    />
  );
}

export default App;