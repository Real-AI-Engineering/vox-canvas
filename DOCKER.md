# 🐳 Vox Canvas Docker Setup

Complete guide for deploying Vox Canvas using Docker and container-native solutions.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Management Commands](#management-commands)
- [Operation Modes](#operation-modes)
- [Monitoring and Logs](#monitoring-and-logs)
- [Security](#security)
- [Backup and Restore](#backup-and-restore)
- [Troubleshooting](#troubleshooting)

## 🚀 Quick Start

### Prerequisites

- Docker Engine 20.10+ and Docker Compose v2
- Make (for convenient commands)
- 4GB RAM minimum
- Access to Google Cloud Speech API (optional)

### Initial Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd vox-canvas

# 2. Perform initial setup
make setup

# 3. Edit configuration
nano .env.docker

# 4. Add real Google credentials (if using Google STT)
# Replace content of backend/google-credentials.json

# 5. Start application
make up
```

### Application Access

After startup, add to `/etc/hosts`:
```
127.0.0.1    vox.local
127.0.0.1    api.vox.local
127.0.0.1    traefik.vox.local
```

Then open:
- **Frontend**: http://vox.local
- **API**: http://api.vox.local
- **Traefik Dashboard**: http://localhost:8080

## 🏗️ Architecture

### System Components

```mermaid
graph TB
    U[User] --> T[Traefik Reverse Proxy]
    T --> F[Frontend (Caddy)]
    T --> B[Backend (FastAPI)]
    B --> R[Redis]
    B --> G[Google Speech API]
    F --> B
```

### Services

1. **Traefik** (`:80`, `:443`, `:8080`)
   - Container-native reverse proxy
   - Automatic service discovery
   - Let's Encrypt for HTTPS
   - Monitoring dashboard

2. **Frontend** (Caddy)
   - React SPA on Caddy server
   - Automatic compression and caching
   - API and WebSocket proxy

3. **Backend** (FastAPI)
   - Python API with real-time transcription
   - WebSocket for audio streaming
   - Google Speech-to-Text integration
   - Health checks and metrics

4. **Redis**
   - Persistent session storage
   - Session management
   - Configured backups

## ⚙️ Configuration

### Main Configuration Files

| File | Purpose |
|------|---------|
| `.env.docker` | Environment variables |
| `docker-compose.yml` | Production setup |
| `docker-compose.dev.yml` | Development overrides |
| `traefik/dynamic.yml` | Traefik dynamic configuration |
| `frontend/Caddyfile` | Caddy server configuration |

### Key Environment Variables

```bash
# Main settings
VOX_SESSION_ID=docker-session
VOX_STT_MODE=google                 # google, vosk, stub
VOX_CARD_MODE=gemini               # gemini, openai, stub
VOX_LANGUAGE=ru-RU

# API keys
GEMINI_API_KEY=your-key-here
OPENAI_API_KEY=your-key-here

# Security
REDIS_PASSWORD=secure-password
CORS_ORIGINS=http://vox.local

# Domains
DOMAIN=vox.local
API_DOMAIN=api.vox.local
```

## 🎛️ Management Commands

### Basic Commands

```bash
make help          # Show all available commands
make setup         # Initial setup
make up            # Start in production mode
make dev           # Start in development mode
make down          # Stop all services
make restart       # Restart
make status        # Service status
```

### Build and Update

```bash
make build         # Build all images
make build-backend # Build only backend
make build-frontend # Build only frontend
make pull          # Update base images
make update        # Full update
```

### Development and Debug

```bash
make logs          # All logs
make logs-backend  # Backend logs
make logs-frontend # Frontend logs
make logs-traefik  # Traefik logs

make shell-backend # Shell in backend container
make shell-redis   # Redis CLI
make health        # Health check all services
```

### Testing

```bash
make test-backend  # Run backend tests
make lint-backend  # Backend linting
make lint-frontend # Frontend linting
```

## 🔄 Operation Modes

### Production Mode

```bash
make up
```

**Features:**
- All services in containers
- Optimized images
- Automatic health checks
- File logging

### Development Mode

```bash
make dev
```

**Features:**
- Frontend with hot-reload (Vite dev server)
- Backend with debug logging
- Direct port access for debugging
- Volume mounting for source code
- Stub modes for APIs

## 📊 Monitoring and Logs

### Health Checks

All services have built-in health checks:

```bash
# Automatic check
make health

# Manual check
curl http://localhost:8000/api/health
curl http://localhost/health
```

### Logging

```bash
# View logs in real-time
make logs

# Specific service logs
make logs-backend
make logs-frontend
make logs-traefik

# Docker logs directly
docker-compose logs -f backend
```

### Traefik Dashboard

Access dashboard: http://localhost:8080

**Capabilities:**
- Real-time service monitoring
- HTTP/HTTPS routing
- Performance metrics
- SSL certificate status

## 🔒 Security

### Built-in Security Measures

1. **Non-root users** in all containers
2. **Network isolation** between services
3. **Security headers** via Caddy and Traefik
4. **Secrets management** via Docker secrets
5. **Rate limiting** via Traefik middleware

### CORS Configuration

```yaml
# In traefik/dynamic.yml
accessControlAllowOriginList:
  - "http://vox.local"
  - "http://localhost:5173"
```

### SSL/TLS (Production)

For production with real domains:

```bash
# In docker-compose.yml uncomment:
- --certificatesresolvers.letsencrypt.acme.email=your-email@domain.com
- --certificatesresolvers.letsencrypt.acme.storage=/data/acme.json
```

## 💾 Backup and Restore

### Automatic Backup

```bash
# Create backup
make backup

# Or via script
./scripts/backup.sh
```

Backups are saved to `backups/redis-backup-YYYYMMDD-HHMMSS.rdb`

### Restore

```bash
# Restore from backup
make restore BACKUP_FILE=backups/redis-backup-20240101-120000.rdb
```

### Automated Backup Setup

Add to crontab:

```bash
# Daily backup at 2:00 AM
0 2 * * * cd /path/to/vox-canvas && make backup
```

## 🛠️ Troubleshooting

### Common Issues

#### Containers Won't Start

```bash
# Check status
make status

# Check logs
make logs

# Restart
make restart
```

#### Network Issues

```bash
# Check Docker networks
docker network ls

# Recreate networks
make down
docker network prune
make up
```

#### Frontend Not Loading

```bash
# Check Caddy logs
make logs-frontend

# Check Traefik routing
curl -v http://vox.local

# Rebuild frontend
make build-frontend
make restart
```

#### Backend API Unavailable

```bash
# Check health endpoint
curl http://localhost:8000/api/health

# Check backend logs
make logs-backend

# Check environment variables
make env
```

#### Redis Connection

```bash
# Check Redis
make shell-redis

# In Redis CLI:
> ping
> info
```

#### WebSocket Issues

```bash
# Check Traefik configuration
docker-compose exec traefik cat /etc/traefik/dynamic.yml

# Check CORS settings
curl -H "Origin: http://vox.local" -v http://api.vox.local/ws/transcription
```

### Diagnostic Commands

```bash
# System information
docker system info
docker system df

# Network diagnostics
docker network inspect vox-canvas_vox-network

# Volume information
docker volume ls
docker volume inspect vox-canvas_redis-data

# Container logs
docker logs vox-backend
docker logs vox-frontend
docker logs vox-traefik
```

### System Cleanup

```bash
# Full cleanup (CAREFUL!)
make clean

# Clean unused resources
docker system prune -a
docker volume prune
```

## 📝 Production Deployment

### Pre-deployment Preparation

1. **Configure domain and DNS**
2. **Obtain SSL certificates**
3. **Set up monitoring**
4. **Create backup strategy**

### Environment Configuration

```bash
# Production variables
DOMAIN=your-domain.com
LETSENCRYPT_EMAIL=admin@your-domain.com
VOX_TRACE=false
REDIS_PASSWORD=strong-secure-password
```

### Production Monitoring

Recommended additions:
- Prometheus for metrics
- Grafana for dashboards
- Loki for centralized logging
- Alertmanager for notifications

## 🤝 Support

When encountering issues:

1. Check [troubleshooting section](#troubleshooting)
2. View logs: `make logs`
3. Check health: `make health`
4. Create issue with detailed problem description

---

**Note**: This container-native solution provides a modern, scalable, and secure way to deploy the Vox Canvas application.