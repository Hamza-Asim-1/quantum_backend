# PowerShell script to safely start Docker containers
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Starting Investment Platform Docker" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Function to check and kill process on port
function Kill-PortProcess {
    param($Port)
    
    Write-Host "Checking port $Port..." -ForegroundColor Yellow
    
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        
        if ($connections) {
            foreach ($conn in $connections) {
                $processId = $conn.OwningProcess
                $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                
                if ($process) {
                    Write-Host "  Killing process '$($process.ProcessName)' (PID: $processId) on port $Port" -ForegroundColor Red
                    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                }
            }
            Start-Sleep -Seconds 2
            Write-Host "  Port $Port cleared!" -ForegroundColor Green
        } else {
            Write-Host "  Port $Port is already free" -ForegroundColor Green
        }
    } catch {
        Write-Host "  Port $Port is free" -ForegroundColor Green
    }
}

# Stop existing containers
Write-Host ""
Write-Host "Step 1: Stopping existing Docker containers..." -ForegroundColor Yellow
docker-compose down 2>$null
Start-Sleep -Seconds 2

# Check and clear ports
Write-Host ""
Write-Host "Step 2: Checking ports..." -ForegroundColor Yellow
Kill-PortProcess -Port 5432
Kill-PortProcess -Port 6379

# Start Docker containers
Write-Host ""
Write-Host "Step 3: Starting Docker containers..." -ForegroundColor Yellow
docker-compose up -d

# Wait for services
Write-Host ""
Write-Host "Step 4: Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Check status
Write-Host ""
Write-Host "Step 5: Checking container status..." -ForegroundColor Yellow
docker-compose ps

# Test connections
Write-Host ""
Write-Host "Step 6: Testing connections..." -ForegroundColor Yellow
Write-Host ""

Write-Host "Testing Redis..." -ForegroundColor Cyan
docker exec investment-platform-redis redis-cli -a redis123 PING 2>$null

Write-Host "Testing PostgreSQL..." -ForegroundColor Cyan
docker exec investment-platform-db psql -U postgres -c "SELECT 'PostgreSQL is ready!' as status;" 2>$null

# Final message
Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "PostgreSQL: localhost:5432" -ForegroundColor White
Write-Host "Redis: localhost:6379" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. npm run dev          (Start backend)" -ForegroundColor White
Write-Host "  2. npm run docker:logs  (View logs)" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to continue"