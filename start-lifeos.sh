#!/bin/bash
# LifeOS — Startup Script
# Kills stale processes, starts the dev server on port 3000

set -e

PORT=3000
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 LifeOS — Starting up..."

# Kill any existing process on the port
if lsof -ti:$PORT &>/dev/null; then
  echo "⚠️  Killing existing process on port $PORT..."
  lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
  sleep 1
fi

cd "$PROJECT_DIR"

# Install deps if node_modules is missing
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

echo "✅ Starting LifeOS dev server on http://127.0.0.1:$PORT"
echo "   ⚠️  Use 127.0.0.1 NOT localhost (required for Spotify OAuth)"
echo ""

# Start the dev server (--hostname 127.0.0.1 is set in package.json)
npm run dev
