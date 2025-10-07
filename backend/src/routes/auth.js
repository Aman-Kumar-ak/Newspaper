const express = require('express');
const router = express.Router();
const { getAuthUrl, handleOAuthCallback } = require('../services/authService');

router.get('/login', async (req, res, next) => {
  try {
    // Store the origin of the request to redirect back after OAuth
    const referer = req.get('referer') || req.get('origin') || '';
    const url = getAuthUrl();
    
    // Save the origin in session or pass as state parameter
    // For simplicity, we'll use a cookie
    if (referer) {
      res.cookie('oauth_redirect', referer, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 5 * 60 * 1000 // 5 minutes
      });
    }
    
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
    
    // Get the redirect URL from cookie (set during /login) or fallback to env
    let frontend = req.cookies?.oauth_redirect;
    
    // Extract base URL if we got a full URL with path
    if (frontend) {
      try {
        const url = new URL(frontend);
        frontend = `${url.protocol}//${url.host}`;
      } catch {
        // If URL parsing fails, use as-is
      }
    }
    
    // Fallback to environment variable or localhost
    if (!frontend) {
      frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
    }
    
    // Clear the cookie
    res.clearCookie('oauth_redirect');
    
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

