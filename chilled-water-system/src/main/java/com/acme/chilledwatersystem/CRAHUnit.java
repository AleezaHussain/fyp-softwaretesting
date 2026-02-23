package com.acme.chilledwatersystem;

public class CRAHUnit {
    private double designAirflow = 2.5; // m³/s per rack row
    private double designFanPower = 5; // kW

    public double getFanPower(double itLoadKW) {
        double fraction = Math.min(1.0, itLoadKW / 500.0);
        // enforce a minimum fan speed floor to reflect baseline ventilation and
        // electronics cooling
        fraction = Math.max(0.2, fraction);
        return designFanPower * Math.pow(fraction, 3);
    }
}
