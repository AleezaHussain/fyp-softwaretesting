package com.acme.chilledwatersystem.api.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public class EconomicEnvironmentalDTO {
    @NotNull
    private Double baseElectricityRate;
    
    @NotNull
    private Boolean touEnabled;
    
    private Double peakMultiplier;
    private Double offPeakMultiplier;
    
    private List<HourlyRateDTO> priceProfile;
    
    @NotNull
    private Double carbonIntensity;
    
    @NotNull
    private String refrigerantType;
    
    private String refrigerantLabel;
    
    @NotNull
    private Integer refrigerantGWP;
    
    @NotNull
    private Boolean useIPCCPathway;
    
    @NotNull
    private Double carbonTax2030;
    
    private String carbonTaxLevel;
    private String gate4Status;


    public Double getBaseElectricityRate() {
        return baseElectricityRate;
    }

    public void setBaseElectricityRate(Double baseElectricityRate) {
        this.baseElectricityRate = baseElectricityRate;
    }

    public Boolean getTouEnabled() {
        return touEnabled;
    }

    public void setTouEnabled(Boolean touEnabled) {
        this.touEnabled = touEnabled;
    }

    public Double getPeakMultiplier() {
        return peakMultiplier;
    }

    public void setPeakMultiplier(Double peakMultiplier) {
        this.peakMultiplier = peakMultiplier;
    }

    public Double getOffPeakMultiplier() {
        return offPeakMultiplier;
    }

    public void setOffPeakMultiplier(Double offPeakMultiplier) {
        this.offPeakMultiplier = offPeakMultiplier;
    }

    public List<HourlyRateDTO> getPriceProfile() {
        return priceProfile;
    }

    public void setPriceProfile(List<HourlyRateDTO> priceProfile) {
        this.priceProfile = priceProfile;
    }

    public Double getCarbonIntensity() {
        return carbonIntensity;
    }

    public void setCarbonIntensity(Double carbonIntensity) {
        this.carbonIntensity = carbonIntensity;
    }

    public String getRefrigerantType() {
        return refrigerantType;
    }

    public void setRefrigerantType(String refrigerantType) {
        this.refrigerantType = refrigerantType;
    }

    public String getRefrigerantLabel() {
        return refrigerantLabel;
    }

    public void setRefrigerantLabel(String refrigerantLabel) {
        this.refrigerantLabel = refrigerantLabel;
    }

    public Integer getRefrigerantGWP() {
        return refrigerantGWP;
    }

    public void setRefrigerantGWP(Integer refrigerantGWP) {
        this.refrigerantGWP = refrigerantGWP;
    }

    public Boolean getUseIPCCPathway() {
        return useIPCCPathway;
    }

    public void setUseIPCCPathway(Boolean useIPCCPathway) {
        this.useIPCCPathway = useIPCCPathway;
    }

    public Double getCarbonTax2030() {
        return carbonTax2030;
    }

    public void setCarbonTax2030(Double carbonTax2030) {
        this.carbonTax2030 = carbonTax2030;
    }

    public String getCarbonTaxLevel() {
        return carbonTaxLevel;
    }

    public void setCarbonTaxLevel(String carbonTaxLevel) {
        this.carbonTaxLevel = carbonTaxLevel;
    }

    public String getGate4Status() {
        return gate4Status;
    }

    public void setGate4Status(String gate4Status) {
        this.gate4Status = gate4Status;
    }

}