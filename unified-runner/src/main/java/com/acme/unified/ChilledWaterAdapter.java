package com.acme.unified;

import com.acme.chilledwatersystem.CRAHUnit;
import com.acme.chilledwatersystem.ChillerUnit;
import com.acme.chilledwatersystem.CoolingTower;
import com.acme.chilledwatersystem.PumpSystem;
import com.acme.chilledwatersystem.WaterLoop;
import com.acme.chilledwatersystem.ClimateProfile;
import com.acme.chilledwatersystem.CoolingMetrics;
import com.acme.chilledwatersystem.ChilledWaterCoolingSystem;
import com.acme.chilledwatersystem.SimConfig;
import com.acme.chilledwatersystem.datacenter.DataCenterModel;
import com.acme.chilledwatersystem.datacenter.ITLoadProfile;
import com.acme.chilledwatersystem.datacenter.Rack;
import com.acme.chilledwatersystem.datacenter.Server;

import java.util.List;

/** Adapter that constructs a ChilledWaterCoolingSystem similar to the demo and runs it. */
public class ChilledWaterAdapter implements CoolingTechnique {
    private final ChilledWaterCoolingSystem system;
    private final ClimateProfile climate;
    private final DataCenterModel dcModel;
    private double totalWaterL = 0.0;

    public ChilledWaterAdapter(int scaleFactor) {
        SimConfig cfg = new SimConfig();
        // create simple servers/racks similar to demo
        java.util.List<Server> servers = new java.util.ArrayList<>();
        for (int i = 0; i < scaleFactor; i++) servers.add(new Server("S" + i, 5.0));
        Rack rack = new Rack("R1", servers, Math.max(1.0, scaleFactor / 10.0));
        this.dcModel = new DataCenterModel(List.of(rack), new ITLoadProfile());

        CRAHUnit crah = new CRAHUnit();
        ChillerUnit chiller = new ChillerUnit();
        CoolingTower tower = new CoolingTower();
        PumpSystem pump = new PumpSystem();

        WaterLoop loop = new WaterLoop((int) cfg.getDouble("water.flowLps", 50), (int) cfg.getDouble("water.deltaT", 10));
        this.climate = new ClimateProfile("Houston");
        CoolingMetrics metrics = new CoolingMetrics(cfg);

        this.system = new ChilledWaterCoolingSystem(List.of(crah), chiller, tower, pump, climate, loop, metrics);
    }

    @Override
    public String getName() { return "ChilledWater"; }

    @Override
    public double simulateHour(double itLoadKW, double ambientC, double wetBulbC, int hour) {
        // Ensure the adapter's datacenter model updates server loads for this hour
        // so that Rack.getTotalHeat() reports the correct IT heat for the controller.
        double totalIt = dcModel.updateAndGetTotalHeat(hour % 24);
        java.util.List<Rack> racks = dcModel.getRacks();
        // Pass the updated racks into the chilled-water system
        system.update(racks, ambientC, wetBulbC);
        totalWaterL = system.getTotalWaterL();
        return system.getCoolingPower();
    }

    @Override
    public double getTotalWaterL() { return totalWaterL; }
}
