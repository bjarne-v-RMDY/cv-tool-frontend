#!/bin/bash

# CV Tool Azure Functions - Local Development Script

echo "🚀 Starting CV Tool Azure Functions (Local Development)"
echo "================================================"

# Check if .NET SDK is installed
if ! command -v dotnet &> /dev/null; then
    echo "❌ .NET SDK not found. Please install .NET 8 SDK"
    echo "   Download from: https://dotnet.microsoft.com/download/dotnet/8.0"
    exit 1
fi

# Check if Azure Functions Core Tools is installed
if ! command -v func &> /dev/null; then
    echo "❌ Azure Functions Core Tools not found."
    echo "   Install with: npm install -g azure-functions-core-tools@4"
    exit 1
fi

echo "✅ .NET SDK version: $(dotnet --version)"
echo "✅ Azure Functions Core Tools version: $(func --version)"
echo ""

# Check if local.settings.json exists
if [ ! -f "local.settings.json" ]; then
    echo "❌ local.settings.json not found!"
    echo "   Please create it with your Azure credentials"
    exit 1
fi

echo "✅ local.settings.json found"
echo ""

# Restore packages
echo "📦 Restoring NuGet packages..."
dotnet restore

if [ $? -ne 0 ]; then
    echo "❌ Failed to restore packages"
    exit 1
fi

echo "✅ Packages restored"
echo ""

# Build project
echo "🔨 Building project..."
dotnet build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful"
echo ""

# Start Functions
echo "🎯 Starting Azure Functions..."
echo "   Available functions:"
echo "   - CVProcessing (Queue: cv-processing-queue)"
echo "   - IndexCV (Queue: cv-indexing-queue)"
echo "   - ProjectProcessing (Queue: project-processing-queue)"
echo "   - VacancyProcessing (Queue: vacancy-processing-queue)"
echo "   - VacancyMatching (Queue: vacancy-matching-queue)"
echo ""
echo "   Press Ctrl+C to stop"
echo "================================================"
echo ""

func start



