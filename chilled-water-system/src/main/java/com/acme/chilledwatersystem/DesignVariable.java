package com.acme.chilledwatersystem;

/**
 * Phase 4 Part 4: Design Variable for Multi-Objective Optimization
 * 
 * Represents a single design parameter that can be varied during optimization.
 */
public class DesignVariable {
    
    private final String name;
    private final double minValue;
    private final double maxValue;
    private double currentValue;
    
    public DesignVariable(String name, double minValue, double maxValue, double initialValue) {
        this.name = name;
        this.minValue = minValue;
        this.maxValue = maxValue;
        this.currentValue = Math.max(minValue, Math.min(maxValue, initialValue));
    }
    
    public String getName() {
        return name;
    }
    
    public double getMinValue() {
        return minValue;
    }
    
    public double getMaxValue() {
        return maxValue;
    }
    
    public double getCurrentValue() {
        return currentValue;
    }
    
    public void setCurrentValue(double value) {
        this.currentValue = Math.max(minValue, Math.min(maxValue, value));
    }
    
    /**
     * Get normalized value (0.0 to 1.0)
     */
    public double getNormalizedValue() {
        return (currentValue - minValue) / (maxValue - minValue);
    }
    
    /**
     * Set value from normalized (0.0 to 1.0)
     */
    public void setNormalizedValue(double normalized) {
        currentValue = minValue + normalized * (maxValue - minValue);
    }
    
    @Override
    public String toString() {
        return String.format("%s: %.2f [%.2f - %.2f]", name, currentValue, minValue, maxValue);
    }
}
