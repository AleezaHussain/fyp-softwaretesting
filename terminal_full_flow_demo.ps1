$ErrorActionPreference = 'Stop'

Write-Host "================ FULL FLOW DEMO (INPUT -> SIMULATION -> ML) ================"

# 1) Build 24-hour simulation input
$weather = @()
for ($h = 0; $h -lt 24; $h++) {
  $temp = 24 + 6 * [Math]::Sin((2 * [Math]::PI * $h) / 24)
  $rh = 60 - 10 * [Math]::Sin((2 * [Math]::PI * $h) / 24)
  $weather += @{ timestamp = "h$h"; temperature = [Math]::Round($temp, 2); humidity = [Math]::Round($rh, 2) }
}

$simInput = @{
  enableCloudSim = $false
  numberOfRacks = 6
  serversPerRack = 16
  serverMaxPowerW = 600
  serverIdlePowerW = 150
  averageUtilization = 65
  peakUtilization = 85
  carbonIntensity = 0.46
  electricityTariff = 0.145
  airflowCFM = 10000
  supplyAirTemp = 18
  returnAirTemp = 30
  deltaT = 12
  economizerMaxOutdoorTemp = 30
  economizerMaxHumidity = 85
  minOutdoorAirFraction = 0.2
  bestQuantity = 2
  bestEfficiency = 0.75
  averageQuantity = 2
  averageEfficiency = 0.6
  legacyQuantity = 1
  legacyEfficiency = 0.45
  weatherData = $weather
}

$simInputJson = $simInput | ConvertTo-Json -Depth 12
$simInputJson | Set-Content air_demo_input.json

Write-Host "`n[STEP 1] Simulation Input JSON (saved to air_demo_input.json):"
Get-Content air_demo_input.json

# 2) Run simulation API
Write-Host "`n[STEP 2] Running simulation: POST http://localhost:8080/api/simulate"
$simResponse = Invoke-RestMethod -Uri 'http://localhost:8080/api/simulate' -Method POST -Body $simInputJson -ContentType 'application/json'
$simResponse | ConvertTo-Json -Depth 20 | Set-Content air_demo_simulation_output.json

Write-Host "Simulation summary:"
Write-Host ("  totalEnergy_kWh: " + [Math]::Round($simResponse.summary.totalEnergy_kWh, 4))
Write-Host ("  averagePUE: " + [Math]::Round($simResponse.summary.averagePUE, 4))
Write-Host ("  hourlyResults count: " + $simResponse.hourlyResults.Count)

# 3) Extract hourly series for ML inputs
$tempSeries = @($simResponse.hourlyResults | ForEach-Object { [double]$_.outdoorTempC })
$rhSeries = @($simResponse.hourlyResults | ForEach-Object { [double]$_.outdoorRH })
$itSeries = @($simResponse.hourlyResults | ForEach-Object { [double]$_.itLoad_kW })

$avgTemp = ($tempSeries | Measure-Object -Average).Average
$avgRh = ($rhSeries | Measure-Object -Average).Average
$avgIt = ($itSeries | Measure-Object -Average).Average

Write-Host "`n[STEP 3] Hourly series extracted from simulation output:"
Write-Host ("  tempC[0..5]: " + (($tempSeries | Select-Object -First 6) -join ', '))
Write-Host ("  rh[0..5]: " + (($rhSeries | Select-Object -First 6) -join ', '))
Write-Host ("  itLoadKW[0..5]: " + (($itSeries | Select-Object -First 6) -join ', '))
Write-Host "Averages used by ML:"
Write-Host ("  avg tempC: " + [Math]::Round($avgTemp, 4))
Write-Host ("  avg rh: " + [Math]::Round($avgRh, 4))
Write-Host ("  avg itLoadKW: " + [Math]::Round($avgIt, 4))

# 4) Build ML request using simulation hourly outputs
$mlPayload = @{
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
    @{tech='AirEconomizer';feasible=$true;energy_kwh=155000;water_liters=5000;cost=26000;emissions_kg=100000;violations=0},
    @{tech='Evaporative';feasible=$true;energy_kwh=145000;water_liters=450000;cost=24500;emissions_kg=95000;violations=0},
    @{tech='ChilledWater';feasible=$true;energy_kwh=163780;water_liters=294088;cost=27235;emissions_kg=102084;violations=0}
  )
  metrics_unit = 'annual'
}

$mlJson = $mlPayload | ConvertTo-Json -Depth 30
$mlJson | Set-Content ml_demo_input.json

Write-Host "`n[STEP 4] ML Input JSON (saved to ml_demo_input.json):"
Get-Content ml_demo_input.json

# 5) Run ML recommendation
Write-Host "`n[STEP 5] Running recommender: POST http://localhost:8000/recommend"
$mlResponse = Invoke-RestMethod -Uri 'http://localhost:8000/recommend' -Method POST -Body $mlJson -ContentType 'application/json'
$mlResponse | ConvertTo-Json -Depth 30 | Set-Content ml_demo_output.json

Write-Host "`n[STEP 6] Full Model Output (saved to ml_demo_output.json):"
Get-Content ml_demo_output.json

Write-Host "`n================ END OF FULL FLOW DEMO ================"
