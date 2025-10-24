#!/bin/bash

# Development Environment Startup Script
# Opens iTerm2 with split panes running all necessary development services

# Get the project root directory (parent of scripts folder)
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"

# AppleScript to create iTerm2 layout with split panes
osascript <<EOF
tell application "iTerm"
    activate
    
    -- Create new window
    create window with default profile
    
    tell current session of current window
        -- Pane 1: Next.js dev server (top left)
        write text "cd \"$PROJECT_DIR\" && clear && echo '🚀 Starting Next.js Dev Server...' && pnpm run dev"
    end tell
    
    delay 0.2
    
    tell current session of current window
        -- Split horizontally to create bottom left
        split horizontally with default profile
    end tell
    
    delay 0.2
    
    tell second session of current tab of current window
        -- Pane 2: Azure Functions (bottom left)
        write text "cd \"$PROJECT_DIR/azure\" && clear && echo '⚡ Starting Azure Functions...' && func start"
    end tell
    
    delay 0.2
    
    tell first session of current tab of current window
        -- Split vertically to create top middle
        split vertically with default profile
    end tell
    
    delay 0.2
    
    tell second session of current tab of current window
        -- Pane 3: Slack Bot (top middle)
        write text "cd \"$PROJECT_DIR/slack-bot\" && clear && echo '🤖 Starting Slack Bot...' && pnpm run dev"
    end tell
    
    delay 0.2
    
    tell second session of current tab of current window
        -- Split vertically to create top right
        split vertically with default profile
    end tell
    
    delay 0.2
    
    tell third session of current tab of current window
        -- Pane 4: ngrok (top right)
        write text "clear && echo '🌐 Starting ngrok tunnel...' && ngrok http 3001"
    end tell
    
    delay 0.2
    
    tell fourth session of current tab of current window
        -- Split horizontally to create bottom right
        split horizontally with default profile
    end tell
    
    delay 0.2
    
    tell fifth session of current tab of current window
        -- Pane 5: General terminal (bottom right)
        write text "cd \"$PROJECT_DIR\" && clear && echo '💻 General Terminal' && echo '' && echo 'Available commands:' && echo '  - git status' && echo '  - pnpm install' && echo '  - etc.'"
    end tell
    
end tell
EOF

echo "✅ Development environment started in iTerm!"
echo ""
echo "Layout:"
echo "  📦 Top Left:    Next.js (http://localhost:3000)"
echo "  ⚡ Bottom Left: Azure Functions (http://localhost:7071)"
echo "  🤖 Top Middle:  Slack Bot (port 3001)"
echo "  🌐 Top Right:   ngrok tunnel"
echo "  💻 Bottom Right: General terminal"

