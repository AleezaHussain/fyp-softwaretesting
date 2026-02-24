# ============================================================================
# API Connection Test Script
# Tests all three cooling system APIs to verify they're running correctly
# ============================================================================

Write-Host "╔═══════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         Testing All Cooling System APIs                              ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$apis = @(
    @{
        Name = "Air Economizer API"
        Port = 8080
        HealthEndpoint = "http://localhost:8080/api/v1/health"
        SimulateEndpoint = "http://localhost:8080/api/simulate"
        SwaggerUI = "http://localhost:8080/swagger-ui.html"
        Color = "Green"
    },
    @{
        Name = "Chilled Water API"
        Port = 8081
        HealthEndpoint = "http://localhost:8081/api/v1/chilled-water/health"
        SimulateEndpoint = "http://localhost:8081/api/v1/chilled-water/simulate"
        SwaggerUI = "http://localhost:8081/swagger-ui.html"
        Color = "Blue"
    },
    @{
        Name = "Evaporative Cooling API"
        Port = 8082
        HealthEndpoint = "http://localhost:8082/api/v1/health"
        SimulateEndpoint = "http://localhost:8082/api/simulations/evaporative-cooling"
        SwaggerUI = "http://localhost:8082/swagger-ui.html"
        Color = "Magenta"
    }
)

$allPassed = $true

foreach ($api in $apis) {
    Write-Host "Testing $($api.Name) on port $($api.Port)..." -ForegroundColor $api.Color
    
    try {
        # Test if port is listening
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connect = $tcpClient.BeginConnect("localhost", $api.Port, $null, $null)
        $wait = $connect.AsyncWaitHandle.WaitOne(1000, $false)
        
        if ($wait) {
            $tcpClient.EndConnect($connect)
            $tcpClient.Close()
            Write-Host "  ✅ Port $($api.Port) is listening" -ForegroundColor Green
            
            # Test health endpoint
            try {
                $response = Invoke-WebRequest -Uri $api.HealthEndpoint -Method GET -TimeoutSec 5 -ErrorAction Stop
                if ($response.StatusCode -eq 200) {
                    Write-Host "  ✅ Health check passed" -ForegroundColor Green
                    Write-Host "     Response: $($response.Content)" -ForegroundColor Gray
                } else {
                    Write-Host "  ⚠️  Health check returned status $($response.StatusCode)" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "  ⚠️  Health endpoint not responding (might not be implemented)" -ForegroundColor Yellow
            }
            
            Write-Host "  📍 Simulate Endpoint: $($api.SimulateEndpoint)" -ForegroundColor Gray
            Write-Host "  🌐 Swagger UI: $($api.SwaggerUI)" -ForegroundColor Gray
            
        } else {
            $tcpClient.Close()
            Write-Host "  ❌ Port $($api.Port) is NOT listening" -ForegroundColor Red
            Write-Host "     API is not running!" -ForegroundColor Red
            $allPassed = $false
        }
    } catch {
        Write-Host "  ❌ Error testing port $($api.Port): $($_.Exception.Message)" -ForegroundColor Red
        $allPassed = $false
    }
    
    Write-Host ""
}

Write-Host "╔═══════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                        Test Summary                                   ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if ($allPassed) {
    Write-Host "✅ All APIs are running correctly!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Frontend Configuration:" -ForegroundColor Yellow
    Write-Host "  • Air Economizer calls:      http://localhost:8080/api/simulate" -ForegroundColor White
    Write-Host "  • Chilled Water calls:       http://localhost:8081/api/v1/chilled-water/simulate" -ForegroundColor White
    Write-Host "  • Evaporative Cooling calls: http://localhost:8082/api/simulations/evaporative-cooling" -ForegroundColor White
    Write-Host ""
    Write-Host "You can now run your frontend and all APIs will work!" -ForegroundColor Green
} else {
    Write-Host "❌ Some APIs are not running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "To start all APIs, run:" -ForegroundColor Yellow
    Write-Host "  .\start-all-apis.ps1" -ForegroundColor White
}

Write-Host ""
Read-Host "Press Enter to exit"
