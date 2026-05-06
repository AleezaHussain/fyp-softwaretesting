#!/bin/bash

echo "=========================================="
echo "AIR-SIDE ECONOMIZER API - RESTART SCRIPT"
echo "=========================================="
echo ""

# Navigate to the project root
cd "$(dirname "$0")"

echo "[1/5] Stopping any running API instances..."
# Find and kill any running Spring Boot process on port 8082
PID=$(lsof -ti:8082 2>/dev/null)
if [ ! -z "$PID" ]; then
    echo "  Found process on port 8082 (PID: $PID), stopping..."
    kill -9 $PID 2>/dev/null
    sleep 2
    echo "  ✓ Stopped"
else
    echo "  No running instance found"
fi

echo ""
echo "[2/5] Cleaning previous builds..."
cd api
mvn clean -q
echo "  ✓ Clean complete"

echo ""
echo "[3/5] Compiling core module..."
cd ..
mvn clean install -DskipTests -q
if [ $? -ne 0 ]; then
    echo "  ✗ Core module compilation failed!"
    exit 1
fi
echo "  ✓ Core module compiled"

echo ""
echo "[4/5] Compiling API module..."
cd api
mvn clean package -DskipTests -q
if [ $? -ne 0 ]; then
    echo "  ✗ API compilation failed!"
    exit 1
fi
echo "  ✓ API compiled"

echo ""
echo "[5/5] Starting API server..."
echo "  Port: 8082"
echo "  JVM: -Xms512m -Xmx4g"
echo "  Logs: api/run_output.txt"
echo ""

# Start the API in the background
nohup mvn spring-boot:run > run_output.txt 2>&1 &
API_PID=$!

echo "  API started with PID: $API_PID"
echo ""
echo "=========================================="
echo "Waiting for API to be ready..."
echo "=========================================="

# Wait for API to be ready (max 60 seconds)
for i in {1..60}; do
    if curl -s http://localhost:8082/actuator/health > /dev/null 2>&1 || \
       curl -s http://localhost:8082/api/economizer/health > /dev/null 2>&1; then
        echo ""
        echo "✓ API is ready!"
        echo ""
        echo "=========================================="
        echo "API ENDPOINTS:"
        echo "=========================================="
        echo "  Health: http://localhost:8082/actuator/health"
        echo "  Simulate: http://localhost:8082/api/economizer/simulate"
        echo ""
        echo "View logs: tail -f cooling-air-economizer/api/run_output.txt"
        echo "Stop API: kill $API_PID"
        echo "=========================================="
        exit 0
    fi
    echo -n "."
    sleep 1
done

echo ""
echo "⚠ API did not respond within 60 seconds"
echo "Check logs: tail -f api/run_output.txt"
exit 1
