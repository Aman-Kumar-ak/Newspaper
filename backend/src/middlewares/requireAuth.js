// Minimal auth middleware for MVP:
// Expects Google OAuth tokens in headers and attaches them to req.oauthTokens
module.exports = function requireAuth(req, res, next) {
  const accessToken = req.header('x-google-access-token');
  const refreshToken = req.header('x-google-refresh-token');
  if (!accessToken) {
    return res.status(401).json({ error: 'Missing x-google-access-token' });
  }
  req.oauthTokens = { access_token: accessToken };
  if (refreshToken) req.oauthTokens.refresh_token = refreshToken;
  return next();
};

