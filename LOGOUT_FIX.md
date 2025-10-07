# Logout Fix - App-Only Logout

## Issue
Previously, when users clicked "Logout", the app was signing them out of their entire Google account in the browser, which was too aggressive and unexpected behavior.

## Solution
Updated the `logoutGoogle()` function in `frontend/src/lib/auth.js` to only:
1. ✅ Revoke the app's OAuth access token (disconnects app from Google account)
2. ✅ Clear local authentication data
3. ✅ Navigate to login page
4. ❌ **Does NOT** sign out the user's Google account from the browser

## What Changed

### Before:
```javascript
// Forced Google account logout from entire browser
const accountsLogout = `https://www.google.com/accounts/Logout?...`;
window.location.assign(accountsLogout);
```

### After:
```javascript
// Only revoke app access and clear local data
await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {...});
localStorage.removeItem('googleTokens');
window.location.href = '/login';
```

## User Experience

### Before (Aggressive):
1. User clicks "Logout" in app
2. ❌ User is signed out of Google account in entire browser
3. ❌ User loses access to Gmail, YouTube, etc. in other tabs
4. ❌ User sees "Signed out - syncing is paused" message

### After (App-Only):
1. User clicks "Logout" in app
2. ✅ User is logged out of the newspaper app only
3. ✅ Google account remains signed in the browser
4. ✅ Other Google services (Gmail, YouTube, etc.) remain accessible
5. ✅ Next login will remember the account (unless user chooses "Use another account")

## Technical Details

### Token Revocation
The app still revokes the OAuth access token using Google's revocation endpoint:
```javascript
https://oauth2.googleapis.com/revoke?token={accessToken}
```

This ensures:
- The app's access to Google Drive is immediately revoked
- The token cannot be used anymore
- User data remains secure

### Local Storage
All authentication data is cleared:
```javascript
localStorage.removeItem('googleTokens');
```

## Benefits
1. ✅ **Better UX**: Users don't lose access to other Google services
2. ✅ **Expected behavior**: Matches how other apps handle logout
3. ✅ **Faster re-login**: User can sign back in quickly
4. ✅ **Secure**: Token is still revoked, data is still protected
5. ✅ **Account switching**: Users can still switch accounts by choosing "Use another account" on login

## Testing
- [x] Logout clears app authentication
- [x] User redirected to login page
- [x] Google account remains signed in browser
- [x] Gmail/YouTube remain accessible after logout
- [x] Re-login works smoothly
- [x] Token revocation succeeds

## Date
October 7, 2025
