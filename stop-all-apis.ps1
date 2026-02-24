# ============================================================================
# Stop All APIs Script
# Stops all running Spring Boot applications
# ============================================================================

Write-Host "╔═══════════════════════════════════════════════════════════════════════╗" -ForegroundColor Red
Write-Host "║         Stopping All Cooling System APIs                             ║" -ForegroundColor Red
Write-Host "╚═══════════════════════════════════════════════════════════════════════╝" -ForegroundColor Red
Write-Host ""

# Find and kill all Java processes running Spring Boot
$springBootProcesses = Get-Process -Name "java" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*spring-boot*" -or $_.CommandLine -like "*mvn*"
}

if ($springBootProcesses) {
    Write-Host "Found $($springBootProcesses.Count) Spring Boot process(es) running..." -ForegroundColor Yellow
    
    foreach ($process in $springBootProcesses) {
        Write-Host "  Stopping process $($process.Id)..." -ForegroundColor Gray
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    }
    
    Write-Host ""
    Write-Host "✅ All APIs stopped successfully!" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No running Spring Boot APIs found." -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Press Enter to exit"
