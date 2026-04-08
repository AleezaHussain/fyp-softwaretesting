$ErrorActionPreference = 'Stop'

Write-Host '================ MODEL FULL VERIFICATION ================'

# 1) Check health
Write-Host "`n[1] API Health"
$health = Invoke-RestMethod -Uri 'http://localhost:8000/health' -Method GET
$health | ConvertTo-Json -Depth 10

# 2) Build deterministic hourly arrays
$tempSeries = @(10, 20, 30, 40)
$rhSeries = @(40, 50, 60, 70)
$itSeries = @(800, 1000, 1200, 1400)

$avgTemp = ($tempSeries | Measure-Object -Average).Average
$avgRh = ($rhSeries | Measure-Object -Average).Average
$avgIt = ($itSeries | Measure-Object -Average).Average

Write-Host "`n[2] Hourly Inputs + Calculated Averages"
Write-Host ("tempC hourly: " + (($tempSeries -join ', ')))
Write-Host ("rh hourly: " + (($rhSeries -join ', ')))
Write-Host ("itLoadKW hourly: " + (($itSeries -join ', ')))
Write-Host ("avg tempC: {0}" -f [math]::Round($avgTemp, 2))
Write-Host ("avg rh: {0}" -f [math]::Round($avgRh, 2))
Write-Host ("avg itLoadKW: {0}" -f [math]::Round($avgIt, 2))

# 3) Build request payload
$payload = @{
  scenario = @{
    tempC = 999
    rh = 999
    itLoadKW = 999
    electricityPrice = 0.145
    waterPrice = 1.15
    carbonFactor = 0.46
  }
  current_technique = 'ChilledWater'
  simulation_hourly = @{
    tempC = $tempSeries
    rh = $rhSeries
    itLoadKW = $itSeries
  }
  technique_results = @(
    @{ tech = 'AirEconomizer'; feasible = $true; energy_kwh = 155000; water_liters = 5000;   cost = 26000; emissions_kg = 100000; violations = 0 },
    @{ tech = 'Evaporative';   feasible = $true; energy_kwh = 145000; water_liters = 450000; cost = 24500; emissions_kg = 95000;  violations = 0 },
    @{ tech = 'ChilledWater';  feasible = $true; energy_kwh = 163780; water_liters = 294088; cost = 27235; emissions_kg = 102084; violations = 0 }
  )
  metrics_unit = 'annual'
}

Write-Host "`n[3] Request Payload Sent To /recommend"
$payloadJson = $payload | ConvertTo-Json -Depth 10
$payloadJson

# 4) Call recommendation
Write-Host "`n[4] Full /recommend Response"
$response = Invoke-RestMethod -Uri 'http://localhost:8000/recommend' -Method POST -Body $payloadJson -ContentType 'application/json'
$response | ConvertTo-Json -Depth 20

Write-Host "`n[5] Key Interpretation"
Write-Host ("Current technique: " + $response.current_technique)
Write-Host ("Recommended technique: " + $response.model_recommendation)
Write-Host ("Reason #1: " + $response.why_this_is_recommended[0])
Write-Host ("Reason #2: " + $response.why_this_is_recommended[1])
Write-Host '========================================================='
