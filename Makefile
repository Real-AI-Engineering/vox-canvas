# Vox Canvas Docker Management Makefile
# =============================================================================

# Colors for output
RED=\033[0;31m
GREEN=\033[0;32m
YELLOW=\033[1;33m
BLUE=\033[0;34m
NC=\033[0m # No Color

# Project configuration
PROJECT_NAME=vox-canvas
COMPOSE_FILE=docker-compose.yml
COMPOSE_DEV_FILE=docker-compose.dev.yml
ENV_FILE=.env.docker

# Default target
.DEFAULT_GOAL := help

# =============================================================================
# MAIN COMMANDS
# =============================================================================

.PHONY: help
help: ## Show this help message
	@echo "$(GREEN)Vox Canvas Docker Management$(NC)"
	@echo "================================"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "$(BLUE)%-20s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

.PHONY: setup
setup: ## Initial setup - copy env file and create credentials placeholder
	@echo "$(YELLOW)Setting up Vox Canvas environment...$(NC)"
	@if [ ! -f $(ENV_FILE) ]; then \
		cp .env.docker.example $(ENV_FILE); \
		echo "$(GREEN)✓ Created $(ENV_FILE) from template$(NC)"; \
	else \
		echo "$(YELLOW)! $(ENV_FILE) already exists$(NC)"; \
	fi
	@if [ ! -f backend/google-credentials.json ]; then \
		echo '{"type":"service_account","project_id":"placeholder"}' > backend/google-credentials.json; \
		echo "$(GREEN)✓ Created placeholder Google credentials$(NC)"; \
		echo "$(RED)⚠ Update backend/google-credentials.json with real credentials$(NC)"; \
	fi
	@echo "$(GREEN)✓ Setup complete! Edit $(ENV_FILE) and run 'make up'$(NC)"

.PHONY: up
up: ## Start all services in production mode
	@echo "$(YELLOW)Starting Vox Canvas services...$(NC)"
	@docker-compose -f $(COMPOSE_FILE) --env-file=$(ENV_FILE) up -d
	@echo "$(GREEN)✓ Services started!$(NC)"
	@echo "Frontend: http://vox.local (add to /etc/hosts: 127.0.0.1 vox.local)"
	@echo "API: http://api.vox.local"
	@echo "Traefik Dashboard: http://localhost:8080"

.PHONY: dev
dev: ## Start services in development mode with hot reload
	@echo "$(YELLOW)Starting Vox Canvas in development mode...$(NC)"
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) --env-file=$(ENV_FILE) up -d
	@echo "$(GREEN)✓ Development services started!$(NC)"
	@echo "Frontend Dev: http://localhost:5173"
	@echo "Backend API: http://localhost:8000"
	@echo "Traefik Dashboard: http://localhost:8080"

.PHONY: down
down: ## Stop all services
	@echo "$(YELLOW)Stopping Vox Canvas services...$(NC)"
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) down
	@echo "$(GREEN)✓ Services stopped$(NC)"

.PHONY: restart
restart: down up ## Restart all services

.PHONY: restart-dev
restart-dev: down dev ## Restart services in development mode

# =============================================================================
# BUILD COMMANDS
# =============================================================================

.PHONY: build
build: ## Build all Docker images
	@echo "$(YELLOW)Building Docker images...$(NC)"
	@docker-compose -f $(COMPOSE_FILE) build --no-cache
	@echo "$(GREEN)✓ Build complete$(NC)"

.PHONY: build-backend
build-backend: ## Build only backend image
	@echo "$(YELLOW)Building backend image...$(NC)"
	@docker-compose -f $(COMPOSE_FILE) build --no-cache backend
	@echo "$(GREEN)✓ Backend build complete$(NC)"

.PHONY: build-frontend
build-frontend: ## Build only frontend image
	@echo "$(YELLOW)Building frontend image...$(NC)"
	@docker-compose -f $(COMPOSE_FILE) build --no-cache frontend
	@echo "$(GREEN)✓ Frontend build complete$(NC)"

.PHONY: pull
pull: ## Pull latest base images
	@echo "$(YELLOW)Pulling latest images...$(NC)"
	@docker-compose -f $(COMPOSE_FILE) pull
	@echo "$(GREEN)✓ Images updated$(NC)"

# =============================================================================
# DEVELOPMENT COMMANDS
# =============================================================================

.PHONY: logs
logs: ## Show logs for all services
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) logs -f

.PHONY: logs-backend
logs-backend: ## Show backend logs
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) logs -f backend

.PHONY: logs-frontend
logs-frontend: ## Show frontend logs
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) logs -f frontend

