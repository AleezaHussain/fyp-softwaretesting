package com.acme.chilledwatersystem.api.dto;

import jakarta.validation.constraints.NotNull;

public class ClimateScenarioDTO {
    @NotNull
    private Double warmingDelta;
    
    @NotNull
    private Double temperatureOffset;


    public Double getWarmingDelta() {
        return warmingDelta;
    }

    public void setWarmingDelta(Double warmingDelta) {
        this.warmingDelta = warmingDelta;
    }

    public Double getTemperatureOffset() {
        return temperatureOffset;
    }

    public void setTemperatureOffset(Double temperatureOffset) {
        this.temperatureOffset = temperatureOffset;
    }

}