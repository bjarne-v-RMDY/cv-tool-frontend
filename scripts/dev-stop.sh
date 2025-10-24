#!/bin/bash

# Stop all development services
# Kills processes running on development ports

echo "🛑 Stopping all development services..."
echo ""

# Function to kill process on a port
kill_port() {
    local port=$1
    local service=$2
    
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pid" ]; then
        kill -9 $pid 2>/dev/null
        echo "✅ Stopped $service (port $port)"
    else
        echo "ℹ️  No process running on port $port ($service)"
    fi
}

# Kill all development services
kill_port 3000 "Next.js"
kill_port 7071 "Azure Functions"
kill_port 3001 "Slack Bot"

# Kill ngrok (different approach as it doesn't always bind to a specific port)
ngrok_pid=$(pgrep -f "ngrok http")
if [ -n "$ngrok_pid" ]; then
    kill -9 $ngrok_pid 2>/dev/null
    echo "✅ Stopped ngrok tunnel"
else
    echo "ℹ️  ngrok not running"
fi

echo ""
echo "✅ All development services stopped!"
echo ""
echo "💡 Run './scripts/dev.sh' to start again"

