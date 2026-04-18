# ============================================================================
# Unified API Startup Script
# Starts all three cooling system APIs simultaneously
# ============================================================================

Write-Host "╔═══════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         Starting All Cooling System APIs                             ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# API Configuration
$apis = @(
    @{
        Name = "Air Economizer API"
        Path = "cooling-air-economizer\api"
        Port = 8080
        Color = "Green"
    },
    @{
        Name = "Chilled Water API"
        Path = "chilled-water-system"
        Port = 8081
        Color = "Blue"
    },
    @{
        Name = "Evaporative Cooling API"
        Path = "evaporative-cooling-api"
        Port = 8082
        Color = "Magenta"
    }
)

# Start each Java API in a new PowerShell window
foreach ($api in $apis) {
    Write-Host "🚀 Starting $($api.Name) on port $($api.Port)..." -ForegroundColor $api.Color
    
    $command = "cd '$($api.Path)'; mvn spring-boot:run; Read-Host 'Press Enter to close'"
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $command -WindowStyle Normal
    
    Start-Sleep -Seconds 2
}

# Start Weather API (Python FastAPI) on port 8085
Write-Host "🌤️  Starting Weather EPW API on port 8085..." -ForegroundColor Yellow
$weatherCmd = "uvicorn weather_api:app --host 0.0.0.0 --port 8085 --reload; Read-Host 'Press Enter to close'"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $weatherCmd -WindowStyle Normal
Start-Sleep -Seconds 1

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                    All APIs Started Successfully!                     ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "API Endpoints:" -ForegroundColor Yellow
Write-Host "  • Air Economizer:      http://localhost:8080/api/v1/air-economizer/simulate" -ForegroundColor White
Write-Host "  • Chilled Water:       http://localhost:8081/api/v1/chilled-water/simulate" -ForegroundColor White
Write-Host "  • Evaporative Cooling: http://localhost:8082/api/v1/evaporative/simulate" -ForegroundColor White
Write-Host "  • Weather EPW API:     http://localhost:8085/regions  (regions/countries/cities/weather)" -ForegroundColor White
Write-Host ""
Write-Host "Swagger UI:" -ForegroundColor Yellow
Write-Host "  • Air Economizer:      http://localhost:8080/swagger-ui.html" -ForegroundColor White
Write-Host "  • Chilled Water:       http://localhost:8081/swagger-ui.html" -ForegroundColor White
Write-Host "  • Evaporative Cooling: http://localhost:8082/swagger-ui.html" -ForegroundColor White
Write-Host ""
Write-Host "Health Checks:" -ForegroundColor Yellow
Write-Host "  • Air Economizer:      http://localhost:8080/api/v1/health" -ForegroundColor White
Write-Host "  • Chilled Water:       http://localhost:8081/api/v1/chilled-water/health" -ForegroundColor White
Write-Host "  • Evaporative Cooling: http://localhost:8082/api/v1/health" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop this script (APIs will continue running in separate windows)" -ForegroundColor Gray
Write-Host "To stop all APIs, close their individual PowerShell windows" -ForegroundColor Gray
Write-Host ""

# Keep script running
Read-Host "Press Enter to exit this window (APIs will keep running)"
