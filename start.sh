#!/bin/bash
echo "🚀 Starting SmartSorter v4.0..."
if [ -d "venv" ]; then source venv/bin/activate; fi
uvicorn api:app --reload --port 8000 &
B_PID=$!
cd frontend && npm run dev &
F_PID=$!
trap "kill $B_PID $F_PID 2>/dev/null; exit" INT TERM
wait