.PHONY: logs-traefik
logs-traefik: ## Show Traefik logs
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) logs -f traefik

.PHONY: shell-backend
shell-backend: ## Open shell in backend container
	@docker-compose -f $(COMPOSE_FILE) exec backend /bin/bash

.PHONY: shell-frontend
shell-frontend: ## Open shell in frontend container
	@docker-compose -f $(COMPOSE_FILE) exec frontend /bin/sh

.PHONY: shell-redis
shell-redis: ## Open Redis CLI
	@docker-compose -f $(COMPOSE_FILE) exec redis redis-cli

# =============================================================================
# MAINTENANCE COMMANDS
# =============================================================================

.PHONY: status
status: ## Show service status
	@echo "$(YELLOW)Service Status:$(NC)"
	@docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) ps

.PHONY: health
health: ## Check health of all services
	@echo "$(YELLOW)Health Checks:$(NC)"
	@echo "Backend Health:"
	@curl -s http://localhost:8000/api/health | jq . || echo "Backend not responding"
	@echo "\nFrontend Health:"
	@curl -s http://localhost/health || echo "Frontend not responding"

.PHONY: clean
clean: ## Remove all containers, networks, and volumes
	@echo "$(RED)Warning: This will remove all data!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_DEV_FILE) down -v --remove-orphans; \
		docker system prune -f; \
		echo "$(GREEN)✓ Cleanup complete$(NC)"; \
	else \
		echo "$(YELLOW)Cleanup cancelled$(NC)"; \
	fi

.PHONY: backup
backup: ## Backup Redis data
	@echo "$(YELLOW)Creating backup...$(NC)"
	@mkdir -p backups
	@docker-compose -f $(COMPOSE_FILE) exec redis redis-cli --rdb - > backups/redis-backup-$(shell date +%Y%m%d-%H%M%S).rdb
	@echo "$(GREEN)✓ Backup created in backups/$(NC)"

.PHONY: restore
restore: ## Restore Redis data (specify BACKUP_FILE=filename)
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo "$(RED)Error: Please specify BACKUP_FILE=filename$(NC)"; \
		exit 1; \
	fi
	@echo "$(YELLOW)Restoring from $(BACKUP_FILE)...$(NC)"
	@docker-compose -f $(COMPOSE_FILE) exec -T redis redis-cli --pipe < $(BACKUP_FILE)
	@echo "$(GREEN)✓ Restore complete$(NC)"

# =============================================================================
# TESTING COMMANDS
# =============================================================================

.PHONY: test-backend
test-backend: ## Run backend tests
	@echo "$(YELLOW)Running backend tests...$(NC)"
	@docker-compose -f $(COMPOSE_FILE) exec backend uv run pytest
	@echo "$(GREEN)✓ Backend tests complete$(NC)"

.PHONY: lint-backend
lint-backend: ## Run backend linting
	@echo "$(YELLOW)Running backend linting...$(NC)"
	@docker-compose -f $(COMPOSE_FILE) exec backend uv run ruff check
	@echo "$(GREEN)✓ Backend linting complete$(NC)"

.PHONY: lint-frontend
lint-frontend: ## Run frontend linting
	@echo "$(YELLOW)Running frontend linting...$(NC)"
	@docker-compose -f $(COMPOSE_FILE) exec frontend-dev pnpm run lint
	@echo "$(GREEN)✓ Frontend linting complete$(NC)"

# =============================================================================
# UTILITY COMMANDS
# =============================================================================

.PHONY: update
update: pull build restart ## Update and restart all services

.PHONY: hosts
hosts: ## Show /etc/hosts entries needed for local development
	@echo "$(YELLOW)Add these entries to your /etc/hosts file:$(NC)"
	@echo "127.0.0.1    vox.local"
	@echo "127.0.0.1    api.vox.local"
	@echo "127.0.0.1    traefik.vox.local"

.PHONY: env
env: ## Show current environment configuration
	@echo "$(YELLOW)Current Environment:$(NC)"
	@if [ -f $(ENV_FILE) ]; then \
		grep -v '^#' $(ENV_FILE) | grep -v '^$$' | sort; \
	else \
		echo "$(RED)No $(ENV_FILE) found. Run 'make setup' first.$(NC)"; \
	fi