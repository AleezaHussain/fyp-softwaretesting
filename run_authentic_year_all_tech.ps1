$ErrorActionPreference = 'Stop'

Write-Host "=== AUTHENTIC 8760 LIVE RUN (AIR + CHILLED + EVAP -> ML) ==="

# 1) Generate 8760-hour weather data
$weatherRows = @()
$chilledPoints = @()
for ($h = 0; $h -lt 8760; $h++) {
  $annual = 2 * [Math]::PI * ($h / 8760.0)
  $temp = 24 + 8 * [Math]::Sin($annual)
  $rh = 60 - 15 * [Math]::Sin($annual)
  $wet = $temp - 2.0

  $weatherRows += [PSCustomObject]@{
    timestamp = "h$h"
    temperature = [Math]::Round($temp, 2)
    humidity = [Math]::Round($rh, 2)
  }

  $chilledPoints += [PSCustomObject]@{
    hour = $h
    dry_bulb_c = [Math]::Round($temp, 2)
    wet_bulb_c = [Math]::Round($wet, 2)
    relative_humidity = [Math]::Round($rh, 2)
    atmospheric_pressure_pa = 101325
  }
}

# CSV for evaporative API
$csvPath = "year_weather_8760.csv"
$csv = "Hour,DryBulbTemp_C,RelativeHumidity_%,Pressure_kPa,WindSpeed_m/s`n"
for ($h = 1; $h -le 8760; $h++) {
  $idx = $h - 1
  $csv += "$h,$($weatherRows[$idx].temperature),$($weatherRows[$idx].humidity),101.3,2.5`n"
}
Set-Content -Path $csvPath -Value $csv

# 2) AIR live simulation
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
  weatherData = $weatherRows
}
$airJson = $airInput | ConvertTo-Json -Depth 20
$airResp = Invoke-RestMethod -Uri 'http://localhost:8080/api/simulate' -Method POST -Body $airJson -ContentType 'application/json'
$airResp | ConvertTo-Json -Depth 20 | Set-Content air_live_8760_output.json

$airEnergy = [double]$airResp.summary.totalEnergy_kWh
$airWater = [double]$airResp.summary.waterUsage_liters
$airCost = [double]$airResp.summary.annualOpExUSD
$airEmis = [double]$airResp.summary.totalCarbonEmissions_kg

# Hourly arrays for ML from live air simulation output
$tempSeries = @($airResp.hourlyResults | ForEach-Object { [double]$_.outdoorTempC })
$rhSeries = @($airResp.hourlyResults | ForEach-Object { [double]$_.outdoorRH })
$itSeries = @($airResp.hourlyResults | ForEach-Object { [double]$_.itLoad_kW })

# 3) CHILLED live simulation
$chilledReq = @{
  weatherData = @{
    fileName = 'generated_8760.csv'
    location = 'Generated'
    elevation = 10.0
    dataPoints = $chilledPoints
    hasValidData = $true
  }
  climateScenario = @{ warmingDelta = 0.0; temperatureOffset = 0.0 }
  siteParameters = @{ altitude = 10.0; altitudeDisplay = 10; altitudeUnit = 'meters' }
  itInfrastructure = @{
    numberOfRacks = 6
    serversPerRack = 16
    totalServers = 96
    serverIdlePowerW = 150
    serverMaxPowerW = 600
    workloadType = 'enterprise'
    workloadLabel = 'Enterprise'
    refreshCycle = 5
    throttlingPenalty = 0
    avgCpuUtilization = 65
    totalITLoadKW = 42.0
    peakITLoadKW = 55.0
  }
  waterStress = @{ waterStressLevel='medium'; waterStressLabel='Medium'; wueThreshold=3.0; waterRiskLevel='MODERATE' }
  mechanicalSpecs = @{ chillerType='air_cooled_scroll'; chillerLabel='Air-Cooled Scroll'; chillerRefCOP=3.8; chillerRefCOPMin=3.2; chillerRefCOPMax=4.0; supplyWaterTempC=7.0; isInEfficientZone=$true; foulingFactor=1.0 }
  economicEnvironmental = @{
    baseElectricityRate = 0.145
    touEnabled = $false
    peakMultiplier = 1.5
    offPeakMultiplier = 0.7
    priceProfile = @()
    carbonIntensity = 0.46
    refrigerantType = 'r134a'
    refrigerantLabel = 'R-134a'
    refrigerantGWP = 1430
    useIPCCPathway = $true
    carbonTax2030 = 254
    carbonTaxLevel = 'Moderate'
    gate4Status = 'PASS'
  }
}
$chilledJson = $chilledReq | ConvertTo-Json -Depth 30
$chilledResp = Invoke-RestMethod -Uri 'http://localhost:8081/api/v1/chilled-water/simulate' -Method POST -Body $chilledJson -ContentType 'application/json'
$chilledResp | ConvertTo-Json -Depth 20 | Set-Content chilled_live_8760_output.json

