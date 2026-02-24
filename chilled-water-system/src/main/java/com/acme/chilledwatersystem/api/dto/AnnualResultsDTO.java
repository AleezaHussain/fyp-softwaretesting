package com.acme.chilledwatersystem.api.dto;


public class AnnualResultsDTO {
    
    private Double energyConsumption_kWh;
    private Double coolingLoad_kWh;
    private Double waterUsage_L;
    private Double cost_USD;
    private Double carbonEmissions_kg;


    public Double getEnergyConsumption_kWh() {
        return energyConsumption_kWh;
    }

    public void setEnergyConsumption_kWh(Double energyConsumption_kWh) {
        this.energyConsumption_kWh = energyConsumption_kWh;
    }

    public Double getCoolingLoad_kWh() {
        return coolingLoad_kWh;
    }

    public void setCoolingLoad_kWh(Double coolingLoad_kWh) {
        this.coolingLoad_kWh = coolingLoad_kWh;
    }

    public Double getWaterUsage_L() {
        return waterUsage_L;
    }

    public void setWaterUsage_L(Double waterUsage_L) {
        this.waterUsage_L = waterUsage_L;
    }

    public Double getCost_USD() {
        return cost_USD;
    }

    public void setCost_USD(Double cost_USD) {
        this.cost_USD = cost_USD;
    }

    public Double getCarbonEmissions_kg() {
        return carbonEmissions_kg;
    }

    public void setCarbonEmissions_kg(Double carbonEmissions_kg) {
        this.carbonEmissions_kg = carbonEmissions_kg;
    }

}