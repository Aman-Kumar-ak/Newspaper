import { startGoogleLogin } from '../../lib/auth';

export default function Login() {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ padding: 24, border: '1px solid #e5e7eb', borderRadius: 12 }}>
        <h2>Sign in</h2>
        <p>Please sign in with Google to continue.</p>
        <button onClick={startGoogleLogin}>Sign in with Google</button>
      </div>
    </div>
  );
}


