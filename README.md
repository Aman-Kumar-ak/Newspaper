# 📰 Cloud Newspaper

A modern, cloud-based PDF newspaper management system with Google Drive integration. Store, organize, and access your digital newspapers anywhere, anytime.

![Cloud Newspaper](./logo.png)

---

## ✨ Features

- 🔐 **Google OAuth Authentication** - Secure login with your Google account
- ☁️ **Google Drive Integration** - Automatic PDF storage and organization
- 📅 **Date-based Organization** - PDFs organized by upload date
- 🔍 **Smart Search** - Find newspapers quickly by name or date
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- ⚡ **Progressive Loading** - Fast initial load with incremental content display
- 🎨 **Modern UI** - Clean, intuitive interface with smooth animations
- 🖼️ **PDF Thumbnails** - Quick visual preview of newspaper covers
- 📤 **Easy Upload** - Drag-and-drop or click to upload PDFs
- 🗑️ **File Management** - Delete unwanted files with confirmation

---

## 🚀 Quick Start

### Development Mode

#### Prerequisites
- Node.js 18+ and npm
- Google Cloud Project with Drive API enabled
- OAuth 2.0 credentials

#### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

#### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your backend URL
npm run dev
```

Visit `http://localhost:5173` to see the application.

---

## 📦 Production Deployment

### Option 1: Docker (Recommended)
```bash
docker-compose up -d
```
See [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) for detailed instructions.

### Option 2: Traditional Deployment
See [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) for comprehensive deployment guide.

---

## 🛠️ Technology Stack

### Frontend
- **React 19** - UI framework
- **Vite 7** - Build tool and dev server
- **Zustand** - State management
- **PDF.js** - PDF rendering and thumbnails
- **IndexedDB** - Local caching via idb
- **Google OAuth** - Authentication

### Backend
- **Node.js** - Runtime environment
- **Express 5** - Web framework
- **Google APIs** - Drive integration
- **JWT** - Token-based authentication
- **Multer** - File upload handling
- **Helmet** - Security middleware
- **Rate Limiting** - API protection

---

## 📂 Project Structure

```
Newspaper/
├── backend/
│   ├── src/
│   │   ├── config/        # Configuration files
│   │   ├── middlewares/   # Express middlewares
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── types/         # Type definitions
│   │   ├── utils/         # Utility functions
│   │   └── server.js      # Main server file
│   ├── .env.example       # Environment template
│   ├── package.json       # Dependencies
│   └── Dockerfile         # Docker configuration
│
├── frontend/
│   ├── public/
│   │   ├── images/        # Carousel images
│   │   └── logo.png       # App logo
│   ├── src/
│   │   ├── app/
│   │   │   └── routes/    # Application pages
│   │   ├── components/    # Reusable components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # API clients & utilities
│   │   ├── state/         # State management
│   │   └── styles/        # Global styles
│   ├── .env.example       # Environment template
│   ├── package.json       # Dependencies
│   ├── vite.config.js     # Vite configuration
│   ├── Dockerfile         # Docker configuration
│   └── nginx.conf         # Nginx configuration
│
├── docker-compose.yml     # Docker Compose config
├── .gitignore            # Git ignore rules
└── README.md             # This file
```

---

## 🔐 Security Features

- ✅ Helmet.js security headers
- ✅ CORS protection
- ✅ Rate limiting
- ✅ JWT authentication
- ✅ Request size limits
- ✅ Input validation with Zod
- ✅ Secure environment variables
- ✅ HTTPS recommended for production

---

## 📱 Screenshots

### Login Page
![Login](./images/1.jpg)
- Animated background carousel
- Modern glassmorphic design
- Secure Google OAuth

### Dashboard
- Date-organized newspaper grid
- Real-time search and filtering
- Progressive loading
- Thumbnail previews

### PDF Viewer
- Full-screen PDF viewing
- Smooth page navigation
- Download and print support

---

## 🎯 Key Features Explained

### Progressive Loading
Files load incrementally as you open the dashboard, showing the first folder immediately while others load in the background. No more waiting for everything to load!

### Smart Caching
IndexedDB caching ensures subsequent visits are instant, with background refresh for latest data.

### Date-Based Organization
PDFs are automatically organized by date (DD-MM-YYYY format), making it easy to find newspapers by publication date.

### Responsive Design
Works perfectly on desktop, tablet, and mobile devices with touch-friendly controls.

---

## 🔧 Environment Variables

### Backend (.env)
```env
NODE_ENV=production
PORT=8080
CORS_ORIGIN=https://your-frontend.com
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://your-frontend.com
JWT_SECRET=your_jwt_secret
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend (.env.production)
```env
VITE_API_BASE_URL=https://your-backend.com
VITE_GOOGLE_CLIENT_ID=your_client_id
VITE_APP_NAME=Cloud Newspaper
```

---

## 🧪 Development

### Install Dependencies
```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

### Run Development Servers
```bash
# Backend (port 8080)
cd backend && npm run dev

# Frontend (port 5173)
cd frontend && npm run dev
```

### Build for Production
```bash
# Frontend
cd frontend && npm run build

# Backend (no build needed, runs directly)
cd backend && npm start
```

---

## 📚 Documentation

- [Production Deployment Guide](./PRODUCTION_DEPLOYMENT.md)
- [Docker Deployment Guide](./DOCKER_DEPLOYMENT.md)
- [Progressive Loading Implementation](./PROGRESSIVE_LOADING.md)
- [Login Page Enhancement](./LOGIN_PAGE_ENHANCEMENT.md)
- [Console Error Fix](./CONSOLE_ERROR_FIX.md)
- [Adobe Setup](./ADOBE_SETUP.md)
- [Upload 401 Fix](./UPLOAD_401_FIX.md)
- [Backend Restart Guide](./RESTART_BACKEND.md)

---

## 🐛 Troubleshooting

### Common Issues

**CORS Errors**
- Check `CORS_ORIGIN` in backend `.env`
- Ensure frontend URL matches exactly

**OAuth Not Working**
- Verify Google Cloud credentials
- Check redirect URIs in Google Console

**Upload Fails**
- Check file size limits (current: 10MB)
- Verify Google Drive API permissions

**Thumbnails Not Loading**
- Check console for pdf.js errors
- Verify PDF file is not corrupted

See documentation files for detailed troubleshooting.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the ISC License.

---

## 👨‍💻 Author

**Aman Kumar**
- GitHub: [@Aman-Kumar-ak](https://github.com/Aman-Kumar-ak)

---

## 🙏 Acknowledgments

- Google Drive API for cloud storage
- PDF.js for PDF rendering
- React team for the amazing framework
- Vite for blazing-fast build tool
- All open-source contributors

---

## 🚀 Roadmap

- [ ] Add text search within PDFs
- [ ] Implement bulk upload
- [ ] Add sharing functionality
- [ ] Mobile app (React Native)
- [ ] Offline mode with service workers
- [ ] Custom folder organization
- [ ] PDF annotations and notes
- [ ] Multi-user collaboration

---

## 📞 Support

For issues, questions, or feature requests:
- Open an [Issue](https://github.com/Aman-Kumar-ak/Newspaper/issues)
- Check existing documentation
- Review troubleshooting guides

---

## ⭐ Show Your Support

If you found this project helpful, please consider giving it a ⭐ on GitHub!

---

**Happy Reading! 📰**
