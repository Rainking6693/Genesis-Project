#!/bin/bash
# Check and kill process on port 8888

PORT=8888

echo "Checking port $PORT..."

PID=$(lsof -ti:$PORT)

if [ -n "$PID" ]; then
    echo "Port $PORT is in use by PID: $PID"
    echo "Killing process..."
    kill -9 $PID
    echo "✅ Port $PORT is now free"
else
    echo "✅ Port $PORT is already free"
fi
