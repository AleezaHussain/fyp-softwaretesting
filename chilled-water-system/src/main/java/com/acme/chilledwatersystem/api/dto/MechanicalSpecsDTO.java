package com.acme.chilledwatersystem.api.dto;

import jakarta.validation.constraints.NotNull;

public class MechanicalSpecsDTO {
    @NotNull
    private String chillerType;
    
    private String chillerLabel;
    
    @NotNull
    private Double chillerRefCOP;
    
    private Double chillerRefCOPMin;
    private Double chillerRefCOPMax;
    
    @NotNull
    private Double supplyWaterTempC;
    
    private Boolean isInEfficientZone;
    
    @NotNull
    private Double foulingFactor;


    public String getChillerType() {
        return chillerType;
    }

    public void setChillerType(String chillerType) {
        this.chillerType = chillerType;
    }

    public String getChillerLabel() {
        return chillerLabel;
    }

    public void setChillerLabel(String chillerLabel) {
        this.chillerLabel = chillerLabel;
    }

    public Double getChillerRefCOP() {
        return chillerRefCOP;
    }

    public void setChillerRefCOP(Double chillerRefCOP) {
        this.chillerRefCOP = chillerRefCOP;
    }

    public Double getChillerRefCOPMin() {
        return chillerRefCOPMin;
    }

    public void setChillerRefCOPMin(Double chillerRefCOPMin) {
        this.chillerRefCOPMin = chillerRefCOPMin;
    }

    public Double getChillerRefCOPMax() {
        return chillerRefCOPMax;
    }

    public void setChillerRefCOPMax(Double chillerRefCOPMax) {
        this.chillerRefCOPMax = chillerRefCOPMax;
    }

    public Double getSupplyWaterTempC() {
        return supplyWaterTempC;
    }

    public void setSupplyWaterTempC(Double supplyWaterTempC) {
        this.supplyWaterTempC = supplyWaterTempC;
    }

    public Boolean getIsInEfficientZone() {
        return isInEfficientZone;
    }

    public void setIsInEfficientZone(Boolean isInEfficientZone) {
        this.isInEfficientZone = isInEfficientZone;
    }

    public Double getFoulingFactor() {
        return foulingFactor;
    }

    public void setFoulingFactor(Double foulingFactor) {
        this.foulingFactor = foulingFactor;
    }

}