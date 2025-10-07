const API_BASE = import.meta.env.VITE_API_BASE_URL;

export function startGoogleLogin() {
  // Avoid CORS by letting the browser navigate to backend, which then redirects to Google
  window.location.assign(`${API_BASE}/auth/login?redirect=true`);
}

// Helper to extract tokens if backend redirected with JSON body (dev workflow)
export function tryReadTokensFromCallbackPayload() {
  // Primary: check URL hash tokens=base64 (OAuth callback)
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
  
  // Also check query params for tokens (alternative OAuth callback method)
  try {
    const search = window.location.search || '';
    const params = new URLSearchParams(search);
    const tokensParam = params.get('tokens');
    if (tokensParam) {
      const decoded = JSON.parse(atob(tokensParam.replace(/-/g, '+').replace(/_/g, '/')));
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
  // Revoke the app's OAuth access token (this disconnects the app, not the Google account)
  try {
    const { accessToken } = JSON.parse(localStorage.getItem('googleTokens') || '{}');
    if (accessToken) {
      // Revoke the OAuth access token - this only removes app's access, not Google login
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`, {
        method: 'POST',
        headers: { 'Content-type': 'application/x-www-form-urlencoded' }
      });
    }
  } catch (err) {
    console.warn('Failed to revoke token:', err);
  }

  // Clear local auth state
  try { 
    localStorage.removeItem('googleTokens'); 
  } catch {}

  // Simply navigate to login page - user stays signed in to Google
  // They will see account picker on next login if they want to switch accounts
  window.location.href = `${window.location.origin}/login`;
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


