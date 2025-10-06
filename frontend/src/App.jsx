import './App.css'
import { useEffect, useState } from 'react'
import Dashboard from './app/routes/Dashboard.jsx'
import PdfViewer from './app/routes/PdfViewer.jsx'
import Login from './app/routes/Login.jsx'
import { tryReadTokensFromCallbackPayload } from './lib/auth'
import { setTokens } from './state/authStore'
import LoadingOverlay from './components/ui/LoadingOverlay.jsx'

export default function App() {
  const [hash, setHash] = useState(window.location.hash || '#/');
  useEffect(() => {
    const h = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);

  // On first load, capture tokens from OAuth callback and redirect home
  useEffect(() => {
    const t = tryReadTokensFromCallbackPayload();
    if (t && t.accessToken) {
      setTokens({ accessToken: t.accessToken, refreshToken: t.refreshToken || '' });
      // Clean hash and go home
      window.location.replace('#/');
    }
  }, []);

  const authed = !!(localStorage.getItem('googleTokens'));
  const path = hash.replace('#', '');

  if (!authed && path !== '/login') return <Login />

  if (path === '/login') return <Login />
  if (path.startsWith('/viewer/')) return <PdfViewer />
  
  return <Dashboard />
}
