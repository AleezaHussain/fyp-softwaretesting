package com.acme.chilledwatersystem.api.dto;


public class PerformanceMetrics {
    private Double pue;
    private Double wue;
    private Double averageCOP;
    private Double peakCoolingLoad_kW;


    public Double getPue() {
        return pue;
    }

    public void setPue(Double pue) {
        this.pue = pue;
    }

    public Double getWue() {
        return wue;
    }

    public void setWue(Double wue) {
        this.wue = wue;
    }

    public Double getAverageCOP() {
        return averageCOP;
    }

    public void setAverageCOP(Double averageCOP) {
        this.averageCOP = averageCOP;
    }

    public Double getPeakCoolingLoad_kW() {
        return peakCoolingLoad_kW;
    }

    public void setPeakCoolingLoad_kW(Double peakCoolingLoad_kW) {
        this.peakCoolingLoad_kW = peakCoolingLoad_kW;
    }

}