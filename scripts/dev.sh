#!/bin/bash

# Auto-detecting launcher for development environment
# Automatically chooses iTerm2 or Terminal.app

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if iTerm2 is installed and running or available
if [ -d "/Applications/iTerm.app" ]; then
    echo "🎯 Detected iTerm2, using split-pane layout..."
    "$SCRIPT_DIR/dev-start.sh"
else
    echo "📱 iTerm2 not found, using Terminal.app with tabs..."
    "$SCRIPT_DIR/dev-start-terminal.sh"
fi

