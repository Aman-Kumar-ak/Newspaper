import './App.css'
import { useEffect, useState } from 'react'

import Dashboard from './app/routes/Dashboard.jsx';
import PdfViewer from './app/routes/PdfViewer.jsx';
import Login from './app/routes/Login.jsx';
import Settings from './app/routes/Settings.jsx';
import PrivacyPolicy from './app/routes/PrivacyPolicy.jsx';
import TermsAndConditions from './app/routes/TermsAndConditions.jsx';
import { tryReadTokensFromCallbackPayload } from './lib/auth';
import { setTokens } from './state/authStore';
import LoadingOverlay from './components/ui/LoadingOverlay.jsx';
import OfflineStatusBar from './components/ui/OfflineStatusBar.jsx';

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  
  useEffect(() => {
    const handleNavigation = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handleNavigation);
    return () => window.removeEventListener('popstate', handleNavigation);
  }, []);

  // On first load, capture tokens from OAuth callback and redirect home
  useEffect(() => {
    const t = tryReadTokensFromCallbackPayload();
    if (t && t.accessToken) {
      setTokens({ accessToken: t.accessToken, refreshToken: t.refreshToken || '' });
      // Clean and go home
      window.history.replaceState({}, '', '/home');
      setPath('/home');
    }
  }, []);

  const authed = !!(localStorage.getItem('googleTokens'));
  const isOffline = !navigator.onLine;

  // Public routes (accessible without authentication)
  if (path === '/login') return <><OfflineStatusBar /><Login /></>;
  if (path === '/privacy-policy') return <><OfflineStatusBar /><PrivacyPolicy /></>;
  if (path === '/terms-and-conditions') return <><OfflineStatusBar /><TermsAndConditions /></>;

  // Protected routes (require authentication OR offline mode)
  // Allow access to Dashboard and PdfViewer when offline even without auth
  if (!authed && !isOffline) return <><OfflineStatusBar /><Login /></>;

  if (path === '/settings') return <><OfflineStatusBar /><Settings /></>;
  if (path.startsWith('/viewer/')) return <><OfflineStatusBar /><PdfViewer /></>;
  if (path === '/home' || path === '/' || path === '') return <><OfflineStatusBar /><Dashboard /></>;

  // Fallback to home for unknown routes
  return <><OfflineStatusBar /><Dashboard /></>;
}
