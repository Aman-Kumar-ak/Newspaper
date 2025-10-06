// Minimal token store using localStorage for MVP
export function getTokens() {
  const raw = localStorage.getItem('googleTokens');
  if (!raw) return { accessToken: '', refreshToken: '', username: '', email: '' };
  try {
    const { accessToken, refreshToken, username, email } = JSON.parse(raw);
    return {
      accessToken: accessToken || '',
      refreshToken: refreshToken || '',
      username: username || '',
      email: email || '',
    };
  } catch {
    return { accessToken: '', refreshToken: '', username: '', email: '' };
  }
}

export function setTokens({ accessToken, refreshToken, username, email }) {
  localStorage.setItem('googleTokens', JSON.stringify({ accessToken, refreshToken, username, email }));
}


