const express = require('express');
const router = express.Router();
const { getAuthUrl, handleOAuthCallback } = require('../services/authService');

router.get('/login', async (req, res, next) => {
  try {
    const url = getAuthUrl();
    // If called from a browser, redirect to the Google consent screen directly.
    // You can force redirect with ?redirect=true
    if (req.query.redirect === 'true' || req.accepts(['html', 'json']) === 'html') {
      return res.redirect(url);
    }
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

router.get('/google/callback', async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'Missing code' });
    const tokens = await handleOAuthCallback(code);
    const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
    try {
      const payload = Buffer.from(JSON.stringify({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || '',
      })).toString('base64url');
      // Redirect with hash for compatibility (hash params don't go to server)
      // Frontend will extract tokens and clean the URL
      return res.redirect(`${frontend}/#tokens=${payload}`);
    } catch {
      // Fallback to raw JSON if encoding fails
      return res.json({ tokens });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;

