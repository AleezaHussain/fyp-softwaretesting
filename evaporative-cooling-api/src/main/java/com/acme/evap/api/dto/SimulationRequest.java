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
    
    @Valid
    public FinancialEscalationConfig financial_escalation;
    
    @Valid
    public CarbonAccountingConfig carbon_accounting;
    
    @Valid
    public ScenarioConfig scenario;
    
    @Valid
    public RackGeometryConfig rack_geometry;
    
    @Valid
    public AirflowDistributionConfig airflow_distribution;
    
    @Valid
    public ThermalMassConfig thermal_mass;
    
    @Valid
    public EnclosureConfig enclosure;
    
    @Valid
    public InfiltrationConfig infiltration;
    
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
        
        public String workload_type = "traditional"; // traditional, ai_training, ai_inference, mixed_ai
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
    
    // ========================================================================
    // ADVANCED CONFIGURATION CLASSES
    // ========================================================================
    
    /**
     * Financial Escalation Configuration
     * Multi-year projections with inflation and carbon tax growth
     */
    public static class FinancialEscalationConfig {
        @DecimalMin("0.0")
        @DecimalMax("15.0")
        public double annual_electricity_inflation = 4.0; // % per year
        
        @DecimalMin("0.0")
        @DecimalMax("15.0")
        public double annual_water_inflation = 3.0; // % per year
        
        @DecimalMin("0.0")
        @DecimalMax("200.0")
        public double carbon_price = 50.0; // $ per ton CO2
        
        @DecimalMin("0.0")
        @DecimalMax("15.0")
        public double carbon_price_growth = 5.0; // % per year
    }
    
    /**
     * Carbon Accounting Configuration
     * Location-based vs Market-based emissions accounting
     */
    public static class CarbonAccountingConfig {
        @NotBlank
        public String emissions_accounting_method = "location_based"; // location_based, market_based
        
        @DecimalMin("0.0")
        @DecimalMax("100.0")
        public double renewable_energy_percentage = 0.0; // % of energy from renewables
    }
    
    /**
     * 2030 Scenario Configuration
     * Climate change and future scenario modeling
     */
    public static class ScenarioConfig {
        @NotBlank
        public String scenario_type = "baseline_2025"; // baseline_2025, moderate_growth_2030, ai_growth, energy_carbon_pressure
        
        @DecimalMin("-2.0")
        @DecimalMax("4.0")
        public double temperature_offset = 1.0; // °C offset for climate change
        
        @DecimalMin("-10.0")
        @DecimalMax("10.0")
        public double humidity_adjustment = 0.0; // % adjustment for humidity
    }
    
    /**
     * Rack Geometry Configuration
     * Physical rack dimensions and airflow patterns
     */
    public static class RackGeometryConfig {
        @Min(24)
        @Max(48)
        public int rack_height_u = 42; // Rack units (U)
        
        public boolean front_to_back_airflow = true; // Standard front-to-back cooling
    }
    
    /**
     * Airflow Distribution Configuration
     * Bypass and recirculation losses
     */
    public static class AirflowDistributionConfig {
        @NotBlank
        public String airflow_quality_preset = "typical"; // excellent, typical, poor, custom
        
        @DecimalMin("0.0")
        @DecimalMax("30.0")
        public double air_bypass_fraction = 10.0; // % of cold air bypassing servers
        
        @DecimalMin("0.0")
        @DecimalMax("25.0")
        public double hot_air_recirculation = 5.0; // % of hot air re-entering inlets
    }
    
    /**
     * Thermal Mass Configuration
     * Thermal capacitance for transient analysis
     */
    public static class ThermalMassConfig {
        @DecimalMin("5.0")
        @DecimalMax("50.0")
        public double rack_thermal_mass = 15.0; // kJ/K
        
        @DecimalMin("20.0")
        @DecimalMax("150.0")
        public double enclosure_thermal_mass = 30.0; // kJ/K
        
        public boolean manual_thermal_override = false; // Use manual values vs auto-calculated
    }
    
    /**
     * Enclosure Configuration
     * Building type and insulation properties
     */
    public static class EnclosureConfig {
        @NotBlank
        public String enclosure_type = "outdoor_container"; // outdoor_container, indoor_closet, prefab_micro_dc, custom
        
        @DecimalMin("20.0")
        @DecimalMax("150.0")
        public double enclosure_thermal_mass_value = 30.0; // kJ/K (auto-set based on type)
        
        @DecimalMin("0.05")
        @DecimalMax("1.0")
        public double enclosure_air_leakage = 0.5; // ACH (auto-set based on type)
        
        public String insulation_quality = "Low-Medium"; // Auto-set based on type
    }
    
    /**
     * Infiltration Configuration
     * Uncontrolled air exchange rates
     */
    public static class InfiltrationConfig {
        @NotBlank
        public String infiltration_level = "standard"; // sealed, standard, leaky, custom
        
        @DecimalMin("0.05")
        @DecimalMax("2.0")
        public double infiltration_ach = 0.25; // Air Changes per Hour
        
        public boolean enable_custom_infiltration = false; // Use custom ACH value
    }
}
