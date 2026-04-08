$ErrorActionPreference = 'Stop'

# Build evaporative config JSON file
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
$cfgPath = 'evap_config_8760.json'
($evapConfig | ConvertTo-Json -Depth 20) | Set-Content $cfgPath

$cfgRaw = Get-Content $cfgPath -Raw
$evapRaw = & curl.exe -s -X POST "http://localhost:8082/api/simulations/evaporative-cooling" -F "weatherFile=@year_weather_8760.csv" --form-string "config=$cfgRaw"
$evapResp = $evapRaw | ConvertFrom-Json
$evapResp | ConvertTo-Json -Depth 20 | Set-Content evap_live_8760_output.json

if ($evapResp.status -eq 'error') {
  Write-Host 'Evaporative API returned error:'
  Write-Host $evapResp.message
  exit 1
}

# Read live outputs from all APIs
$air = Get-Content air_live_8760_output.json -Raw | ConvertFrom-Json
$ch = Get-Content chilled_live_8760_output.json -Raw | ConvertFrom-Json

$airEnergy = [double]$air.summary.totalEnergy_kWh
$airWater = [double]$air.summary.waterUsage_liters
$airCost = [double]$air.summary.annualOpExUSD
$airEmis = [double]$air.summary.totalCarbonEmissions_kg

$chEnergy = [double]$ch.results.annual.energyConsumption_kWh
$chWater = [double]$ch.results.annual.waterUsage_L
$chCost = [double]$ch.results.annual.cost_USD
$chEmis = [double]$ch.results.annual.carbonEmissions_kg

$evEnergy = [double]$evapResp.results.energy.electricity_kwh_total
$evWater = [double]$evapResp.results.water.water_liters_total
$evCost = [double]$evapResp.results.cost.total_energy_cost_usd
$evEmis = [double]$evapResp.results.emissions.co2_kg_total

# Build hourly arrays from AIR live output for ML scenario
$tempSeries = @($air.hourlyResults | ForEach-Object { [double]$_.outdoorTempC })
$rhSeries = @($air.hourlyResults | ForEach-Object { [double]$_.outdoorRH })
$itSeries = @($air.hourlyResults | ForEach-Object { [double]$_.itLoad_kW })

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

Write-Host "AUTHENTIC LIVE METRICS:"
Write-Host ("Air: energy=" + [Math]::Round($airEnergy,2) + ", water=" + [Math]::Round($airWater,2) + ", cost=" + [Math]::Round($airCost,2) + ", emissions=" + [Math]::Round($airEmis,2))
Write-Host ("Evap: energy=" + [Math]::Round($evEnergy,2) + ", water=" + [Math]::Round($evWater,2) + ", cost=" + [Math]::Round($evCost,2) + ", emissions=" + [Math]::Round($evEmis,2))
Write-Host ("Chilled: energy=" + [Math]::Round($chEnergy,2) + ", water=" + [Math]::Round($chWater,2) + ", cost=" + [Math]::Round($chCost,2) + ", emissions=" + [Math]::Round($chEmis,2))
Write-Host "Saved: ml_authentic_8760_output.json"
