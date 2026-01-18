package com.acme.chilledwatersystem.datacenter;

public class EnvironmentSensors {
    private double tempInlet;
    private double tempOutlet;
    private double humidity;

    public void update(double inlet, double outlet, double rh) {
        this.tempInlet = inlet;
        this.tempOutlet = outlet;
        this.humidity = rh;
    }

    public double getInletTemp() {
        return tempInlet;
    }

    public double getOutletTemp() {
        return tempOutlet;
    }

    public double getHumidity() {
        return humidity;
    }
}
