import './App.css'
import { useEffect, useState } from 'react'
import Dashboard from './app/routes/Dashboard.jsx'
import PdfViewer from './app/routes/PdfViewer.jsx'
import Login from './app/routes/Login.jsx'
import Settings from './app/routes/Settings.jsx'
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
      window.location.replace('#/home');
    }
  }, []);

  const authed = !!(localStorage.getItem('googleTokens'));
  const path = hash.replace('#', '');

  // Public routes (accessible without authentication)
  if (path === '/login') return <Login />
  if (path === '/privacy-policy') return <PrivacyPolicy />
  if (path === '/terms-and-conditions') return <TermsAndConditions />
  
  // Protected routes (require authentication)
  if (!authed) return <Login />
  
  if (path === '/settings') return <Settings />
  if (path.startsWith('/viewer/')) return <PdfViewer />
  if (path === '/home' || path === '/' || path === '') return <Dashboard />
  
  // Fallback to home for unknown routes
  return <Dashboard />
}
