package com.acme.chilledwatersystem.api.dto;

import jakarta.validation.constraints.NotNull;

public class ITInfrastructureDTO {
    @NotNull
    private Integer numberOfRacks;
    
    @NotNull
    private Integer serversPerRack;
    
    @NotNull
    private Integer totalServers;
    
    @NotNull
    private Double serverIdlePowerW;
    
    @NotNull
    private Double serverMaxPowerW;
    
    @NotNull
    private String workloadType;
    
    private String workloadLabel;
    
    @NotNull
    private Integer refreshCycle;
    
    @NotNull
    private Integer throttlingPenalty;
    
    @NotNull
    private Double avgCpuUtilization;
    
    @NotNull
    private Double totalITLoadKW;
    
    @NotNull
    private Double peakITLoadKW;


    public Integer getNumberOfRacks() {
        return numberOfRacks;
    }

    public void setNumberOfRacks(Integer numberOfRacks) {
        this.numberOfRacks = numberOfRacks;
    }

    public Integer getServersPerRack() {
        return serversPerRack;
    }

    public void setServersPerRack(Integer serversPerRack) {
        this.serversPerRack = serversPerRack;
    }

    public Integer getTotalServers() {
        return totalServers;
    }

    public void setTotalServers(Integer totalServers) {
        this.totalServers = totalServers;
    }

    public Double getServerIdlePowerW() {
        return serverIdlePowerW;
    }

    public void setServerIdlePowerW(Double serverIdlePowerW) {
        this.serverIdlePowerW = serverIdlePowerW;
    }

    public Double getServerMaxPowerW() {
        return serverMaxPowerW;
    }

    public void setServerMaxPowerW(Double serverMaxPowerW) {
        this.serverMaxPowerW = serverMaxPowerW;
    }

    public String getWorkloadType() {
        return workloadType;
    }

    public void setWorkloadType(String workloadType) {
        this.workloadType = workloadType;
    }

    public String getWorkloadLabel() {
        return workloadLabel;
    }

    public void setWorkloadLabel(String workloadLabel) {
        this.workloadLabel = workloadLabel;
    }

    public Integer getRefreshCycle() {
        return refreshCycle;
    }

    public void setRefreshCycle(Integer refreshCycle) {
        this.refreshCycle = refreshCycle;
    }

    public Integer getThrottlingPenalty() {
        return throttlingPenalty;
    }

    public void setThrottlingPenalty(Integer throttlingPenalty) {
        this.throttlingPenalty = throttlingPenalty;
    }

    public Double getAvgCpuUtilization() {
        return avgCpuUtilization;
    }

    public void setAvgCpuUtilization(Double avgCpuUtilization) {
        this.avgCpuUtilization = avgCpuUtilization;
    }

    public Double getTotalITLoadKW() {
        return totalITLoadKW;
    }

    public void setTotalITLoadKW(Double totalITLoadKW) {
        this.totalITLoadKW = totalITLoadKW;
    }

    public Double getPeakITLoadKW() {
        return peakITLoadKW;
    }

    public void setPeakITLoadKW(Double peakITLoadKW) {
        this.peakITLoadKW = peakITLoadKW;
    }

}