# Adobe PDF Embed API Setup Guide

## 🔑 Getting Your Adobe API Key

To use Adobe PDF Embed API in your newspaper application, you need to get a free API key from Adobe:

### Step 1: Create Adobe Developer Account
1. Go to [Adobe Developer Console](https://developer.adobe.com/console)
2. Sign in with your Adobe ID (create one if you don't have it)
3. Click "Create new project"

### Step 2: Add PDF Embed API
1. In your project, click "Add API"
2. Select "PDF Embed API" from the list
3. Choose "Web" as your platform
4. Enter your domain (for development: `http://localhost:5173`)

### Step 3: Get Your Credentials
1. Once configured, you'll see your **Client ID**
2. Copy this Client ID - this is your API key

### Step 4: Update Your Environment Variables
Add your Adobe Client ID to your `.env` file in the frontend directory:

```env
VITE_ADOBE_CLIENT_ID=your-actual-client-id-here
```

Replace `YOUR_ADOBE_CLIENT_ID_HERE` in `frontend/.env` with your actual Client ID from Adobe.

## 🌟 Features You Get with Adobe PDF Embed API

### ✅ **Professional PDF Viewing**
- High-quality rendering
- Smooth zooming and panning
- Page thumbnails and navigation
- Search functionality
- Print and download options

### ✅ **Advanced Annotation Tools**
- Highlighting
- Text comments
- Drawing tools
- Sticky notes
- Stamps and signatures

### ✅ **Form Filling**
- Interactive PDF forms
- Data validation
- Form submission

### ✅ **Auto-Sync to Google Drive**
- Automatic saving when user makes changes
- Real-time sync with your Google Drive storage
- Version tracking

## 🚀 How It Works

1. **User clicks "Open"** on a PDF in dashboard
2. **Adobe PDF Viewer loads** with professional interface
3. **User can edit, annotate, highlight** using Adobe's tools
4. **When user saves**, changes automatically sync to Google Drive
5. **No data loss** - everything is preserved in your Google Drive

## 🆓 Free Tier Limits

Adobe PDF Embed API free tier includes:
- **Unlimited document views**
- **Full annotation features**
- **No watermarks**
- **Commercial use allowed**

Perfect for your newspaper application!

## 🔧 Development vs Production

### Development
- Use `http://localhost:5173` in Adobe Console
- Test with local files

### Production  
- Add your production domain (e.g., `https://yournewspaperapp.com`)
- Update CORS settings if needed

## 📱 Mobile Support

Adobe PDF Embed API works great on:
- ✅ Desktop browsers
- ✅ Mobile Safari (iOS)
- ✅ Chrome Mobile (Android)
- ✅ Tablets

## 🎯 Next Steps

After setting up Adobe API:
1. Test PDF viewing and editing
2. Test auto-sync to Google Drive
3. Customize the viewer appearance if needed
4. Deploy to production

Your newspaper app now has professional-grade PDF capabilities! 🎉