#!/bin/bash

# Development Environment Startup Script (Terminal.app fallback)
# Opens multiple Terminal tabs running all necessary development services

# Get the project root directory (parent of scripts folder)
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"

echo "🚀 Starting development environment in Terminal.app..."

# AppleScript to create Terminal tabs
osascript <<EOF
tell application "Terminal"
    activate
    
    -- Tab 1: Next.js dev server
    do script "cd \"$PROJECT_DIR\" && clear && echo '🚀 Starting Next.js Dev Server...' && pnpm run dev"
    set custom title of front window to "Next.js :3000"
    
    -- Tab 2: Azure Functions
    tell application "System Events" to keystroke "t" using command down
    delay 0.5
    do script "cd \"$PROJECT_DIR/azure\" && clear && echo '⚡ Starting Azure Functions...' && func start" in front window
    set custom title of front window to "Azure Functions :7071"
    
    -- Tab 3: Slack Bot
    tell application "System Events" to keystroke "t" using command down
    delay 0.5
    do script "cd \"$PROJECT_DIR/slack-bot\" && clear && echo '🤖 Starting Slack Bot...' && pnpm run dev" in front window
    set custom title of front window to "Slack Bot :3001"
    
    -- Tab 4: ngrok
    tell application "System Events" to keystroke "t" using command down
    delay 0.5
    do script "clear && echo '🌐 Starting ngrok tunnel...' && ngrok http 3001" in front window
    set custom title of front window to "ngrok tunnel"
    
    -- Tab 5: General terminal
    tell application "System Events" to keystroke "t" using command down
    delay 0.5
    do script "cd \"$PROJECT_DIR\" && clear && echo '💻 General Terminal' && echo '' && echo 'Available commands:' && echo '  - git status' && echo '  - pnpm install' && echo '  - etc.'" in front window
    set custom title of front window to "General"
    
    -- Return to first tab
    tell application "System Events" to keystroke "1" using command down
end tell
EOF

echo ""
echo "✅ Development environment started in Terminal!"
echo ""
echo "Tabs created:"
echo "  Tab 1: 📦 Next.js (http://localhost:3000)"
echo "  Tab 2: ⚡ Azure Functions (http://localhost:7071)"
echo "  Tab 3: 🤖 Slack Bot (port 3001)"
echo "  Tab 4: 🌐 ngrok tunnel"
echo "  Tab 5: 💻 General terminal"
echo ""
echo "💡 Tip: Use Cmd+1,2,3,4,5 to switch between tabs"

