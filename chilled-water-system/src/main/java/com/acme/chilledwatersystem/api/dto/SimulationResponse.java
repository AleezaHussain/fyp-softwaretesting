package com.acme.chilledwatersystem.api.dto;


public class SimulationResponse {
    private String status;
    private String simulationId;
    private Long executionTime;
    private SimulationResults results;


    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getSimulationId() {
        return simulationId;
    }

    public void setSimulationId(String simulationId) {
        this.simulationId = simulationId;
    }

    public Long getExecutionTime() {
        return executionTime;
    }

    public void setExecutionTime(Long executionTime) {
        this.executionTime = executionTime;
    }

    public SimulationResults getResults() {
        return results;
    }

    public void setResults(SimulationResults results) {
        this.results = results;
    }

}