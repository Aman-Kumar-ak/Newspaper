// Google OAuth helpers using googleapis
const { getOAuthClient } = require('../config/google');

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.file'
];

function getAuthUrl() {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    // 'select_account' lets users pick account but skips consent if already granted
    // This allows quick re-login while giving option to switch accounts
    prompt: 'select_account',
    scope: SCOPES,
  });
}

async function handleOAuthCallback(code) {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

module.exports = { getAuthUrl, handleOAuthCallback };

