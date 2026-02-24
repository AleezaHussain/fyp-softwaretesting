package com.acme.chilledwatersystem.api.dto;


public class HourlyResultDTO {
    private Integer hour;
    private Double ambientTemp_C;
    private Double itLoad_kW;
    private Double coolingLoad_kW;
    private Double chillerPower_kW;
    private Double cop;
    private Double waterUsage_L;
    private Double cost_USD;
    private Double carbonEmissions_kg;


    public Integer getHour() {
        return hour;
    }

    public void setHour(Integer hour) {
        this.hour = hour;
    }

    public Double getAmbientTemp_C() {
        return ambientTemp_C;
    }

    public void setAmbientTemp_C(Double ambientTemp_C) {
        this.ambientTemp_C = ambientTemp_C;
    }

    public Double getItLoad_kW() {
        return itLoad_kW;
    }

    public void setItLoad_kW(Double itLoad_kW) {
        this.itLoad_kW = itLoad_kW;
    }

    public Double getCoolingLoad_kW() {
        return coolingLoad_kW;
    }

    public void setCoolingLoad_kW(Double coolingLoad_kW) {
        this.coolingLoad_kW = coolingLoad_kW;
    }

    public Double getChillerPower_kW() {
        return chillerPower_kW;
    }

    public void setChillerPower_kW(Double chillerPower_kW) {
        this.chillerPower_kW = chillerPower_kW;
    }

    public Double getCop() {
        return cop;
    }

    public void setCop(Double cop) {
        this.cop = cop;
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