#!/bin/bash

# Taskito Installation Script
# This script installs Taskito globally using npm

echo "🎯 Installing Taskito - A tiny task master..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | sed 's/v//')
NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please upgrade to Node.js 18+."
    echo "   Current: $NODE_VERSION"
    echo "   Required: 18.0.0+"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo "✅ npm $(npm -v) detected"

# Determine installation method
if [ -f "package.json" ] && grep -q '"name": "@particular-labs/taskito"' package.json; then
    # Installing from local directory
    echo "📦 Installing Taskito from local directory..."
    npm install -g .
else
    # Try to install from npm registry first, fallback to GitHub
    echo "📦 Installing Taskito from npm registry..."
    if ! npm install -g @particular-labs/taskito 2>/dev/null; then
        echo "📦 NPM registry not available, installing from GitHub..."
        npm install -g git+https://github.com/particular-labs/taskito.git
    fi
fi

# Check if installation was successful
if command -v taskito &> /dev/null; then
    echo "✅ Taskito installed successfully!"
    echo ""
    echo "🎯 Quick verification:"
    echo "   taskito --version"
    echo ""
    echo "📋 Next steps:"
    echo "1. Add Taskito to your MCP client configuration:"
    echo '   {"mcpServers": {"taskito": {"command": "taskito"}}}'
    echo ""
    echo "2. Navigate to a project directory:"
    echo "   cd my-project"
    echo ""
    echo "3. Start creating tasks:"
    echo '   Initialize project "My App" with description "My awesome project"'
    echo ""
    echo "📚 For detailed usage, see: https://github.com/particular-labs/taskito"
else
    echo "❌ Installation failed. Please try manual installation:"
    echo "   npm install -g @particular-labs/taskito"
    echo ""
    echo "Or from GitHub:"
    echo "   npm install -g git+https://github.com/particular-labs/taskito.git"
    exit 1
fi

echo ""
echo "Happy task management with Taskito! 🎯✨"