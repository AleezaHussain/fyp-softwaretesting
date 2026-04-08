package com.acme.evap.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.DecimalMax;

/**
 * CloudSim configuration for advanced IT load modeling
 */
public class CloudSimConfig {
    public boolean enable_ml_workload = false;
    @DecimalMin("0.1")
    @DecimalMax("10.0")
    public double compute_intensity_factor = 1.0;
    // Add more fields as needed for your use case
}
