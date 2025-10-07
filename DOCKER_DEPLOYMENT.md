# Docker Deployment Guide

## 🐳 Quick Start with Docker

Deploy Cloud Newspaper using Docker containers for easy, consistent deployment.

---

## Prerequisites

- Docker installed (v20.10+)
- Docker Compose installed (v2.0+)
- Git (to clone the repository)

---

## 🚀 Quick Deployment

### 1. Clone Repository

```bash
git clone https://github.com/Aman-Kumar-ak/Newspaper.git
cd Newspaper
```

### 2. Configure Environment

#### Backend
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your production values:
```env
NODE_ENV=production
PORT=8080
CORS_ORIGIN=http://localhost
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost
JWT_SECRET=your_secure_jwt_secret
```

#### Frontend
```bash
cd ../frontend
cp .env.example .env.production
```

Edit `frontend/.env.production`:
```env
VITE_API_BASE_URL=http://localhost:8080
VITE_GOOGLE_CLIENT_ID=your_client_id
VITE_APP_NAME=Cloud Newspaper
```

### 3. Build and Run

From the root directory:

```bash
docker-compose up -d
```

This will:
- Build backend and frontend Docker images
- Start both containers
- Set up networking between them
- Expose ports (8080 for backend, 80 for frontend)

### 4. Verify Deployment

```bash
# Check container status
docker-compose ps

# Backend health check
curl http://localhost:8080/health

# Frontend (open in browser)
# http://localhost
```

---

## 📋 Docker Commands

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend
```

### Restart Services
```bash
docker-compose restart
```

### Rebuild Images
```bash
docker-compose up -d --build
```

### Remove Everything (including volumes)
```bash
docker-compose down -v
```

---

## 🔧 Individual Container Commands

### Backend Only

```bash
# Build
cd backend
docker build -t cloud-newspaper-backend .

# Run
docker run -d \
  --name backend \
  -p 8080:8080 \
  --env-file .env \
  cloud-newspaper-backend

# Stop
docker stop backend
docker rm backend
```

### Frontend Only

```bash
# Build
cd frontend
docker build -t cloud-newspaper-frontend .

# Run
docker run -d \
  --name frontend \
  -p 80:80 \
  cloud-newspaper-frontend

# Stop
docker stop frontend
docker rm frontend
```

---

## 🌐 Production Deployment

### Using Docker Swarm

Initialize swarm:
```bash
docker swarm init
```

Deploy stack:
```bash
docker stack deploy -c docker-compose.yml cloud-newspaper
```

### Using Kubernetes

Convert to Kubernetes with Kompose:
```bash
kompose convert
kubectl apply -f .
```

---

## 📊 Monitoring

### Health Checks

Docker automatically monitors container health:

```bash
# Check health status
docker-compose ps

# Backend health endpoint
curl http://localhost:8080/health

# Frontend health endpoint
curl http://localhost/health
```

### Resource Usage

```bash
# View resource usage
docker stats

# Specific container
docker stats cloud-newspaper-backend
```

---

## 🔒 Security Best Practices

1. **Never commit `.env` files**
   - Use `.env.example` templates
   - Set environment variables in production

2. **Use secrets management**
   ```bash
   docker secret create jwt_secret ./jwt_secret.txt
   ```

3. **Update base images regularly**
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

4. **Scan for vulnerabilities**
   ```bash
   docker scan cloud-newspaper-backend
   ```

---

## 🐛 Troubleshooting

### Containers Won't Start

```bash
# Check logs
docker-compose logs

# Inspect specific container
docker inspect cloud-newspaper-backend
```

### Port Already in Use

```bash
# Change ports in docker-compose.yml
ports:
  - "8081:8080"  # Backend
  - "8082:80"    # Frontend
```

### Build Failures

```bash
# Clean build
docker-compose down
docker system prune -a
docker-compose up -d --build
```

### Network Issues

```bash
# Recreate network
docker network rm cloud-newspaper-network
docker-compose up -d
```

---

## 📦 Volumes (Optional)

Add persistent volumes to `docker-compose.yml`:

```yaml
volumes:
  backend-data:

services:
  backend:
    volumes:
      - backend-data:/app/data
```

---

## 🚀 Advanced: Multi-Stage Optimization

The Dockerfiles use multi-stage builds:
- **Frontend**: Builds with Node.js, serves with Nginx (smaller image)
- **Backend**: Uses Alpine Linux (minimal size)

Image sizes:
- Backend: ~150MB
- Frontend: ~25MB (with Nginx)

---

## 📈 Scaling

Scale services with Docker Compose:

```bash
# Run 3 backend instances
docker-compose up -d --scale backend=3

# Use load balancer (Nginx/Traefik) to distribute traffic
```

---

## ✅ Production Checklist

- [ ] Environment variables configured
- [ ] Google OAuth credentials updated
- [ ] SSL/TLS certificates installed
- [ ] Firewall rules configured
- [ ] Monitoring set up
- [ ] Backup strategy in place
- [ ] Health checks working
- [ ] Logs being collected

---

## 🎉 Success!

Your Cloud Newspaper is now running in Docker containers! 

Access:
- **Frontend**: http://localhost
- **Backend API**: http://localhost:8080
- **Backend Health**: http://localhost:8080/health

For production deployment with custom domains, see `PRODUCTION_DEPLOYMENT.md`.
