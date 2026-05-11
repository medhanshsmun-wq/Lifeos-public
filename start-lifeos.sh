#!/bin/bash

# --- CONFIGURATION ---
# The absolute path to your project
PROJECT_DIR="/Users/medhansh/dsa/lifeos"
PORT=3000
# ---------------------

echo "Starting LifeOS Core..."

# 1. Load shell profile to find npm/node (crucial for Automator)
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
[ -s "$HOME/.zshrc" ] && source "$HOME/.zshrc"
[ -s "$HOME/.bash_profile" ] && source "$HOME/.bash_profile"
[ -s "$HOME/.nvm/nvm.sh" ] && source "$HOME/.nvm/nvm.sh"

# 2. Navigate to the project directory
cd "$PROJECT_DIR" || exit

# 3. Handle Lifecycle
# Clean up any existing process on the port
lsof -ti :$PORT | xargs kill -9 2>/dev/null

# 4. Start the server
echo "Initializing Neural Server..."
$(which npm) run dev > .server.log 2>&1 &
SERVER_PID=$!

# Ensure the server dies when this script exits
trap "echo 'Shutting down LifeOS...'; kill $SERVER_PID; exit" SIGINT SIGTERM EXIT

# 5. Wait for the server to be ready
sleep 6

# 6. Launch in dedicated "App View" with a UNIQUE Profile
CHROME_PROFILE="$PROJECT_DIR/.chrome_profile"
mkdir -p "$CHROME_PROFILE"

echo "Launching LifeOS Interface..."
# Launch Chrome in the background
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --app="http://127.0.0.1:$PORT" \
  --user-data-dir="$CHROME_PROFILE" \
  --start-fullscreen \
  --no-first-run \
  --no-default-browser-check &

echo "LifeOS is active. Monitoring window status..."

# High-sensitivity monitor: Stay alive as long as any Chrome process is using this profile
while pgrep -f "$CHROME_PROFILE" > /dev/null; do
    sleep 1
done

echo "LifeOS Window Closed. Terminating Neural Server..."
# Triggering the trap logic manually to be safe
kill $SERVER_PID 2>/dev/null
exit 0
