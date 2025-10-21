@echo off
echo ====================================
echo Stopping All Services
echo ====================================
echo.

echo Stopping Docker containers...
docker-compose down

echo.
echo ====================================
echo All Services Stopped!
echo ====================================
pause