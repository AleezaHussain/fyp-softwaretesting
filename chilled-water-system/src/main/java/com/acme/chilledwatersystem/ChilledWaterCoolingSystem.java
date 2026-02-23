package com.acme.chilledwatersystem;

import java.util.List;

public class ChilledWaterCoolingSystem {
    private List<CRAHUnit> crahUnits;
    private ChillerUnit chiller;
    private CoolingTower tower;
    private PumpSystem pumps;
    private ClimateProfile climate;
    private CoolingMetrics metrics;
    private WaterLoop loop;

    private double totalPowerKW, pue;
    private WaterConsumption waterConsumption = new WaterConsumption();
    private double lastHourWaterL = 0.0;
    private double lastChillerPowerKW = 0.0;
    private double lastChillerCOP = 0.0;
    // per-component last-hour powers
    private double lastCRAHPowerKW = 0.0;
    private double lastPumpPowerKW = 0.0;
    private double lastTowerPowerKW = 0.0;

    public ChilledWaterCoolingSystem(List<CRAHUnit> crahUnits, ChillerUnit chiller,
            CoolingTower tower, PumpSystem pumps, ClimateProfile climate,
            WaterLoop loop, CoolingMetrics metrics) {
        this.crahUnits = crahUnits;
        this.chiller = chiller;
        this.tower = tower;
        this.pumps = pumps;
        this.climate = climate;
        this.loop = loop;
        this.metrics = metrics;
    }

    public void update(java.util.List<com.acme.chilledwatersystem.datacenter.Rack> racks, double ambient,
            double wetBulb) {
        // compute total IT heat from racks
        double totalItKW = 0.0;
        for (com.acme.chilledwatersystem.datacenter.Rack r : racks) {
            totalItKW += r.getTotalHeat();
        }

        SmartController controller = new SmartController();
        SmartController.Decision d = controller.decide(totalItKW, wetBulb, 22.0);

        // CRAH fans: compute per-rack fan power (controller's fan fraction applied per
        // rack)
        double crahPower = 0.0;
        for (com.acme.chilledwatersystem.datacenter.Rack r : racks) {
            double rackHeat = r.getTotalHeat();
            // sum fan power across CRAH units for this rack
            crahPower += crahUnits.stream().mapToDouble(c -> c.getFanPower(rackHeat) * d.crahFanFrac).sum();
        }
        lastCRAHPowerKW = crahPower;

        double coolingDemandKW = totalItKW; // all IT power → heat

        // Economizer: if controller.economizerOn then we avoid compressor power
        if (d.economizerOn) {
            // run tower + pumps only (compressor skipped)
            chiller.coolWater(0.0, wetBulb);
            double pumpPower = pumps.calculate(loop.getFlowRate(), totalItKW, 500.0);
            double towerPower = tower.reject(coolingDemandKW, wetBulb);
            lastPumpPowerKW = pumpPower;
            lastTowerPowerKW = towerPower;
            totalPowerKW = crahPower + pumpPower + towerPower;
            // water consumption based on tower rejecting the IT heat
            waterConsumption.addHour(coolingDemandKW, totalItKW, wetBulb);
            lastHourWaterL = waterConsumption.getTotalWaterL();
            lastChillerPowerKW = 0.0;
            lastChillerCOP = 0.0;
        } else {
            chiller.coolWater(coolingDemandKW, wetBulb);
            double pumpPower = pumps.calculate(loop.getFlowRate(), totalItKW, 500.0);
            double towerPower = tower.reject(chiller.getHeatRejected(), wetBulb);
            lastPumpPowerKW = pumpPower;
            lastTowerPowerKW = towerPower;
            totalPowerKW = crahPower + chiller.getPower() + pumpPower + towerPower;
            // water consumption based on chiller heat rejected
            waterConsumption.addHour(chiller.getHeatRejected(), totalItKW, wetBulb);
            lastHourWaterL = waterConsumption.getTotalWaterL();
            lastChillerPowerKW = chiller.getPower();
            lastChillerCOP = chiller.getLastCOP();
        }
        pue = (totalItKW + totalPowerKW) / Math.max(0.1, totalItKW);
        metrics.addHour(totalPowerKW);
    }

    public double getLastHourWaterL() {
        return lastHourWaterL;
    }

    public double getWUE() {
        return waterConsumption.getWUE();
    }

    public double getLastChillerPowerKW() {
        return lastChillerPowerKW;
    }

    public double getLastChillerCOP() {
        return lastChillerCOP;
    }

    public double getLastCRAHPowerKW() {
        return lastCRAHPowerKW;
    }

    public double getLastPumpPowerKW() {
        return lastPumpPowerKW;
    }

    public double getLastTowerPowerKW() {
        return lastTowerPowerKW;
    }

    public double getTotalWaterL() {
        return waterConsumption.getTotalWaterL();
    }

    public double getTotalWaterCostUSD() {
        return waterConsumption.getTotalWaterCostUSD();
    }

    public double getPUE() {
        return pue;
    }

    public double getCoolingPower() {
        return totalPowerKW;
    }
}
