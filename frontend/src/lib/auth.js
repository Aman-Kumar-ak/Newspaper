const API_BASE = import.meta.env.VITE_API_BASE_URL;

export function startGoogleLogin() {
  // Avoid CORS by letting the browser navigate to backend, which then redirects to Google
  window.location.assign(`${API_BASE}/auth/login?redirect=true`);
}

// Helper to extract tokens if backend redirected with JSON body (dev workflow)
export function tryReadTokensFromCallbackPayload() {
  // Primary: check URL hash tokens=base64
  try {
    const hash = window.location.hash || '';
    const m = hash.match(/tokens=([^&]+)/);
    if (m && m[1]) {
      const decoded = JSON.parse(atob(m[1].replace(/-/g, '+').replace(/_/g, '/')));
      return {
        accessToken: decoded.accessToken || '',
        refreshToken: decoded.refreshToken || '',
        username: decoded.username || '',
        email: decoded.email || '',
      };
    }
  } catch {}
  // Fallback: raw JSON body (when not redirected back)
  try {
    const pre = document.body?.innerText || '';
    if (pre.startsWith('{')) {
      const parsed = JSON.parse(pre);
      if (parsed?.tokens?.access_token) {
        return {
          accessToken: parsed.tokens.access_token,
          refreshToken: parsed.tokens.refresh_token || '',
          username: parsed.tokens.username || '',
          email: parsed.tokens.email || '',
        };
      }
    }
  } catch {}
  return null;
}

export async function logoutGoogle() {
  // Revoke access token and sign out of Google account, then return to app login
  try {
    const { accessToken } = JSON.parse(localStorage.getItem('googleTokens') || '{}');
    if (accessToken) {
      // Revoke the OAuth access token
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`, {
        method: 'POST',
        headers: { 'Content-type': 'application/x-www-form-urlencoded' }
      });
    }
  } catch {}

  // Clear local auth state before navigating away
  try { localStorage.removeItem('googleTokens'); } catch {}

  // Force Google Account sign-out so the next login shows the account chooser
  const returnUrl = `${window.location.origin}/#/login`;
  const accountsLogout = `https://www.google.com/accounts/Logout?continue=${encodeURIComponent('https://appengine.google.com/_ah/logout?continue=' + encodeURIComponent(returnUrl))}`;
  window.location.assign(accountsLogout);
}

export async function fetchGoogleProfile(accessToken) {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    username: data.name || '',
    email: data.email || '',
    picture: data.picture || '',
  };
}


