# Backend Restart Instructions

## Why Restart is Needed
The backend server needs to be restarted to apply the CORS configuration changes that allow the `Content-Disposition` header to be exposed to the frontend.

## Changes Made
1. **server.js**: Added `exposedHeaders: ['Content-Disposition', 'Content-Type', 'Content-Length']` to CORS config
2. **routes/drive.js**: Improved Content-Disposition header format with both standard and RFC 5987 encoding
3. **frontend/drive.js**: Enhanced filename extraction with better regex patterns and debugging

## How to Restart

### Option 1: Using npm (Recommended)
```bash
cd backend
npm start
```

### Option 2: Using node directly
```bash
cd backend
node src/server.js
```

### Option 3: Using nodemon (if installed)
```bash
cd backend
nodemon src/server.js
```

## Verify It's Working
1. Open the frontend in your browser
2. Open Developer Tools (F12)
3. Go to Console tab
4. Click on any PDF file
5. Look for these console logs:
   - "Content-Disposition header: inline; filename="YourFile.pdf"; filename*=UTF-8''YourFile.pdf"
   - "Extracted filename from quoted pattern: YourFile.pdf"
   - "fileName: "YourFile.pdf""

## Expected Behavior
- The loading screen should show the actual PDF filename
- The Adobe viewer should display the correct filename in the title bar
- Console should show the Content-Disposition header (not null)

## If Still Showing "document.pdf"
1. Check if backend is actually restarted (look for "API listening on 8080" message)
2. Clear browser cache (Ctrl+Shift+Delete)
3. Hard refresh the page (Ctrl+F5)
4. Check console for "No Content-Disposition header found" warning
5. Verify CORS_ORIGIN in .env matches your frontend URL
