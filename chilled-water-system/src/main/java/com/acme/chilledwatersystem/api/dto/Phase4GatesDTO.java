package com.acme.chilledwatersystem.api.dto;


public class Phase4GatesDTO {
    
    private String thermalCompliance; // PASS, FAIL
    private String waterConstraint; // PASS, FAIL
    private String carbonLiability; // PASS, FAIL
    private String economicViability; // PASS, FAIL


    public String getThermalCompliance() {
        return thermalCompliance;
    }

    public void setThermalCompliance(String thermalCompliance) {
        this.thermalCompliance = thermalCompliance;
    }

    public String getWaterConstraint() {
        return waterConstraint;
    }

    public void setWaterConstraint(String waterConstraint) {
        this.waterConstraint = waterConstraint;
    }

    public String getCarbonLiability() {
        return carbonLiability;
    }

    public void setCarbonLiability(String carbonLiability) {
        this.carbonLiability = carbonLiability;
    }

    public String getEconomicViability() {
        return economicViability;
    }

    public void setEconomicViability(String economicViability) {
        this.economicViability = economicViability;
    }

}