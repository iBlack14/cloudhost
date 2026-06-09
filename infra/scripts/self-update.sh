#!/bin/bash

# Setup paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
STATUS_FILE="$REPO_DIR/update-status.json"
LOG_FILE="$REPO_DIR/self-update.log"

# Function to update JSON status
update_status() {
  local status="$1"
  local step="$2"
  local error="$3"
  
  if [ -n "$error" ]; then
    # Escape quotes in error message
    error=$(echo "$error" | sed 's/"/\\"/g' | tr -d '\n')
    cat <<EOT > "$STATUS_FILE"
{
  "status": "$status",
  "step": "$step",
  "error": "$error",
  "updatedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOT
  else
    cat <<EOT > "$STATUS_FILE"
{
  "status": "$status",
  "step": "$step",
  "error": null,
  "updatedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOT
  fi
}

# Redirect all output to log file
exec > "$LOG_FILE" 2>&1

echo "=== self-update starting at $(date) ==="
update_status "running" "git_pull" ""

cd "$REPO_DIR"

# Ensure we are in a clean state (optional, but good for git pulls)
# git stash

# 1. Git pull
echo "Pulling latest changes from Git..."
if ! git pull; then
  echo "Error: git pull failed"
  update_status "failed" "git_pull" "git pull failed. Check for merge conflicts."
  exit 1
fi

# 2. PNPm Install
echo "Installing dependencies..."
update_status "running" "dependencies" ""
if ! pnpm install; then
  echo "Error: pnpm install failed"
  update_status "failed" "dependencies" "pnpm install failed"
  exit 1
fi

# 3. Build Types
echo "Building types..."
update_status "running" "build_types" ""
if ! pnpm --filter @odisea/types build; then
  echo "Error: types build failed"
  update_status "failed" "build_types" "Shared types build failed"
  exit 1
fi

# 4. Build Projects
echo "Building applications..."
update_status "running" "build_apps" ""
if ! pnpm build; then
  echo "Error: pnpm build failed"
  update_status "failed" "build_apps" "Next.js/API build failed"
  exit 1
fi

# 5. Restart PM2
echo "Restarting services in PM2..."
update_status "success" "completed" ""
echo "=== self-update complete at $(date) ==="

# Trigger PM2 restart in a detached subshell to avoid killing the script itself
(sleep 1 && pm2 restart all) &
