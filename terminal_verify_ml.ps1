$ErrorActionPreference = 'Stop'

$tempSeries = @(10, 20, 30, 40)
$rhSeries = @(40, 50, 60, 70)
$itSeries = @(800, 1000, 1200, 1400)

$avgTemp = ($tempSeries | Measure-Object -Average).Average
$avgRh = ($rhSeries | Measure-Object -Average).Average
$avgIt = ($itSeries | Measure-Object -Average).Average

Write-Host "=== Expected Hourly Averages ==="
Write-Host ("tempC avg: {0}" -f [math]::Round($avgTemp, 2))
Write-Host ("rh avg: {0}" -f [math]::Round($avgRh, 2))
Write-Host ("itLoadKW avg: {0}" -f [math]::Round($avgIt, 2))
Write-Host ""

$techniques = @("AirEconomizer", "Evaporative", "ChilledWater")

foreach ($tech in $techniques) {
  $payload = @{
    scenario = @{
      tempC = 999
      rh = 999
      itLoadKW = 999
      electricityPrice = 0.145
      waterPrice = 1.15
      carbonFactor = 0.46
    }
    current_technique = $tech
    simulation_hourly = @{
      tempC = $tempSeries
      rh = $rhSeries
      itLoadKW = $itSeries
    }
    technique_results = @(
      @{ tech = "AirEconomizer"; feasible = $true; energy_kwh = 155000; water_liters = 5000; cost = 26000; emissions_kg = 100000; violations = 0 },
      @{ tech = "Evaporative"; feasible = $true; energy_kwh = 145000; water_liters = 450000; cost = 24500; emissions_kg = 95000; violations = 0 },
      @{ tech = "ChilledWater"; feasible = $true; energy_kwh = 163780; water_liters = 294088; cost = 27235; emissions_kg = 102084; violations = 0 }
    )
    metrics_unit = "annual"
  }

  $json = $payload | ConvertTo-Json -Depth 8
  $resp = Invoke-RestMethod -Uri "http://localhost:8000/recommend" -Method POST -Body $json -ContentType "application/json"

  Write-Host ("=== current_technique = {0} ===" -f $tech)
  Write-Host ("recommended: {0}" -f $resp.model_recommendation)
  Write-Host ("reason[0]: {0}" -f $resp.why_this_is_recommended[0])
  Write-Host ("reason[1]: {0}" -f $resp.why_this_is_recommended[1])
  Write-Host ""
}
