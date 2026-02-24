package com.acme.chilledwatersystem.api.dto;

import jakarta.validation.constraints.NotNull;

public class WeatherDataPointDTO {
    
    @NotNull
    private Integer hour;
    
    @NotNull
    private Double dry_bulb_c;
    
    @NotNull
    private Double wet_bulb_c;
    
    @NotNull
    private Double relative_humidity;
    
    @NotNull
    private Double atmospheric_pressure_pa;


    public Integer getHour() {
        return hour;
    }

    public void setHour(Integer hour) {
        this.hour = hour;
    }

    public Double getDry_bulb_c() {
        return dry_bulb_c;
    }

    public void setDry_bulb_c(Double dry_bulb_c) {
        this.dry_bulb_c = dry_bulb_c;
    }

    public Double getWet_bulb_c() {
        return wet_bulb_c;
    }

    public void setWet_bulb_c(Double wet_bulb_c) {
        this.wet_bulb_c = wet_bulb_c;
    }

    public Double getRelative_humidity() {
        return relative_humidity;
    }

    public void setRelative_humidity(Double relative_humidity) {
        this.relative_humidity = relative_humidity;
    }

    public Double getAtmospheric_pressure_pa() {
        return atmospheric_pressure_pa;
    }

    public void setAtmospheric_pressure_pa(Double atmospheric_pressure_pa) {
        this.atmospheric_pressure_pa = atmospheric_pressure_pa;
    }

}