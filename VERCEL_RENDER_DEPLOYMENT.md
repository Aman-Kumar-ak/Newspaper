# 🚀 Vercel + Render Deployment Guide

## Cloud Newspaper - Complete Deployment Steps

Your setup:
- **Frontend**: Vercel (React + Vite)
- **Backend**: Render (Node.js + Express)

---

## 📋 Why Deploy Backend First?

1. **Frontend needs Backend URL** - The frontend requires `VITE_API_BASE_URL` to connect to your API
2. **OAuth Configuration** - Google OAuth needs both URLs, but backend URL comes first
3. **Testing** - You can test backend API endpoints before deploying frontend
4. **Dependencies** - Frontend depends on backend, not vice versa

---

## 🎯 Deployment Order

```
1. Deploy Backend (Render)      ✅ Get backend URL
2. Configure Google OAuth        ✅ Update with both URLs
3. Deploy Frontend (Vercel)      ✅ Use backend URL
4. Test Everything              ✅ Verify integration
```

---

## 📦 STEP 1: Deploy Backend to Render

### 1.1 Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Authorize Render to access your repositories

### 1.2 Create New Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository: `Aman-Kumar-ak/Newspaper`
3. Configure:
   - **Name**: `cloud-newspaper-api` (or your choice)
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free` (or paid for better performance)

### 1.3 Set Environment Variables

Click **"Environment"** and add these variables:

```env
NODE_ENV=production
PORT=10000
CORS_ORIGIN=https://your-app-name.vercel.app
GOOGLE_CLIENT_ID=your_actual_google_client_id
GOOGLE_CLIENT_SECRET=your_actual_google_client_secret
GOOGLE_REDIRECT_URI=https://your-app-name.vercel.app
JWT_SECRET=generate_secure_random_string_32_chars_minimum
HELMET_ENABLED=true
TRUST_PROXY=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Important Notes:**
- `PORT` must be `10000` (Render's default)
- `CORS_ORIGIN` - You'll update this after deploying frontend
- `JWT_SECRET` - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 1.4 Deploy Backend

1. Click **"Create Web Service"**
2. Wait 3-5 minutes for deployment
3. You'll get a URL like: `https://cloud-newspaper-api.onrender.com`

### 1.5 Test Backend

Open in browser:
```
https://your-backend-url.onrender.com/health
```

Should return:
```json
{
  "ok": true,
  "environment": "production",
  "timestamp": "...",
  "uptime": ...
}
```

✅ **Save this URL! You'll need it for frontend deployment.**

---

## 🔐 STEP 2: Configure Google OAuth

### 2.1 Update Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to: **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID

### 2.2 Add Authorized Origins

**Authorized JavaScript origins:**
```
https://your-backend-url.onrender.com
https://your-app-name.vercel.app
```

### 2.3 Add Redirect URIs

**Authorized redirect URIs:**
```
https://your-app-name.vercel.app
https://your-app-name.vercel.app/
```

### 2.4 Update Backend Environment on Render

Go back to Render → Your service → **Environment**

Update:
```env
CORS_ORIGIN=https://your-app-name.vercel.app
GOOGLE_REDIRECT_URI=https://your-app-name.vercel.app
```

Click **"Save Changes"** - Render will automatically redeploy.

---

## 🎨 STEP 3: Deploy Frontend to Vercel

### 3.1 Install Vercel CLI (Optional)

```bash
npm install -g vercel
```

Or deploy via Vercel Dashboard (easier for first time).

### 3.2 Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Sign up/Login with GitHub
3. Click **"Add New..."** → **"Project"**
4. Import `Aman-Kumar-ak/Newspaper`
5. Configure Project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 3.3 Set Environment Variables

Click **"Environment Variables"** and add:

```env
VITE_API_BASE_URL=https://your-backend-url.onrender.com
VITE_GOOGLE_CLIENT_ID=your_actual_google_client_id
VITE_APP_NAME=Cloud Newspaper
VITE_NODE_ENV=production
```

**Important:**
- Replace `your-backend-url.onrender.com` with your actual Render backend URL
- Use the same `GOOGLE_CLIENT_ID` from backend

### 3.4 Deploy Frontend

1. Click **"Deploy"**
2. Wait 2-3 minutes for build and deployment
3. You'll get a URL like: `https://cloud-newspaper.vercel.app`

### 3.5 Configure Custom Domain (Optional)

1. In Vercel Dashboard → **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update Google OAuth with new domain

---

## 🔄 STEP 4: Final Configuration Updates

### 4.1 Update Backend CORS

Since you now have the Vercel URL, update Render environment:

```env
CORS_ORIGIN=https://your-actual-vercel-url.vercel.app
```

### 4.2 Update Google OAuth (if needed)

If Vercel gave you a different URL than expected, update Google Cloud Console with the actual URLs.

### 4.3 Trigger Redeployment

**Render Backend:**
- Go to Render Dashboard
- Click **"Manual Deploy"** → **"Deploy latest commit"**

**Vercel Frontend:**
- Vercel automatically redeploys on git push
- Or click **"Redeploy"** in dashboard

---

## ✅ STEP 5: Testing

### 5.1 Test Backend API

```bash
# Health check
curl https://your-backend-url.onrender.com/health

# Should return: {"ok": true, ...}
```

### 5.2 Test Frontend

1. Open: `https://your-vercel-url.vercel.app`
2. Check browser console (F12) for errors
3. Test Login with Google
4. Try uploading a PDF
5. Test viewing PDFs
6. Test search and filters

### 5.3 Check Integration

- ✅ Login works (Google OAuth)
- ✅ PDFs upload successfully
- ✅ PDFs display correctly
- ✅ Search functions properly
- ✅ No CORS errors in console
- ✅ Progressive loading works

---

## 🐛 Common Issues & Solutions

### Issue 1: CORS Error

**Error:** `Access-Control-Allow-Origin` error in browser console

**Solution:**
1. Check `CORS_ORIGIN` in Render backend environment
2. Must exactly match Vercel URL (including `https://`)
3. No trailing slash
4. Redeploy backend after changing

### Issue 2: OAuth Not Working

**Error:** OAuth redirect fails or shows error page

**Solution:**
1. Verify Google Cloud Console has correct URLs
2. Check `GOOGLE_REDIRECT_URI` in backend
3. Must match frontend URL exactly
4. Clear browser cookies and try again

### Issue 3: 404 on Refresh

**Error:** Refreshing page shows 404

**Solution:**
- Already fixed! `vercel.json` has SPA routing configuration
- If still happens, verify `vercel.json` is in `frontend/` directory

### Issue 4: Environment Variables Not Working

**Error:** `undefined` values in application

**Solution:**
1. Ensure all env vars start with `VITE_` in frontend
2. Rebuild and redeploy (env vars are bundled at build time)
3. In Vercel: Change env var → Click "Redeploy"

### Issue 5: Backend Cold Start

**Error:** First request takes 30+ seconds

**Solution:**
- This is normal on Render's free tier
- Backend "spins down" after inactivity
- First request "wakes it up"
- Consider upgrading to paid tier for 24/7 uptime

---

## 📊 Expected Performance

### Render Backend (Free Tier)
- **Cold Start**: 30-60 seconds (first request)
- **Warm Response**: <500ms
- **Uptime**: Good (spins down after 15min inactivity)
- **Bandwidth**: 100GB/month free

### Vercel Frontend (Free Tier)
- **Build Time**: 2-3 minutes
- **Response Time**: <100ms (global CDN)
- **Uptime**: Excellent (always on)
- **Bandwidth**: 100GB/month free

---

## 🔄 Continuous Deployment

Both platforms support automatic deployment on git push:

### Automatic Deployment
```bash
# Make changes to code
git add .
git commit -m "Update feature"
git push origin main

# Vercel: Automatically builds and deploys frontend
# Render: Automatically builds and deploys backend
```

### Manual Deployment

**Render:**
- Dashboard → Manual Deploy → Deploy latest commit

**Vercel:**
- Dashboard → Deployments → Redeploy

---

## 💰 Cost Optimization

### Free Tier Limits

**Render:**
- ✅ 750 hours/month free
- ✅ Spins down after 15min inactivity
- ⚠️ Cold start delays
- Upgrade: $7/month for always-on

**Vercel:**
- ✅ Unlimited sites
- ✅ 100GB bandwidth/month
- ✅ Always on, no cold starts
- ✅ Global CDN included

### Recommended Upgrade Path
1. Start with both free tiers
2. If backend cold starts are annoying → Upgrade Render ($7/month)
3. If you need more bandwidth → Upgrade Vercel ($20/month)

---

## 🔐 Security Checklist

After deployment:

- [ ] HTTPS enabled (automatic on both platforms)
- [ ] Environment variables set (no secrets in code)
- [ ] CORS configured for specific origin
- [ ] Google OAuth URLs updated
- [ ] Rate limiting enabled in backend
- [ ] Helmet security headers active
- [ ] .env files not in git repository
- [ ] JWT secret is strong and unique

---

## 📈 Monitoring

### Render Dashboard
- View logs
- Check resource usage
- Monitor uptime
- Track errors

### Vercel Dashboard
- View deployment logs
- Monitor function invocations
- Check bandwidth usage
- Analytics (optional)

### Recommended Tools
- **Uptime Monitoring**: UptimeRobot (free)
- **Error Tracking**: Sentry (free tier)
- **Analytics**: Google Analytics or Plausible

---

## 🎉 Success Checklist

- [x] Backend deployed to Render
- [x] Backend health check responds
- [x] Google OAuth configured
- [x] Frontend deployed to Vercel
- [x] Login works
- [x] PDF upload works
- [x] PDF viewing works
- [x] No CORS errors
- [x] No console errors
- [x] Mobile responsive

---

## 📞 Quick Reference

### Your URLs
```
Backend:  https://your-backend.onrender.com
Frontend: https://your-app.vercel.app
Health:   https://your-backend.onrender.com/health
```

### Important Commands

```bash
# Test backend locally
cd backend && npm run start:prod

# Test frontend build
cd frontend && npm run build && npm run preview

# Deploy (after git push)
# Both platforms auto-deploy

# View logs
# Render: Dashboard → Logs tab
# Vercel: Dashboard → Functions → Logs
```

---

## 🚀 Next Steps

After successful deployment:

1. **Test thoroughly** on multiple devices
2. **Share with users** and get feedback
3. **Monitor logs** for errors
4. **Set up backups** (Google Drive already handles data)
5. **Add custom domain** (optional)
6. **Set up monitoring** (UptimeRobot)
7. **Enable analytics** (optional)

---

## 📚 Troubleshooting Resources

- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [Project Documentation](./PRODUCTION_DEPLOYMENT.md)

---

## 🎊 You're Ready to Deploy!

Follow these steps in order:

1. **Deploy Backend to Render** (15 minutes)
2. **Configure Google OAuth** (5 minutes)
3. **Deploy Frontend to Vercel** (10 minutes)
4. **Test Everything** (10 minutes)

**Total Time: ~40 minutes** ⏱️

Good luck! Your Cloud Newspaper will be live soon! 🚀📰
