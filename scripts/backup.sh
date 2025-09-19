#!/bin/bash
# Backup script for Vox Canvas Redis data

set -euo pipefail

# Configuration
BACKUP_DIR="backups"
COMPOSE_FILE="docker-compose.yml"
REDIS_CONTAINER="vox-redis"
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/redis-backup-$DATE.rdb"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check if Redis container is running
if ! docker-compose -f "$COMPOSE_FILE" ps | grep -q "$REDIS_CONTAINER.*Up"; then
    echo_error "Redis container is not running. Please start services first with 'make up' or 'make dev'"
    exit 1
fi

echo_info "Starting backup of Redis data..."

# Create Redis backup
if docker-compose -f "$COMPOSE_FILE" exec redis redis-cli --rdb - > "$BACKUP_FILE"; then
    echo_info "Backup completed successfully: $BACKUP_FILE"
    echo_info "Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
else
    echo_error "Backup failed!"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Optional: Clean up old backups (keep last 7 days)
find "$BACKUP_DIR" -name "redis-backup-*.rdb" -mtime +7 -delete 2>/dev/null || true

echo_info "Backup process completed!"
echo_info "To restore this backup, run: make restore BACKUP_FILE=$BACKUP_FILE"