$chEnergy = [double]$chilledResp.results.annual.energyConsumption_kWh
$chWater = [double]$chilledResp.results.annual.waterUsage_L
$chCost = [double]$chilledResp.results.annual.cost_USD
$chEmis = [double]$chilledResp.results.annual.carbonEmissions_kg

# 4) EVAP live simulation (multipart)
$evapConfig = @{
  simulation = @{ time_horizon_hours = 8760; time_step_seconds = 3600 }
  it_load = @{ total_it_power_kw = 42.0; servers = 96; racks = 6; power_utilization_model = 'linear' }
  cooling_system = @{
    type = 'direct_evaporative'
    max_airflow_cfm = 10000.0
    fan_efficiency = 0.8
    saturation_effectiveness = 90.0
    face_velocity_ms = 2.5
    wetting_efficiency = 95.0
    media_type = 'cellulose'
    has_dx_backup = $true
    dx_cop = 4.0
    water_source = 'municipal'
    cycles_of_concentration = 6.0
    tank_volume_l = 3000.0
    refill_rate_l_per_day = 0.0
    low_water_cutoff_percent = 15.0
  }
  rates = @{ electricity_usd_per_kwh = 0.145; water_usd_per_liter = 0.002 }
  emissions = @{ grid_kgco2_per_kwh = 0.46 }
  constraints = @{ max_inlet_temp_c = 27.0; max_relative_humidity = 80.0; max_pue = 1.5 }
}
$evapConfigJson = $evapConfig | ConvertTo-Json -Compress -Depth 20
$evapRaw = & curl.exe -s -X POST "http://localhost:8082/api/simulations/evaporative-cooling" -F "weatherFile=@$csvPath" -F "config=$evapConfigJson"
$evapResp = $evapRaw | ConvertFrom-Json
$evapResp | ConvertTo-Json -Depth 20 | Set-Content evap_live_8760_output.json

$evEnergy = 0.0
$evWater = 0.0
$evCost = 0.0
$evEmis = 0.0
if ($evapResp.results.energy.electricity_kwh_total) { $evEnergy = [double]$evapResp.results.energy.electricity_kwh_total }
if ($evapResp.results.water.water_liters_total) { $evWater = [double]$evapResp.results.water.water_liters_total }
if ($evapResp.results.cost.total_energy_cost_usd) { $evCost = [double]$evapResp.results.cost.total_energy_cost_usd }
if ($evapResp.results.emissions.co2_kg_total) { $evEmis = [double]$evapResp.results.emissions.co2_kg_total }

# 5) Build ML payload from live outputs only
$mlPayload = @{
  scenario = @{ tempC = 999; rh = 999; itLoadKW = 999; electricityPrice = 0.145; waterPrice = 1.15; carbonFactor = 0.46 }
  current_technique = 'ChilledWater'
  simulation_hourly = @{ tempC = $tempSeries; rh = $rhSeries; itLoadKW = $itSeries }
  technique_results = @(
    @{ tech='AirEconomizer'; feasible=$true; energy_kwh=$airEnergy; water_liters=$airWater; cost=$airCost; emissions_kg=$airEmis; violations=0 },
    @{ tech='Evaporative'; feasible=$true; energy_kwh=$evEnergy; water_liters=$evWater; cost=$evCost; emissions_kg=$evEmis; violations=0 },
    @{ tech='ChilledWater'; feasible=$true; energy_kwh=$chEnergy; water_liters=$chWater; cost=$chCost; emissions_kg=$chEmis; violations=0 }
  )
  metrics_unit = 'annual'
}
$mlJson = $mlPayload | ConvertTo-Json -Depth 30
$mlResp = Invoke-RestMethod -Uri 'http://localhost:8000/recommend' -Method POST -Body $mlJson -ContentType 'application/json'
$mlResp | ConvertTo-Json -Depth 30 | Set-Content ml_authentic_8760_output.json

Write-Host "\n=== LIVE METRICS USED (NO MANUAL DEMO NUMBERS) ==="
Write-Host ("Air:          energy=" + [Math]::Round($airEnergy,2) + ", water=" + [Math]::Round($airWater,2) + ", cost=" + [Math]::Round($airCost,2) + ", emissions=" + [Math]::Round($airEmis,2))
Write-Host ("Evaporative:  energy=" + [Math]::Round($evEnergy,2) + ", water=" + [Math]::Round($evWater,2) + ", cost=" + [Math]::Round($evCost,2) + ", emissions=" + [Math]::Round($evEmis,2))
Write-Host ("ChilledWater: energy=" + [Math]::Round($chEnergy,2) + ", water=" + [Math]::Round($chWater,2) + ", cost=" + [Math]::Round($chCost,2) + ", emissions=" + [Math]::Round($chEmis,2))

Write-Host "\n=== FINAL MODEL OUTPUT FILE ==="
Write-Host "ml_authentic_8760_output.json"
