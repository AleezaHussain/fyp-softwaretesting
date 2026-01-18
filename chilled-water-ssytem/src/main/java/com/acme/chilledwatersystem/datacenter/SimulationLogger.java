package com.acme.chilledwatersystem.datacenter;

/**
 * Small helper to emit CloudSim-like INFO lifecycle messages for the
 * chilled-water module. This intentionally mimics the simple log format
 * used by CloudSim/CloudSimPlus so outputs look familiar in console runs.
 */
public class SimulationLogger {

    private static String fmtTime(double t) {
        return String.format("%.2f", t);
    }

    public void info(String message) {
        System.out.println("INFO  " + message);
    }

    /**
     * Print a time-prefixed INFO line similar to CloudSimPlus runtime logs.
     * Example: "INFO 71.65: DatacenterBrokerSimple2: Requesting Vm 1 destruction."
     */
    public void infoWithTime(double time, String source, String message) {
        System.out.printf("INFO  %s: %s: %s%n", fmtTime(time), source, message);
    }
}
