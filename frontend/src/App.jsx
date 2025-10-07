import './App.css'
import { useEffect, useState } from 'react'
import Dashboard from './app/routes/Dashboard.jsx'
import PdfViewer from './app/routes/PdfViewer.jsx'
import Login from './app/routes/Login.jsx'
import PrivacyPolicy from './app/routes/PrivacyPolicy.jsx'
import TermsAndConditions from './app/routes/TermsAndConditions.jsx'
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

  if (!authed && path !== '/login' && path !== '/privacy' && path !== '/terms') return <Login />

  if (path === '/login') return <Login />
  if (path === '/privacy') return <PrivacyPolicy />
  if (path === '/terms') return <TermsAndConditions />
  if (path.startsWith('/viewer/')) return <PdfViewer />
  
  return <Dashboard />
}
