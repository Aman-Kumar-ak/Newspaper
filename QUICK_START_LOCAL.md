# 🚀 Quick Start: Local Development

## One-Time Setup (Do This First!)

### 1. Add Localhost to Google OAuth
Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials

Add this redirect URI to your OAuth client:
```
http://localhost:8080/auth/google/callback
```

## Start Development Servers

### Terminal 1 - Backend
```powershell
cd backend
npm run dev
```
✅ Backend running on `http://localhost:8080`

### Terminal 2 - Frontend  
```powershell
cd frontend
npm run dev
```
✅ Frontend running on `http://localhost:5173`

## Test It Works

1. Open `http://localhost:5173` in browser
2. Click "Login with Google"
3. Authorize the app
4. You should see your Google Drive files!

## Files Modified

- ✅ `backend/.env` - Added localhost to CORS
- ✅ `frontend/.env.local` - Created (points to local backend)
- ✅ `frontend/vite.config.js` - Updated CSP headers

## Troubleshooting

**Problem:** "CORS error"
- Make sure backend is running on port 8080
- Check `backend/.env` has `CORS_ORIGIN=https://cloudnewspaper.vercel.app,http://localhost:5173`

**Problem:** "Google Drive not loading"
- Did you add localhost redirect URI to Google Console? (see step 1)
- Check browser console for auth errors
- Try clearing localStorage and re-login

**Problem:** "Still hitting production API"
- Make sure `frontend/.env.local` exists
- Restart frontend dev server (Ctrl+C, then `npm run dev`)
- Hard refresh browser (Ctrl+Shift+R)

## Production vs Local

| Environment | Frontend | Backend |
|-------------|----------|---------|
| **Local** (for development) | http://localhost:5173 | http://localhost:8080 |
| **Production** (live site) | https://cloudnewspaper.vercel.app | https://cloud-newspaper-api.onrender.com |

Both environments share the same Google Drive!

---

📖 See `LOCAL_DEVELOPMENT_SETUP.md` for detailed documentation.
