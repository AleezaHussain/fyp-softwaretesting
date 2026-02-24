package com.acme.chilledwatersystem.api.dto;

import jakarta.validation.constraints.NotNull;

public class WaterStressDTO {
    @NotNull
    private String waterStressLevel;
    
    private String waterStressLabel;
    
    @NotNull
    private Double wueThreshold;
    
    private String waterRiskLevel;


    public String getWaterStressLevel() {
        return waterStressLevel;
    }

    public void setWaterStressLevel(String waterStressLevel) {
        this.waterStressLevel = waterStressLevel;
    }

    public String getWaterStressLabel() {
        return waterStressLabel;
    }

    public void setWaterStressLabel(String waterStressLabel) {
        this.waterStressLabel = waterStressLabel;
    }

    public Double getWueThreshold() {
        return wueThreshold;
    }

    public void setWueThreshold(Double wueThreshold) {
        this.wueThreshold = wueThreshold;
    }

    public String getWaterRiskLevel() {
        return waterRiskLevel;
    }

    public void setWaterRiskLevel(String waterRiskLevel) {
        this.waterRiskLevel = waterRiskLevel;
    }

}