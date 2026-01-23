package com.example.coolingeconomizer.model;

import java.util.List;

public class SimulationRequest {

    /*
     * =====================================================
     * DATA CENTER LAYOUT
     * =====================================================
     */
    public int numberOfRacks;
    public int serversPerRack;
    // Fan configuration (quantities and efficiencies)
    public int bestQuantity;
    public double bestEfficiency;
    public int averageQuantity;
    public double averageEfficiency;
    public int legacyQuantity;
    public double legacyEfficiency;

    /*
     * =====================================================
     * SERVER HARDWARE (ENGINEER INPUT)
     * =====================================================
     */

    public double serverMaxPowerW;
    public double serverIdlePowerW;

    public double psuEfficiency; // e.g. 0.94
    public boolean dualPSU;
    public double psuOverhead; // fraction (0.05–0.1)

    public double serverMaxAirflowCFM;
    public double serverDeltaT; // °C
    public double serverMaxInletTemp; // °C
    public double serverMinInletTemp; // °C

    public double serverFanPowerPercent;
    public boolean variableFanSpeed;
    public double minFanSpeed;

    public int serverUHeight;
    public String formFactor;
    public double serverDepthMm;
    public double serverWidthMm;

    /*
     * =====================================================
     * OPERATIONAL LOAD
     * =====================================================
     */
    public double averageUtilization; // %
    public double peakUtilization; // %

    /*
     * =====================================================
     * AIR & THERMAL (OPTIONAL OVERRIDES)
     * =====================================================
     */
    public Double supplyAirTemp; // °C
    public Double returnAirTemp; // °C
    public Double airflowCFM; // CFM
    public Double deltaT; // °C

    /*
     * =====================================================
     * ECONOMIZER CONTROL (RESEARCH-ALIGNED)
     * =====================================================
     */
    public Double economizerEnableTemp; // °C
    // Advanced Economizer Controls from frontend
    public Double economizerMaxOutdoorTemp; // °C (high-limit shutoff)
    public Double economizerMaxHumidity; // % (max outdoor humidity)
    public Double minOutdoorAirFraction; // fraction (minimum outdoor air)
    public Double maxInletTemp; // °C (ASHRAE)
    public Double mixingFraction; // 0–1
    public Double damperControlPowerKW; // kW
    public Double fanPressurePenalty; // fraction
    public Double mechanicalCOP;

    /*
     * =====================================================
     * ENERGY & EMISSIONS
     * =====================================================
     */
    public double electricityTariff; // $/kWh
    public double carbonIntensity; // kgCO2/kWh
    public String country; // optional

    /*
     * =====================================================
     * WEATHER
     * =====================================================
     */
    public List<WeatherData> weatherData;

    /*
     * =====================================================
     * WEATHER DATA STRUCT
     * =====================================================
     */
    public static class WeatherData {
        public String timestamp;
        public double dryBulb; // °C
        public double relativeHumidity; // %

        @Override
        public String toString() {
            return "WeatherData{" +
                    "timestamp='" + timestamp + '\'' +
                    ", dryBulb=" + dryBulb +
                    ", relativeHumidity=" + relativeHumidity +
                    '}';
        }
    }

    @Override
    public String toString() {
        return "SimulationRequest{" +
                "numberOfRacks=" + numberOfRacks +
                ", serversPerRack=" + serversPerRack +
                ", serverMaxPowerW=" + serverMaxPowerW +
                ", averageUtilization=" + averageUtilization +
                ", supplyAirTemp=" + supplyAirTemp +
                ", airflowCFM=" + airflowCFM +
                ", economizerEnableTemp=" + economizerEnableTemp +
                '}';
    }
}
