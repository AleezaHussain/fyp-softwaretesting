package com.acme.dccore;

import java.util.List;

/**
 * Policy for VM migration/throttling based on host temperature.
 */
public class ImmersionCoolingPolicy {
    public double migrationThreshold;
    public double throttleThreshold;

    public ImmersionCoolingPolicy(double migrationThreshold, double throttleThreshold) {
        this.migrationThreshold = migrationThreshold;
        this.throttleThreshold = throttleThreshold;
    }

    /**
     * Select VMs to migrate if host temp exceeds migration threshold.
     */
    public void checkMigration(double hostTemp, List<org.cloudsimplus.vms.Vm> vms) {
        if (hostTemp > migrationThreshold) {
            // Select and migrate VMs (stub)
        }
    }

    /**
     * Throttle VMs if host temp exceeds throttle threshold.
     */
    public void checkThrottling(double hostTemp, List<org.cloudsimplus.vms.Vm> vms) {
        if (hostTemp > throttleThreshold) {
            // Throttle VMs (stub)
        }
    }
}
