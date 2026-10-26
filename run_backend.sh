#!/bin/bash
# ContextLens - Backend Startup Script
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=================================================="
echo "      🔍 ContextLens Backend Service             "
echo "=================================================="

# Check Python3
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: python3 is not installed."
    exit 1
fi

# Set up virtual environment if not already existing
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment in ./venv..."
    python3 -m venv venv
fi

# Activate venv
echo "⚡ Activating virtual environment..."
source venv/bin/activate

# Install / update dependencies
echo "📥 Installing requirements..."
pip install -q -r backend/requirements.txt

# Create .env from .env.example if missing
if [ ! -f "backend/.env" ]; then
    echo "📝 Creating backend/.env from .env.example..."
    cp backend/.env.example backend/.env
fi

echo "🚀 Starting ContextLens FastAPI server on http://localhost:8000 ..."
echo "📖 Swagger API documentation available at http://localhost:8000/docs"
echo "=================================================="

exec uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
