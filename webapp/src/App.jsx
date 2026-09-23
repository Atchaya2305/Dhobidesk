import { useState } from 'react';
import { auth } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import Dashboard from './Dashboard';

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    try {
      let result;
      if (isSignUp) {
        result = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        result = await signInWithEmailAndPassword(auth, email, password);
      }
      setUser(result.user);
    } catch (err) {
      setError(err.message);
    }
  };

  if (user) {
    return <Dashboard user={user} />;
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1>DhobiDesk</h1>
      <h3>{isSignUp ? 'Create account' : 'Log in'}</h3>
      <form onSubmit={handleAuth}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%', padding: 8, marginBottom: 8 }}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', padding: 8, marginBottom: 8 }}
          required
        />
        {error && <p style={{ color: 'red', fontSize: 14 }}>{error}</p>}
        <button type="submit" style={{ width: '100%', padding: 10 }}>
          {isSignUp ? 'Sign Up' : 'Log In'}
        </button>
      </form>
      <p style={{ marginTop: 12, fontSize: 14 }}>
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button onClick={() => setIsSignUp(!isSignUp)} style={{ border: 'none', background: 'none', color: 'blue', cursor: 'pointer' }}>
          {isSignUp ? 'Log in' : 'Sign up'}
        </button>
      </p>
    </div>
  );
}

export default App;