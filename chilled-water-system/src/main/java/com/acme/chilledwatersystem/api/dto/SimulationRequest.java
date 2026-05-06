package com.acme.chilledwatersystem.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

/**
 * Main request DTO for chilled water cooling simulation
 */
public class SimulationRequest {
    
    @NotNull(message = "Weather data is required")
    @Valid
    private WeatherDataDTO weatherData;
    
    @NotNull(message = "Climate scenario is required")
    @Valid
    private ClimateScenarioDTO climateScenario;
    
    @NotNull(message = "Site parameters are required")
    @Valid
    private SiteParametersDTO siteParameters;
    
    @Valid
    private SimulationConfig simulation;
    
    @NotNull(message = "IT infrastructure is required")
    @Valid
    private ITInfrastructureDTO itInfrastructure;
    
    @NotNull(message = "Water stress is required")
    @Valid
    private WaterStressDTO waterStress;
    
    @NotNull(message = "Mechanical specs are required")
    @Valid
    private MechanicalSpecsDTO mechanicalSpecs;
    
    @NotNull(message = "Economic environmental data is required")
    @Valid
    private EconomicEnvironmentalDTO economicEnvironmental;

    /**
     * Simulation configuration (duration, time step, etc.)
     */
    public static class SimulationConfig {
        public int time_horizon_hours = 8760;
        public int time_step_seconds = 3600;

        public int getTime_horizon_hours() {
            return time_horizon_hours;
        }

        public void setTime_horizon_hours(int time_horizon_hours) {
            this.time_horizon_hours = time_horizon_hours;
        }

        public int getTime_step_seconds() {
            return time_step_seconds;
        }

        public void setTime_step_seconds(int time_step_seconds) {
            this.time_step_seconds = time_step_seconds;
        }
    }

    public WeatherDataDTO getWeatherData() {
        return weatherData;
    }

    public void setWeatherData(WeatherDataDTO weatherData) {
        this.weatherData = weatherData;
    }

    public ClimateScenarioDTO getClimateScenario() {
        return climateScenario;
    }

    public void setClimateScenario(ClimateScenarioDTO climateScenario) {
        this.climateScenario = climateScenario;
    }

    public SiteParametersDTO getSiteParameters() {
        return siteParameters;
    }

    public void setSiteParameters(SiteParametersDTO siteParameters) {
        this.siteParameters = siteParameters;
    }

    public SimulationConfig getSimulation() {
        return simulation;
    }

    public void setSimulation(SimulationConfig simulation) {
        this.simulation = simulation;
    }

    public ITInfrastructureDTO getItInfrastructure() {
        return itInfrastructure;
    }

    public void setItInfrastructure(ITInfrastructureDTO itInfrastructure) {
        this.itInfrastructure = itInfrastructure;
    }

    public WaterStressDTO getWaterStress() {
        return waterStress;
    }

    public void setWaterStress(WaterStressDTO waterStress) {
        this.waterStress = waterStress;
    }

    public MechanicalSpecsDTO getMechanicalSpecs() {
        return mechanicalSpecs;
    }

    public void setMechanicalSpecs(MechanicalSpecsDTO mechanicalSpecs) {
        this.mechanicalSpecs = mechanicalSpecs;
    }

    public EconomicEnvironmentalDTO getEconomicEnvironmental() {
        return economicEnvironmental;
    }

    public void setEconomicEnvironmental(EconomicEnvironmentalDTO economicEnvironmental) {
        this.economicEnvironmental = economicEnvironmental;
    }

}