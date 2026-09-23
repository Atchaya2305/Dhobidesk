function Dashboard({ user }) {
  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>Welcome, {user.email}</h1>
      <p>Machine status board coming next.</p>
    </div>
  );
}

export default Dashboard;