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
      return { accessToken: decoded.accessToken || '', refreshToken: decoded.refreshToken || '' };
    }
  } catch {}
  // Fallback: raw JSON body (when not redirected back)
  try {
    const pre = document.body?.innerText || '';
    if (pre.startsWith('{')) {
      const parsed = JSON.parse(pre);
      if (parsed?.tokens?.access_token) {
        return { accessToken: parsed.tokens.access_token, refreshToken: parsed.tokens.refresh_token || '' };
      }
    }
  } catch {}
  return null;
}

export async function logoutGoogle() {
  // Best-effort revoke access token, then clear local state
  try {
    const { accessToken } = JSON.parse(localStorage.getItem('googleTokens') || '{}');
    if (accessToken) {
      // Google token revoke endpoint
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`, { method: 'POST', headers: { 'Content-type': 'application/x-www-form-urlencoded' }});
    }
  } catch {}
  localStorage.removeItem('googleTokens');
  // Redirect to login page
  window.location.href = '/#/login';
}


