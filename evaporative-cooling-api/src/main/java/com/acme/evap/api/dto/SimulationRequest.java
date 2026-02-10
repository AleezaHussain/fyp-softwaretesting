package com.acme.evap.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

/**
 * Complete simulation configuration from frontend
 */
public class SimulationRequest {
    
    @Valid
    @NotNull
    public SimulationConfig simulation;
    
    @Valid
    @NotNull
    public ITLoadConfig it_load;
    
    @Valid
    @NotNull
    public CoolingSystemConfig cooling_system;
    
    @Valid
    @NotNull
    public RatesConfig rates;
    
    @Valid
    @NotNull
    public EmissionsConfig emissions;
    
    @Valid
    @NotNull
    public ConstraintsConfig constraints;
    
    public static class SimulationConfig {
        @Min(1)
        @Max(8760)
        public int time_horizon_hours = 8760;
        
        @Min(60)
        @Max(3600)
        public int time_step_seconds = 3600;
    }
    
    public static class ITLoadConfig {
        @DecimalMin("1.0")
        @DecimalMax("10000.0")
        public double total_it_power_kw;
        
        @Min(1)
        @Max(10000)
        public int servers;
        
        @Min(1)
        @Max(1000)
        public int racks;
        
        @NotBlank
        public String power_utilization_model = "linear"; // linear, nonlinear
    }
    
    public static class CoolingSystemConfig {
        @NotBlank
        public String type; // direct_evaporative, indirect_evaporative, hybrid
        
        @DecimalMin("100.0")
        @DecimalMax("50000.0")
        public double max_airflow_cfm;
        
        @DecimalMin("0.3")
        @DecimalMax("0.9")
        public double fan_efficiency;
        
        @DecimalMin("60.0")
        @DecimalMax("95.0")
        public double saturation_effectiveness;
        
        @DecimalMin("1.0")
        @DecimalMax("3.0")
        public double face_velocity_ms;
        
        @DecimalMin("80.0")
        @DecimalMax("100.0")
        public double wetting_efficiency;
        
        @NotBlank
        public String media_type = "cellulose"; // cellulose, polymer
        
        public boolean has_dx_backup = false;
        
        @DecimalMin("2.0")
        @DecimalMax("5.0")
        public double dx_cop = 3.5;
        
        // Water system
        @NotBlank
        public String water_source = "municipal"; // municipal, tank
        
        @DecimalMin("3.0")
        @DecimalMax("12.0")
        public double cycles_of_concentration = 5.0;
        
        // Tank parameters (if water_source = tank)
        @DecimalMin("500.0")
        @DecimalMax("50000.0")
        public double tank_volume_l = 5000.0;
        
        @DecimalMin("0.0")
        @DecimalMax("50000.0")
        public double refill_rate_l_per_day = 0.0;
        
        @DecimalMin("5.0")
        @DecimalMax("30.0")
        public double low_water_cutoff_percent = 10.0;
    }
    
    public static class RatesConfig {
        @DecimalMin("0.01")
        @DecimalMax("1.0")
        public double electricity_usd_per_kwh;
        
        @DecimalMin("0.0001")
        @DecimalMax("0.01")
        public double water_usd_per_liter;
    }
    
    public static class EmissionsConfig {
        @DecimalMin("0.1")
        @DecimalMax("1.0")
        public double grid_kgco2_per_kwh;
    }
    
    public static class ConstraintsConfig {
        @DecimalMin("18.0")
        @DecimalMax("35.0")
        public double max_inlet_temp_c = 27.0;
        
        @DecimalMin("0.0")
        @DecimalMax("100.0")
        public double max_relative_humidity = 80.0;
        
        @DecimalMin("1.0")
        @DecimalMax("2.0")
        public double max_pue = 1.5;
    }
}