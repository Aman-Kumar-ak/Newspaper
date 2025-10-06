// Minimal token store using localStorage for MVP
export function getTokens() {
  const raw = localStorage.getItem('googleTokens');
  if (!raw) return { accessToken: '', refreshToken: '' };
  try {
    const { accessToken, refreshToken } = JSON.parse(raw);
    return { accessToken: accessToken || '', refreshToken: refreshToken || '' };
  } catch {
    return { accessToken: '', refreshToken: '' };
  }
}

export function setTokens({ accessToken, refreshToken }) {
  localStorage.setItem('googleTokens', JSON.stringify({ accessToken, refreshToken }));
}


