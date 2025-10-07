# Production Deployment Guide

## 🚀 Cloud Newspaper - Production Setup

This guide will help you deploy Cloud Newspaper to production.

---

## 📋 Pre-Deployment Checklist

### Backend Requirements
- [ ] Node.js 18+ installed
- [ ] Google Cloud Project with Drive API enabled
- [ ] OAuth 2.0 credentials configured
- [ ] Production server/hosting (VPS, Cloud Platform, etc.)
- [ ] Domain name (optional but recommended)

### Frontend Requirements
- [ ] Node.js 18+ installed
- [ ] Production hosting (Vercel, Netlify, AWS S3+CloudFront, etc.)
- [ ] Domain name configured

---

## 🔧 Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Create `.env` file from template:

```bash
cp .env.example .env
```

Edit `.env` with your production values:

```env
NODE_ENV=production
PORT=8080
CORS_ORIGIN=https://your-frontend-domain.com
GOOGLE_CLIENT_ID=your_actual_client_id
GOOGLE_CLIENT_SECRET=your_actual_client_secret
GOOGLE_REDIRECT_URI=https://your-frontend-domain.com
JWT_SECRET=generate_a_secure_random_32_character_string
```

**Security Note**: Never commit the `.env` file to version control!

### 3. Google OAuth Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" > "Credentials"
3. Update OAuth 2.0 Client:
   - **Authorized JavaScript origins**: `https://your-frontend-domain.com`
   - **Authorized redirect URIs**: `https://your-frontend-domain.com`

### 4. Test Backend Locally

```bash
npm run start:prod
```

Visit `http://localhost:8080/health` - Should return:
```json
{
  "ok": true,
  "environment": "production",
  "timestamp": "...",
  "uptime": ...
}
```

---

## 🎨 Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment Variables

Create `.env.production` file:

```bash
cp .env.example .env.production
```

Edit `.env.production`:

```env
VITE_API_BASE_URL=https://your-backend-api.com
VITE_GOOGLE_CLIENT_ID=your_actual_client_id
VITE_APP_NAME=Cloud Newspaper
VITE_NODE_ENV=production
```

### 3. Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` folder.

### 4. Test Production Build Locally

```bash
npm run preview
```

Visit `http://localhost:4173` to test the production build.

---

## 🌐 Deployment Options

### Option 1: Traditional VPS/Server (Backend)

#### Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start application
cd backend
pm2 start src/server.js --name "cloud-newspaper-api"

# Save PM2 configuration
pm2 save

# Setup PM2 to restart on system reboot
pm2 startup
```

#### Using systemd (Linux)

Create `/etc/systemd/system/cloud-newspaper.service`:

```ini
[Unit]
Description=Cloud Newspaper API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/backend
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable cloud-newspaper
sudo systemctl start cloud-newspaper
sudo systemctl status cloud-newspaper
```

---

### Option 2: Cloud Platforms

#### Backend on Railway/Render/Fly.io

1. Connect your GitHub repository
2. Set environment variables in dashboard
3. Deploy from `main` branch
4. Configure custom domain

#### Frontend on Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel --prod
```

Or connect your GitHub repo to Vercel dashboard.

#### Frontend on Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
cd frontend
npm run build
netlify deploy --prod --dir=dist
```

---

### Option 3: Docker Deployment (Advanced)

See `docker-compose.yml` for containerized deployment.

```bash
docker-compose up -d
```

---

## 🔒 Security Best Practices

### Backend

✅ **Implemented:**
- Helmet.js for security headers
- Rate limiting on sensitive endpoints
- CORS configured for specific origin
- Request body size limits
- JWT for authentication
- Environment variable protection

✅ **Additional Recommendations:**
- Use HTTPS (SSL/TLS) in production
- Keep dependencies updated: `npm audit fix`
- Use a reverse proxy (Nginx/Apache)
- Implement request logging
- Set up monitoring (e.g., PM2, New Relic)

### Frontend

✅ **Implemented:**
- Environment variables for sensitive data
- Code splitting and optimization
- CSP headers configured

✅ **Additional Recommendations:**
- Use CDN for static assets
- Enable Brotli/Gzip compression
- Implement error tracking (Sentry)
- Set up analytics (optional)

---

## 📊 Performance Optimization

### Backend
- ✅ Compression middleware enabled
- ✅ Response caching with ETags
- ✅ Rate limiting to prevent abuse
- Consider adding Redis for session storage
- Use database connection pooling if needed

### Frontend
- ✅ Code splitting implemented
- ✅ Lazy loading for routes
- ✅ Image optimization
- ✅ Progressive loading for PDFs
- Consider adding service worker for offline support

---

## 🧪 Testing Production Build

### Backend Health Check
```bash
curl https://your-backend-api.com/health
```

### Frontend Tests
1. ✅ Login with Google works
2. ✅ PDF upload functions correctly
3. ✅ PDF viewing works in new tab
4. ✅ Search and filters work
5. ✅ Mobile responsive design
6. ✅ Progressive loading visible

---

## 📈 Monitoring & Logging

### Backend Logs
```bash
# PM2 logs
pm2 logs cloud-newspaper-api

# System logs
journalctl -u cloud-newspaper -f
```

### Recommended Monitoring Tools
- **Uptime**: UptimeRobot, Pingdom
- **Performance**: New Relic, DataDog
- **Error Tracking**: Sentry
- **Analytics**: Google Analytics, Plausible

---

## 🔄 Continuous Deployment

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          # Your deployment commands here
          
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and deploy
        run: |
          cd frontend
          npm ci
          npm run build
          # Deploy dist/ folder
```

---

## 🆘 Troubleshooting

### Common Issues

**CORS Errors**
- Check `CORS_ORIGIN` in backend `.env`
- Verify frontend URL matches exactly
- Check browser console for specific error

**OAuth Not Working**
- Verify Google Cloud credentials
- Check redirect URIs match exactly
- Ensure cookies are enabled

**Build Failures**
- Clear `node_modules` and reinstall
- Check Node.js version compatibility
- Review error logs carefully

**Performance Issues**
- Enable compression on server
- Use CDN for static assets
- Check network tab in browser DevTools

---

## 📞 Support

For issues or questions:
1. Check this documentation
2. Review error logs
3. Check browser console
4. Open GitHub issue

---

## 🎉 Post-Deployment

After successful deployment:

- [ ] Test all features in production
- [ ] Set up monitoring and alerts
- [ ] Configure backups (if using database)
- [ ] Document any custom configurations
- [ ] Share production URL with users
- [ ] Monitor initial usage and errors

---

**Congratulations! Your Cloud Newspaper is now live in production! 🚀**
