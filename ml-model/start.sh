#!/usr/bin/env bash
# ml-model/start.sh — Start the FastAPI ML microservice
# Usage: ./start.sh [--port 8000]

set -e

PORT=${1:-8000}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR"

# Create venv if it doesn't exist
if [ ! -d ".venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv .venv
fi

source .venv/bin/activate

# Install / upgrade dependencies
echo "Installing dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

echo ""
echo "Starting ReceiptSense ML service on port $PORT..."
echo "Model will be downloaded on first run (~1.5 GB) — subsequent starts are instant."
echo ""

uvicorn app:app --host 0.0.0.0 --port "$PORT" --reload
