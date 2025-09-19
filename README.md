# 🎙️ Vox Canvas - Real-time Speech-to-Text Workshop Assistant

An intelligent system for conducting workshops with **real-time speech transcription**, **AI-powered card generation**, and **interactive canvas** for content organization.

## 🚀 Features

- 🎯 **Real-time transcription** with Google Speech-to-Text or Vosk (offline)
- 🤖 **AI card generation** with OpenAI GPT or Google Gemini
- 📊 **Interactive canvas** with drag-and-drop cards
- 💾 **Persistent session storage** in Redis
- 🐳 **Container-native** deployment with Docker
- 🌐 **Production-ready** with Traefik and Let's Encrypt

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [System Requirements](#system-requirements)
- [Getting Access Keys](#getting-access-keys)
- [Installation and Setup](#installation-and-setup)
- [Running Modes](#running-modes)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Management Commands](#management-commands)
- [Troubleshooting](#troubleshooting)

## ⚡ Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Real-AI-Engineering/vox-canvas.git
cd vox-canvas

# 2. Initial setup (creates .env.docker from example)
make setup

# 3. Configure access keys (see "Getting Access Keys" section)
nano .env.docker

# 4. Start in development mode
make dev
```

**Done!** Open http://localhost:5173 in your browser.

## 🔧 System Requirements

### Essential
- **Docker** 24.0+ and **Docker Compose** 2.0+
- **Make** for management commands
- **Git** for repository cloning
- **4 GB RAM** minimum (8 GB recommended)
- **Modern browser** with WebRTC support (Chrome, Firefox, Safari)

### For Development (optional)
- **Python 3.12+** + [`uv`](https://github.com/astral-sh/uv) for backend development
- **Node.js 20+** + [`pnpm`](https://pnpm.io/) for frontend development

## 🔐 Getting Access Keys

### 1. Google Speech-to-Text API (Recommended)

#### Creating Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable **Speech-to-Text API**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Cloud Speech-to-Text API"
   - Click "Enable"

#### Creating Service Account
1. Go to "IAM & Admin" → "Service Accounts"
2. Click "Create Service Account"
3. Set name: `vox-canvas-stt`
4. Assign role: **"Cloud Speech Client"**
5. Create and download **JSON key**

#### Project Setup
```bash
# Place JSON key in the project
cp ~/Downloads/service-account-key.json backend/google-credentials.json

# Ensure the file won't be committed to git
echo "backend/google-credentials.json" >> .gitignore
```

### 2. OpenAI API (For Card Generation)

#### Getting API Key
1. Register at [OpenAI Platform](https://platform.openai.com/)
2. Go to "API Keys" → "Create new secret key"
3. Copy the key (starts with `sk-...`)

#### Setup in .env.docker
```bash
# Open configuration file
nano .env.docker

# Find and replace:
OPENAI_API_KEY=your-openai-api-key-here
# With your actual key:
OPENAI_API_KEY=sk-1234567890abcdef...

# Change card mode:
VOX_CARD_MODE=openai
```

### 3. Google Gemini API (OpenAI Alternative)

#### Getting API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key

#### Setup in .env.docker
```bash
nano .env.docker

# Configure Gemini:
GEMINI_API_KEY=your-gemini-api-key-here
VOX_CARD_MODE=gemini
```

## 🛠️ Installation and Setup

### Step 1: Environment Preparation

```bash
# Clone the repository
git clone https://github.com/Real-AI-Engineering/vox-canvas.git
cd vox-canvas

# Verify Docker is running
docker --version
docker compose version
```

### Step 2: Configuration

```bash
# Create configuration file from example
make setup

# Open file for editing
nano .env.docker
```

**Required settings for full functionality:**

```bash
# STT Configuration
VOX_STT_MODE=google                    # or vosk for offline
VOX_LANGUAGE=ru-RU                     # recognition language

# Card Generation
VOX_CARD_MODE=openai                   # openai, gemini, or stub
OPENAI_API_KEY=sk-your-key-here        # if using OpenAI
GEMINI_API_KEY=your-key-here           # if using Gemini

# Redis (security)
REDIS_PASSWORD=your-secure-password-123

# Domains (for production)
DOMAIN=your-domain.com
LETSENCRYPT_EMAIL=admin@your-domain.com
```

### Step 3: Google Credentials Setup

```bash
# Place Google JSON credentials file
cp /path/to/your/service-account.json backend/google-credentials.json

# Verify the file is in place
ls -la backend/google-credentials.json
```

### Step 4: First Launch

```bash
# Start in development mode
make dev

# Or directly in production
make up
```

## 🎯 Running Modes

### Development Mode (recommended for start)
```bash
make dev
```
- 🔧 Hot reload for frontend
- 📊 Extended logs and debugging
- 🌐 Access: http://localhost:5173
- 🔧 API: http://localhost:8000

### Production Mode
```bash
make up
```
- 🚀 Optimized builds
- 🌐 Access via domains (configure DNS)
- 🔒 HTTPS with Let's Encrypt
- 📈 Monitoring and metrics

### For Local Development (without Docker)

#### Backend
```bash
cd backend
uv sync --all-extras
uv run uvicorn app.main:app --reload --factory
```

#### Frontend
```bash
cd frontend
pnpm install
pnpm dev
```

## ⚙️ Configuration

### .env.docker File - Main Parameters

```bash
# === SPEECH RECOGNITION ===
VOX_STT_MODE=google              # google, vosk, stub
VOX_LANGUAGE=ru-RU               # recognition language
VOX_GOOGLE_SAMPLE_RATE=48000     # sampling rate

# === CARD GENERATION ===
VOX_CARD_MODE=openai             # openai, gemini, stub
OPENAI_API_KEY=sk-...            # OpenAI API key
GEMINI_API_KEY=...               # Google Gemini key
VOX_OPENAI_MODEL=gpt-4o-mini     # OpenAI model

# === SECURITY ===
REDIS_PASSWORD=secure-password-123
CORS_ORIGINS=http://localhost:5173,http://vox.local

# === DOMAINS (production) ===
DOMAIN=vox.your-domain.com
API_DOMAIN=api.vox.your-domain.com
LETSENCRYPT_EMAIL=admin@your-domain.com

# === PERFORMANCE ===
REDIS_URL=redis://:password@redis:6379/0
RATE_LIMIT=100                   # requests per minute
```

### STT Modes

| Mode | Description | Requirements |
|------|-------------|--------------|
| `google` | Google Speech-to-Text API | Google Cloud credentials + internet |
| `vosk` | Offline recognition | Downloaded Vosk model |
| `stub` | Testing simulation | None |

### Card Generation Modes

| Mode | Description | Requirements |
|------|-------------|--------------|
| `openai` | OpenAI GPT models | OpenAI API key |
| `gemini` | Google Gemini | Google AI API key |
| `stub` | Testing stubs | None |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           User                                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                    Traefik                                      │
│            (Reverse Proxy + Load Balancer)                     │
└─────────────┬─────────────────────────┬─────────────────────────┘
              │                         │
┌─────────────▼─────────────┐ ┌─────────▼─────────────────────────┐
│      Frontend (Caddy)     │ │      Backend (FastAPI)           │
│                           │ │                                   │
│ • React + TypeScript      │ │ • WebSocket for audio             │
│ • Real-time UI            │ │ • Speech-to-Text                  │
│ • Canvas with cards       │ │ • AI card generation              │
│ • WebSocket client        │ │ • REST API                        │
└───────────────────────────┘ └─────────┬─────────────────────────┘
                                        │
              ┌─────────────────────────▼─────────────────────────┐
              │                   Redis                           │
              │                                                   │
              │ • Sessions and state                              │
              │ • Transcription cache                             │
              │ • Persistent storage                              │
              └───────────────────────────────────────────────────┘

External APIs:
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Google STT     │  │  OpenAI GPT     │  │  Google Gemini  │
│                 │  │                 │  │                 │
│ • Real-time     │  │ • Card          │  │ • Card          │
│   speech        │  │   generation    │  │   generation    │
│   recognition   │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Components

#### Frontend (React)
- **Technologies**: React 19, TypeScript, Tailwind CSS 4
- **Functions**: Canvas with cards, real-time transcription, session management
- **Port**: 5173 (dev) / 80,443 (prod)

#### Backend (FastAPI)
- **Technologies**: Python 3.12, FastAPI, WebSocket, structlog
- **Functions**: STT integration, AI generation, sessions, API
- **Port**: 8000

#### Traefik (Reverse Proxy)
- **Functions**: Load balancing, HTTPS termination, automatic certificates
- **Port**: 80, 443, 8080 (dashboard)

#### Redis (Storage)
- **Functions**: Sessions, cache, persistent data
- **Port**: 6379

## 🎮 Management Commands

### Basic Commands

```bash
# Service Management
make setup          # Initial setup
make dev             # Start in development mode
make up              # Start in production
make down            # Stop all services
make restart         # Restart services

# Monitoring and Debugging
make logs            # View all logs
make logs-backend    # Backend logs only
make logs-frontend   # Frontend logs only
make health          # Check service status

# Data Management
make backup          # Redis backup
make restore BACKUP_FILE=backup.rdb  # Restore
make clean           # Clean temporary files

# Development
make lint            # Code linting (backend)
make test            # Run tests (backend)
make check           # Lint + tests
```

### Advanced Commands

```bash
# Image Rebuilding
make build           # Rebuild all images
make build-frontend  # Frontend only
make build-backend   # Backend only

# Container Debugging
make shell-backend   # Connect to backend container
make shell-frontend  # Connect to frontend container
make shell-redis     # Connect to Redis

# Resource Monitoring
make stats           # Resource usage statistics
make top             # Processes in containers
```

## 🌐 URLs and Access

### Development Mode (make dev)
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Traefik Dashboard**: http://localhost:8080
- **Redis**: localhost:6379

### Production (make up)
- **Application**: http://vox.local (or your domain)
- **API**: http://api.vox.local
- **Traefik Dashboard**: http://traefik.vox.local

### /etc/hosts Setup for Local Production

```bash
# Add to /etc/hosts for local production testing
echo "127.0.0.1 vox.local api.vox.local traefik.vox.local" | sudo tee -a /etc/hosts
```

## 🔍 Troubleshooting

### Startup Issues

#### "port already allocated" Error
```bash
# Check that ports are free
lsof -i :5432 -i :6379 -i :8000 -i :5173

# Stop conflicting services
docker stop $(docker ps -q)
make down
```

#### Docker Issues
```bash
# Check Docker status
docker system info

# Clean unused resources
docker system prune -f

# Recreate network
docker network prune -f
make down && make up
```

### Audio Issues

#### Microphone Not Working
1. Check browser permissions
2. Ensure using HTTPS or localhost
3. Check system microphone settings

#### No Transcription
```bash
# Check STT logs
make logs-backend | grep stt

# Check settings in .env.docker
grep VOX_STT .env.docker
grep GOOGLE .env.docker
```

### CORS Errors

```bash
# Check CORS settings in .env.docker
grep CORS_ORIGINS .env.docker

# Restart backend
docker restart vox-backend
```

### AI Generation Issues

#### OpenAI Errors
```bash
# Check API key
grep OPENAI_API_KEY .env.docker

# Check balance on OpenAI Platform
# https://platform.openai.com/usage
```

#### Gemini Errors
```bash
# Check Gemini API key
grep GEMINI_API_KEY .env.docker

# Switch to stub mode for testing
sed -i 's/VOX_CARD_MODE=.*/VOX_CARD_MODE=stub/' .env.docker
make restart
```

### Useful Diagnostic Commands

```bash
# Check status of all services
make health

# Detailed logs with filtering
make logs | grep ERROR
make logs-backend | grep -i "websocket"
make logs-frontend | grep -i "cors"

# Check configuration
cat .env.docker | grep -v "^#" | grep -v "^$"

# Check API functionality
curl http://localhost:8000/api/status

# Check Redis
docker exec -it vox-redis redis-cli ping
```

## 📚 Additional Documentation

- **[Docker Setup](./DOCKER.md)** - Detailed Docker documentation
- **[Frontend README](./frontend/README.md)** - Frontend documentation
- **[Backend README](./backend/README.md)** - Backend documentation
- **[Google Speech Setup](./GOOGLE_SPEECH_SETUP.md)** - Google STT setup

## 🤝 Support

If you encounter issues:

1. **Check [Troubleshooting](#troubleshooting)**
2. **Review logs**: `make logs`
3. **Create an Issue** in the repository with:
   - Problem description
   - Logs (`make logs > logs.txt`)
   - Configuration (without secret keys)
   - Docker version (`docker --version`)

## 📄 License

MIT License - see [LICENSE](./LICENSE) file

---

**Made with ❤️ to improve workshops and presentations**