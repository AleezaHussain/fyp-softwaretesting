package com.acme.chilledwatersystem.api.dto;

import jakarta.validation.constraints.NotNull;

public class SiteParametersDTO {
    @NotNull
    private Double altitude;
    private Double altitudeDisplay;
    private String altitudeUnit;


    public Double getAltitude() {
        return altitude;
    }

    public void setAltitude(Double altitude) {
        this.altitude = altitude;
    }

    public Double getAltitudeDisplay() {
        return altitudeDisplay;
    }

    public void setAltitudeDisplay(Double altitudeDisplay) {
        this.altitudeDisplay = altitudeDisplay;
    }

    public String getAltitudeUnit() {
        return altitudeUnit;
    }

    public void setAltitudeUnit(String altitudeUnit) {
        this.altitudeUnit = altitudeUnit;
    }

}