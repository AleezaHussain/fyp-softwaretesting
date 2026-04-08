package supabase.entities;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class SimulationResult {
    private Long id;
    private Long simulationId;
    private Long userId;
    private BigDecimal runtimeMinutes;
    private BigDecimal energyConsumedKwh;
    private BigDecimal coolingEfficiency;
    private BigDecimal temperatureStability;
    private BigDecimal costSavingPercent;
    private String recommendation;
    private String resultData; // JSON as String
    private LocalDateTime completedAt;
    private LocalDateTime createdAt;

    // Constructor
    public SimulationResult(Long simulationId, Long userId) {
        this.simulationId = simulationId;
        this.userId = userId;
        this.createdAt = LocalDateTime.now();
    }

    public SimulationResult(Long id, Long simulationId, Long userId, BigDecimal runtimeMinutes,
                           BigDecimal energyConsumedKwh, BigDecimal coolingEfficiency,
                           BigDecimal temperatureStability, BigDecimal costSavingPercent,
                           String recommendation, String resultData, LocalDateTime completedAt,
                           LocalDateTime createdAt) {
        this.id = id;
        this.simulationId = simulationId;
        this.userId = userId;
        this.runtimeMinutes = runtimeMinutes;
        this.energyConsumedKwh = energyConsumedKwh;
        this.coolingEfficiency = coolingEfficiency;
        this.temperatureStability = temperatureStability;
        this.costSavingPercent = costSavingPercent;
        this.recommendation = recommendation;
        this.resultData = resultData;
        this.completedAt = completedAt;
        this.createdAt = createdAt;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getSimulationId() {
        return simulationId;
    }

    public void setSimulationId(Long simulationId) {
        this.simulationId = simulationId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public BigDecimal getRuntimeMinutes() {
        return runtimeMinutes;
    }

    public void setRuntimeMinutes(BigDecimal runtimeMinutes) {
        this.runtimeMinutes = runtimeMinutes;
    }

    public BigDecimal getEnergyConsumedKwh() {
        return energyConsumedKwh;
    }

    public void setEnergyConsumedKwh(BigDecimal energyConsumedKwh) {
        this.energyConsumedKwh = energyConsumedKwh;
    }

    public BigDecimal getCoolingEfficiency() {
        return coolingEfficiency;
    }

    public void setCoolingEfficiency(BigDecimal coolingEfficiency) {
        this.coolingEfficiency = coolingEfficiency;
    }

    public BigDecimal getTemperatureStability() {
        return temperatureStability;
    }

    public void setTemperatureStability(BigDecimal temperatureStability) {
        this.temperatureStability = temperatureStability;
    }

    public BigDecimal getCostSavingPercent() {
        return costSavingPercent;
    }

    public void setCostSavingPercent(BigDecimal costSavingPercent) {
        this.costSavingPercent = costSavingPercent;
    }

    public String getRecommendation() {
        return recommendation;
    }

    public void setRecommendation(String recommendation) {
        this.recommendation = recommendation;
    }

    public String getResultData() {
        return resultData;
    }

    public void setResultData(String resultData) {
        this.resultData = resultData;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    @Override
    public String toString() {
        return "SimulationResult{" +
                "id=" + id +
                ", simulationId=" + simulationId +
                ", userId=" + userId +
                ", energyConsumedKwh=" + energyConsumedKwh +
                ", coolingEfficiency=" + coolingEfficiency +
                ", completedAt=" + completedAt +
                '}';
    }
}
