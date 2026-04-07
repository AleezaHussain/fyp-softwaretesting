$ErrorActionPreference = 'Stop'

# Reuse realistic 24-hour series (same as air simulation profile)
$tempSeries = @(24,25.55,27,28.24,29.2,29.8,30,29.8,29.2,28.24,27,25.55,24,22.45,21,19.76,18.8,18.2,18,18.2,18.8,19.76,21,22.45)
$rhSeries = @(60,57.41,55,52.93,51.34,50.34,50,50.34,51.34,52.93,55,57.41,60,62.59,65,67.07,68.66,69.66,70,69.66,68.66,67.07,65,62.59)
$itSeries = @(34.9975405113,34.1344008609,33.84,34.1344008609,34.9975405113,36.3705974105,38.16,40.2438034503,42.48,44.7161965497,46.8,48.5894025895,49.9624594887,50.8255991391,51.12,50.8255991391,49.9624594887,48.5894025895,46.8,44.7161965497,42.48,40.2438034503,38.16,36.3705974105)

$payload = @{
  scenario = @{
    tempC = 999
    rh = 999
    itLoadKW = 999
    electricityPrice = 0.145
    waterPrice = 1.15
    carbonFactor = 0.46
  }
  current_technique = 'AirEconomizer'
  simulation_hourly = @{
    tempC = $tempSeries
    rh = $rhSeries
    itLoadKW = $itSeries
  }
  technique_results = @(
    @{ tech='AirEconomizer'; feasible=$true; energy_kwh=1292.5658; water_liters=0;      cost=187.42; emissions_kg=594.58; violations=0 },
    @{ tech='Evaporative';   feasible=$true; energy_kwh=1180.0;    water_liters=9800.0; cost=171.10; emissions_kg=542.8;  violations=0 },
    @{ tech='ChilledWater';  feasible=$true; energy_kwh=1380.0;    water_liters=6400.0; cost=200.10; emissions_kg=634.8;  violations=0 }
  )
  metrics_unit = 'annual'
}

$json = $payload | ConvertTo-Json -Depth 15
$response = Invoke-RestMethod -Uri 'http://localhost:8000/recommend' -Method POST -Body $json -ContentType 'application/json'

Write-Host '=== ML RESPONSE WITH technique_results ==='
$response | ConvertTo-Json -Depth 20
