# Upload 401 Unauthorized Error - Fix Guide

## Problem
Upload requests fail with `401 Unauthorized` error, meaning authentication tokens are not being sent properly.

## Changes Made

### 1. Fixed `uploadWithProgress()` in `frontend/src/lib/drive.js`
**Problem**: Headers object wasn't being properly converted to XHR headers
**Solution**: 
- Get tokens directly using `getTokens()`
- Set headers individually with `xhr.setRequestHeader()`
- Added token validation before upload
- Better error messages for 401 errors

### 2. Added Debug Logging in `authHeaders()`
**What**: Added console logs to track token presence
**Why**: Helps identify if tokens are missing or expired

### 3. Enhanced Error Handling in Dashboard
**What**: Added specific 401 error detection and user-friendly alerts
**Why**: User knows when to re-authenticate

## How to Debug

### Step 1: Check if Tokens Exist
Open browser console (F12) and run:
```javascript
JSON.parse(localStorage.getItem('googleTokens'))
```

**Expected Output:**
```json
{
  "accessToken": "ya29.a0...",
  "refreshToken": "1//0g...",
  "username": "Your Name",
  "email": "your@email.com"
}
```

**If null or empty**: You need to log in again

### Step 2: Check Console Logs
When uploading, you should see:
- ✅ `Auth token present: ya29.a0...` (truncated)
- ❌ `⚠️ No access token found in authHeaders()` (if missing)

### Step 3: Test Authentication
1. Go to `http://localhost:5173/#/login`
2. Click "Sign in with Google"
3. Complete OAuth flow
4. Check localStorage again (Step 1)

## Common Issues & Solutions

### Issue 1: Tokens are null/empty
**Cause**: Not logged in or tokens were cleared
**Solution**: Log in again via Login page

### Issue 2: Tokens exist but still get 401
**Cause**: Tokens expired (Google tokens expire after 1 hour)
**Solution**: 
- Backend should implement token refresh (future enhancement)
- For now: Log out and log in again

### Issue 3: Backend not receiving headers
**Cause**: CORS or header configuration issue
**Solution**: Backend already has CORS configured with:
```javascript
exposedHeaders: ['Content-Disposition', 'Content-Type', 'Content-Length']
```

### Issue 4: XHR not setting headers
**Cause**: Previous code used Headers object incorrectly
**Solution**: ✅ Fixed - now uses `xhr.setRequestHeader()` directly

## Testing the Fix

### Test 1: Check Token Presence
```javascript
// In browser console
const tokens = JSON.parse(localStorage.getItem('googleTokens'));
console.log('Access Token:', tokens?.accessToken ? 'Present ✅' : 'Missing ❌');
console.log('Refresh Token:', tokens?.refreshToken ? 'Present ✅' : 'Missing ❌');
```

### Test 2: Try Upload
1. Select a PDF file
2. Choose a date
3. Click Upload
4. Watch console for:
   - `✅ Auth token present: ...`
   - Upload progress
   - Success or specific error message

### Test 3: Verify Headers in Network Tab
1. Open DevTools → Network tab
2. Try uploading
3. Find the `upload` request
4. Check Request Headers:
   - ✅ `x-google-access-token: ya29...`
   - ✅ `x-google-refresh-token: 1//...` (if present)

## Manual Fix if Still Failing

### Option 1: Re-authenticate
```javascript
// Clear tokens
localStorage.removeItem('googleTokens');
// Go to login page
window.location.hash = '#/login';
```

### Option 2: Check Backend Logs
Look for backend terminal output when upload happens:
- Should NOT see "Missing x-google-access-token"
- Should see successful authentication

### Option 3: Verify Environment Variables
Check `frontend/.env`:
```
VITE_API_BASE_URL=http://localhost:8080
VITE_ADOBE_CLIENT_ID=your-adobe-client-id
```

Check `backend/.env`:
```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
CORS_ORIGIN=http://localhost:5173
```

## Expected Behavior After Fix

✅ Upload starts with progress bar
✅ Console shows: `✅ Auth token present: ...`
✅ File uploads successfully
✅ File appears in library
✅ No 401 errors

❌ If 401 still happens: User sees alert "Session expired. Please refresh the page and log in again."

## Quick Fix Script

Run this in browser console to check everything:
```javascript
const tokens = JSON.parse(localStorage.getItem('googleTokens'));
console.log('=== Authentication Status ===');
console.log('Access Token:', tokens?.accessToken ? '✅ Present' : '❌ Missing');
console.log('Refresh Token:', tokens?.refreshToken ? '✅ Present' : '❌ Missing');
console.log('Username:', tokens?.username || '❌ Not set');
console.log('Email:', tokens?.email || '❌ Not set');
console.log('API Base:', import.meta.env.VITE_API_BASE_URL);

if (!tokens?.accessToken) {
  console.error('🚨 NO ACCESS TOKEN - Please log in!');
  console.log('Redirecting to login in 3 seconds...');
  setTimeout(() => window.location.hash = '#/login', 3000);
}
```
