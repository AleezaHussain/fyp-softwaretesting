package com.acme.chilledwatersystem.api.dto;


import java.util.List;

public class SimulationResults {
    private AnnualResults annual;
    private PerformanceMetrics metrics;
    private Economics economics;
    private Phase4Gates phase4Gates;
    private List<HourlyResultDTO> hourlyResults;


    public AnnualResults getAnnual() {
        return annual;
    }

    public void setAnnual(AnnualResults annual) {
        this.annual = annual;
    }

    public PerformanceMetrics getMetrics() {
        return metrics;
    }

    public void setMetrics(PerformanceMetrics metrics) {
        this.metrics = metrics;
    }

    public Economics getEconomics() {
        return economics;
    }

    public void setEconomics(Economics economics) {
        this.economics = economics;
    }

    public Phase4Gates getPhase4Gates() {
        return phase4Gates;
    }

    public void setPhase4Gates(Phase4Gates phase4Gates) {
        this.phase4Gates = phase4Gates;
    }

    public List<HourlyResultDTO> getHourlyResults() {
        return hourlyResults;
    }

    public void setHourlyResults(List<HourlyResultDTO> hourlyResults) {
        this.hourlyResults = hourlyResults;
    }

}