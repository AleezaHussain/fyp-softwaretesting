// Simple test to verify API connection and frontend value usage
const fs = require('fs');

// Test configuration with custom values
const testConfig = {
  simulation: {
    time_horizon_hours: 24,
    time_step_seconds: 3600
  },
  it_load: {
    total_it_power_kw: 75.5,  // Custom value
    servers: 75,              // Custom value
    racks: 8,                 // Custom value
    power_utilization_model: "nonlinear"  // Custom value
  },
  cooling_system: {
    type: "indirect_evaporative",  // Custom value
    max_airflow_cfm: 12000.0,      // Custom value
    fan_efficiency: 0.85,          // Custom value (85%)
    saturation_effectiveness: 92.0, // Custom value
    face_velocity_ms: 2.8,         // Custom value
    wetting_efficiency: 96.0,      // Custom value
    media_type: "polymer",         // Custom value
    has_dx_backup: true,
    dx_cop: 4.2,                   // Custom value
    water_source: "tank",          // Custom value
    cycles_of_concentration: 7.0,  // Custom value
    tank_volume_l: 8000.0,         // Custom value
    refill_rate_l_per_day: 500.0,  // Custom value
    low_water_cutoff_percent: 12.0 // Custom value
  },
  rates: {
    electricity_usd_per_kwh: 0.18,  // Custom value
    water_usd_per_liter: 0.0025     // Custom value
  },
  emissions: {
    grid_kgco2_per_kwh: 0.7         // Custom value
  },
  constraints: {
    max_inlet_temp_c: 27.0,
    max_relative_humidity: 80.0,
    max_pue: 1.5
  }
};

// Create test weather data
const weatherData = [];
weatherData.push('Hour,DryBulbTemp_C,RelativeHumidity_%,Pressure_kPa,WindSpeed_m/s');
for (let hour = 1; hour <= 24; hour++) {
  const temp = 25 + 10 * Math.sin((hour - 6) * Math.PI / 12);
  const humidity = 80 - temp;
  weatherData.push(`${hour},${temp.toFixed(1)},${Math.max(20, humidity).toFixed(1)},101.3,2.5`);
}

fs.writeFileSync('test_weather_24h.csv', weatherData.join('\n'));

console.log('✅ Test files created!');
console.log('📋 Test Configuration:');
console.log('  IT Load:', testConfig.it_load.total_it_power_kw, 'kW');
console.log('  Servers:', testConfig.it_load.servers);
console.log('  Cooling Type:', testConfig.cooling_system.type);
console.log('  Max Airflow:', testConfig.cooling_system.max_airflow_cfm, 'CFM');
console.log('  Fan Efficiency:', (testConfig.cooling_system.fan_efficiency * 100), '%');
console.log('  Saturation Effectiveness:', testConfig.cooling_system.saturation_effectiveness, '%');
console.log('  Electricity Rate: $', testConfig.rates.electricity_usd_per_kwh, '/kWh');
console.log('  Power Model:', testConfig.it_load.power_utilization_model);
console.log('');
console.log('🧪 To test the API manually:');
console.log('1. Use the frontend form with these values');
console.log('2. Upload the test_weather_24h.csv file');
console.log('3. Check browser console and server logs for configuration values');
console.log('4. Verify the backend uses these custom values instead of defaults');

// Save config for manual testing
fs.writeFileSync('test_config_custom.json', JSON.stringify(testConfig, null, 2));
console.log('📁 Saved test_config_custom.json for reference');