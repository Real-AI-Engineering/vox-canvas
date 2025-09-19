# 🐳 Vox Canvas - Docker Quick Start

Container-native deployment with **Traefik** and **Caddy** for production-ready setup.

## ⚡ Quick Start

```bash
# 1. Initial setup
make setup

# 2. Edit configuration
nano .env.docker

# 3. Add real Google credentials
# Replace content of backend/google-credentials.json

# 4. Start application
make up

# 5. Add to /etc/hosts:
echo "127.0.0.1 vox.local api.vox.local traefik.vox.local" | sudo tee -a /etc/hosts
```

## 🌐 Access

- **Application**: http://vox.local
- **API**: http://api.vox.local
- **Traefik Dashboard**: http://localhost:8080
- **Redis**: localhost:6379 (dev mode)

## 🛠️ Commands

| Command | Description |
|---------|-------------|
| `make up` | Start production |
| `make dev` | Development mode |
| `make down` | Stop services |
| `make logs` | View logs |
| `make health` | Health check |
| `make backup` | Backup data |

## 🏗️ Architecture

```
User → Traefik → Frontend (Caddy) → Backend (FastAPI) → Redis
                     ↓
                 WebSocket for audio
```

## 🔧 Technologies

- **Traefik** - Container-native reverse proxy
- **Caddy** - Modern web server with auto-HTTPS
- **Redis** - Persistent storage
- **Docker Compose** - Service orchestration

## 📖 Full Documentation

See [DOCKER.md](./DOCKER.md) for comprehensive documentation.

## 🎯 Production

```bash
# 1. Configure domains in .env.docker
DOMAIN=your-domain.com
LETSENCRYPT_EMAIL=admin@your-domain.com

# 2. Enable HTTPS in docker-compose.yml
# Uncomment Let's Encrypt lines

# 3. Start
make up
```

---

**Container-native** solution for modern deployment! 🚀