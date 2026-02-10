package com.acme.evap.api.dto;

import java.util.List;

/**
 * Complete simulation results for frontend consumption
 */
public class SimulationResponse {
    
    public String status = "success"; // success, error
    public String message;
    public SimulationResults results;
    public CoolingAssessment cooling_assessment;
    
    public static class SimulationResults {
        public EnergyResults energy;
        public WaterResults water;
        public CostResults cost;
        public OpexResults opex;
        public EmissionsResults emissions;
        public PerformanceResults performance;
    }
    
    public static class EnergyResults {
        public double electricity_kwh_total;
        public double fan_kwh;
        public double dx_kwh;
        public double pump_kwh;
        public double it_kwh;
        public double auxiliary_kwh;
    }
    
    public static class WaterResults {
        public double water_liters_total;
        public double evaporation_liters;
        public double blowdown_liters;
        public double makeup_liters;
    }
    
    public static class CostResults {
        public double electricity_usd;
        public double water_usd;
        public double total_energy_cost_usd;
    }
    
    public static class OpexResults {
        public double opex_total_usd;
        public double opex_per_kwh_it;
        public double opex_per_server_annual;
    }
    
    public static class EmissionsResults {
        public double co2_kg_total;
        public double co2_kg_per_kwh_it;
        public double co2_kg_per_server_annual;
    }
    
    public static class PerformanceResults {
        public double pue_average;
        public double pue_max;
        public double wue_average; // L/kWh IT
        public double cue_average; // kg CO2/kWh IT
        public double availability_percent;
        public int total_simulation_hours;
        public int cooling_failure_hours;
    }
    
    public static class CoolingAssessment {
        public String status; // COOLING_SUFFICIENT, LOCAL_HOTSPOTS, CLIMATE_LIMITED, INSUFFICIENT_COOLING
        public double confidence;
        public AssessmentChecks checks;
        public KeyMetrics key_metrics;
        public List<String> engineering_notes;
        public List<String> recommendations;
        public HourlyFailures hourly_failures;
    }
    
    public static class AssessmentChecks {
        public boolean heat_balance;
        public boolean inlet_temperature_ok;
        public boolean humidity_ok;
        public boolean energy_efficiency_ok;
    }
    
    public static class KeyMetrics {
        public double max_inlet_temp_c;
        public double cooling_capacity_avg_kw;
        public double heat_load_avg_kw;
        public double pue_avg;
        public double max_humidity_percent;
        public double min_wetbulb_depression_c;
    }
    
    public static class HourlyFailures {
        public int temperature_violations;
        public int humidity_violations;
        public int capacity_violations;
        public List<Integer> critical_hours; // Hours where multiple failures occurred
    }
}