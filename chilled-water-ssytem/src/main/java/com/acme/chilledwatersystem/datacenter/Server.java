package com.acme.chilledwatersystem.datacenter;

public class Server {
    private String id;
    private double ratedPowerKW; // IT power at 100% load
    private double currentLoad; // 0.0–1.0 fraction
    private double heatOutputKW;

    public Server(String id, double ratedPowerKW) {
        this.id = id;
        this.ratedPowerKW = ratedPowerKW;
    }

    public void setLoad(double fraction) {
        this.currentLoad = Math.max(0, Math.min(1, fraction));
        this.heatOutputKW = ratedPowerKW * currentLoad;
    }

    public double getHeatOutput() {
        return heatOutputKW;
    }

    public double getRatedPower() {
        return ratedPowerKW;
    }

    public double getLoad() {
        return currentLoad;
    }
}
