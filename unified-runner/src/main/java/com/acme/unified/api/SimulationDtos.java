package com.acme.unified.api;

import java.util.List;

public class SimulationDtos {

    public static class SimParams {
        public String climateLabel;
        public int days;
        public int scaleFactor;
        public int racks;
        public double itLoadPerRack;
        public double waterAvailability;
        public double windSpeed;
        public List<String> techniques;

        public SimParams() {
        }
    }

    public static class HourResult {
        public int hour;
        public String technique;
        public double itKW;
        public double coolingKW;
        public double ambientC;
        public double wetbulbC;
    }

    public static class SummaryRow {
        public String tech;
        public double energyKWh;
        public double costUsd;
        public double co2Kg;
        public double waterL;
    }

    public static class SimulationResult {
        public List<HourResult> hours;
        public List<SummaryRow> summary;
    }
}
