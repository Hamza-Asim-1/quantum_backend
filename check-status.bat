@echo off
echo ====================================
echo System Status Check
echo ====================================
echo.

echo Checking Port 5432 (PostgreSQL):
netstat -ano | findstr :5432
echo.

echo Checking Port 6379 (Redis):
netstat -ano | findstr :6379
echo.

echo ====================================
echo Docker Container Status:
echo ====================================
docker-compose ps
echo.

echo ====================================
echo Docker Container Health:
echo ====================================
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.

pause