package com.acme.chilledwatersystem.api.dto;


import java.util.List;

public class SimulationResultsDTO {
    
    private AnnualResultsDTO annual;
    private PerformanceMetricsDTO metrics;
    private Economics economics;
    private Phase4GatesDTO phase4Gates;
    private List<HourlyResultDTO> hourlyResults; // 8760 entries


    public AnnualResultsDTO getAnnual() {
        return annual;
    }

    public void setAnnual(AnnualResultsDTO annual) {
        this.annual = annual;
    }

    public PerformanceMetricsDTO getMetrics() {
        return metrics;
    }

    public void setMetrics(PerformanceMetricsDTO metrics) {
        this.metrics = metrics;
    }

    public Economics getEconomics() {
        return economics;
    }

    public void setEconomics(Economics economics) {
        this.economics = economics;
    }

    public Phase4GatesDTO getPhase4Gates() {
        return phase4Gates;
    }

    public void setPhase4Gates(Phase4GatesDTO phase4Gates) {
        this.phase4Gates = phase4Gates;
    }

    public List<HourlyResultDTO> getHourlyResults() {
        return hourlyResults;
    }

    public void setHourlyResults(List<HourlyResultDTO> hourlyResults) {
        this.hourlyResults = hourlyResults;
    }

}