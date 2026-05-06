package com.acme.chilledwatersystem.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public class WeatherDataDTO {
    
    @NotNull(message = "File name is required")
    private String fileName;
    
    @NotNull(message = "Location is required")
    private String location;
    
    @NotNull(message = "Elevation is required")
    private Double elevation;
    
    @NotEmpty(message = "Weather data points are required")
    @Size(min = 730, max = 8760, message = "Must have between 730 and 8760 hourly data points")
    @Valid
    private List<WeatherDataPointDTO> dataPoints;
    
    @NotNull(message = "hasValidData flag is required")
    private Boolean hasValidData;


    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public Double getElevation() {
        return elevation;
    }

    public void setElevation(Double elevation) {
        this.elevation = elevation;
    }

    public List<WeatherDataPointDTO> getDataPoints() {
        return dataPoints;
    }

    public void setDataPoints(List<WeatherDataPointDTO> dataPoints) {
        this.dataPoints = dataPoints;
    }

    public Boolean getHasValidData() {
        return hasValidData;
    }

    public void setHasValidData(Boolean hasValidData) {
        this.hasValidData = hasValidData;
    }

}