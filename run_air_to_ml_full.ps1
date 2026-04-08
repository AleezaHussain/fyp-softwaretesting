$ErrorActionPreference = 'Stop'

Write-Host '================ AIR -> ML FULL PROCESS ================'

# 0) Health checks
Write-Host "`n[0] Health checks"
$airHealth = 'Air API reachable via /api/simulate endpoint'
$mlHealth = Invoke-RestMethod -Uri 'http://localhost:8000/health' -Method GET
Write-Host ("Air API health: " + $airHealth)
Write-Host ("ML API health: " + ($mlHealth | ConvertTo-Json -Compress))

# 1) Build Air simulation input (24-hour weather)
Write-Host "`n[1] Air simulation input"
$weather = @()
for ($h = 0; $h -lt 24; $h++) {
  $temp = 24 + 6 * [Math]::Sin((2 * [Math]::PI * $h) / 24)
  $rh = 60 - 10 * [Math]::Sin((2 * [Math]::PI * $h) / 24)
  $weather += @{ timestamp = "h$h"; temperature = [Math]::Round($temp,2); humidity = [Math]::Round($rh,2) }
}

$airInput = @{
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

$airInputJson = $airInput | ConvertTo-Json -Depth 10
Write-Host $airInputJson

# 2) Run Air simulation
Write-Host "`n[2] Calling Air simulation endpoint"
$airResp = Invoke-RestMethod -Uri 'http://localhost:8080/api/simulate' -Method POST -Body $airInputJson -ContentType 'application/json'

Write-Host "Air simulation summary:"
Write-Host ("  totalEnergy_kWh: " + [Math]::Round($airResp.summary.totalEnergy_kWh, 4))
Write-Host ("  averagePUE: " + [Math]::Round($airResp.summary.averagePUE, 4))
Write-Host ("  hourly rows: " + $airResp.hourlyResults.Count)

# 3) Extract hourly arrays for ML
Write-Host "`n[3] Extracting hourly arrays for ML"
$tempSeries = @($airResp.hourlyResults | ForEach-Object { [double]$_.outdoorTempC })
$rhSeries = @($airResp.hourlyResults | ForEach-Object { [double]$_.outdoorRH })
$itSeries = @($airResp.hourlyResults | ForEach-Object { [double]$_.itLoad_kW })

$avgTemp = ($tempSeries | Measure-Object -Average).Average
$avgRh = ($rhSeries | Measure-Object -Average).Average
$avgIt = ($itSeries | Measure-Object -Average).Average

Write-Host ("  tempC avg from Air hourly: " + [Math]::Round($avgTemp, 4))
Write-Host ("  rh avg from Air hourly: " + [Math]::Round($avgRh, 4))
Write-Host ("  itLoadKW avg from Air hourly: " + [Math]::Round($avgIt, 4))

# 4) Build ML input using Air hourly output + user costs
Write-Host "`n[4] Building ML request from simulation output"
$mlPayload = @{
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
  metrics_unit = 'annual'
}
$mlPayloadJson = $mlPayload | ConvertTo-Json -Depth 20
Write-Host $mlPayloadJson

# 5) Call ML recommender
Write-Host "`n[5] Calling ML /recommend"
$mlResp = Invoke-RestMethod -Uri 'http://localhost:8000/recommend' -Method POST -Body $mlPayloadJson -ContentType 'application/json'

Write-Host "`n[6] Full ML response"
$mlResp | ConvertTo-Json -Depth 20

Write-Host "`n[7] Final interpretation"
Write-Host ("Current technique: " + $mlResp.current_technique)
Write-Host ("Model recommendation: " + $mlResp.model_recommendation)
Write-Host ("Reason[0]: " + $mlResp.why_this_is_recommended[0])
Write-Host ("Reason[1]: " + $mlResp.why_this_is_recommended[1])
Write-Host '========================================================='
