# Token Refresh Fix - Authentication Error Resolution

## Problem
The backend was throwing `401 Unauthorized` errors because:
- Google OAuth access tokens expire after ~1 hour
- The backend was not refreshing expired tokens
- Users had to manually log in again every hour

## Solution Implemented

### 1. Backend Token Refresh (driveService.js)
Added `withTokenRefresh()` helper function that:
- Catches 401 authentication errors
- Automatically refreshes the access token using the refresh token
- Retries the failed operation with the new token
- Throws `AUTHENTICATION_EXPIRED` error if refresh fails (no valid refresh token)

All Drive API functions now wrapped with this helper:
- `findRootFolder()`
- `ensureRootFolder()`
- `ensureDateFolder()`
- `listFilesByDate()`
- `uploadPdf()`
- `getFileBytes()`
- `updateFileBytes()`
- `deleteFile()`
- `listDateFolders()`
- `deleteFolderByDate()`

### 2. Backend Error Handler (server.js)
Added special handling for `AUTHENTICATION_EXPIRED` error:
```javascript
if (err.message === 'AUTHENTICATION_EXPIRED') {
  return res.status(401).json({ 
    error: 'AUTHENTICATION_EXPIRED',
    message: 'Your session has expired. Please log in again.'
  });
}
```

### 3. Frontend Error Detection (drive.js)
Added `handleApiResponse()` helper that:
- Checks all API responses for 401 or `AUTHENTICATION_EXPIRED` error
- Clears stored tokens from localStorage
- Automatically redirects to `/login`
- Prevents further API calls with invalid tokens

Updated all API calls to use this helper:
- `ensureRoot()`
- `ensureFolder()`
- `listByDate()`
- `upload()`
- `listDates()`
- `deleteFile()`
- `getFileBytes()` (special handling for binary data)
- `updateFileBytes()`
- `deleteFolderByDate()`

## How It Works

### Normal Flow (Token Valid)
1. Frontend sends API request with access token
2. Backend validates token with Google
3. API request succeeds
4. Data returned to frontend

### Token Expired Flow (With Refresh Token)
1. Frontend sends API request with expired access token
2. Backend gets 401 error from Google API
3. Backend automatically calls `auth.refreshAccessToken()`
4. Google returns new access token
5. Backend retries the original request with new token
6. API request succeeds
7. Data returned to frontend

### Token Expired Flow (No Refresh Token or Invalid)
1. Frontend sends API request with expired access token
2. Backend gets 401 error from Google API
3. Backend attempts refresh but fails
4. Backend throws `AUTHENTICATION_EXPIRED` error
5. Frontend receives 401 response
6. Frontend clears localStorage tokens
7. Frontend redirects user to `/login`
8. User logs in and gets fresh tokens

## What You Need to Do

### ⚠️ IMPORTANT: Log In Again
The current tokens in your browser are expired and need to be refreshed:

1. **Open your browser** and go to your app
2. You'll be automatically redirected to `/login`
3. **Click "Sign in with Google"** 
4. Complete the OAuth flow
5. You'll get fresh tokens with a valid refresh_token

### After Login
- Your session will now last much longer
- Backend will automatically refresh expired tokens
- You won't see 401 errors anymore
- Offline files functionality will work properly

## Technical Details

### Token Lifecycle
- **Access Token**: Expires after ~1 hour, used for API requests
- **Refresh Token**: Long-lived (weeks/months), used to get new access tokens
- **Automatic Refresh**: Backend checks token validity and refreshes when needed

### Files Modified
1. `backend/src/services/driveService.js` - Added token refresh wrapper
2. `backend/src/server.js` - Added AUTHENTICATION_EXPIRED error handler
3. `frontend/src/lib/drive.js` - Added handleApiResponse() helper
4. `frontend/src/lib/idb.js` - Added cacheGetAllPdfIds() for offline persistence

## Testing
After logging in again, test:
1. ✅ File listing loads without errors
2. ✅ Upload files works
3. ✅ Download/view PDFs works
4. ✅ Delete files works
5. ✅ Offline functionality persists across page reloads

## Benefits
- ✅ No more hourly re-authentication
- ✅ Seamless user experience
- ✅ Automatic token management
- ✅ Graceful error handling
- ✅ Clear feedback when re-login needed
