package org.cloudbus.cloudsim.chilledwater;

public class HourlyResult {
    public int hour;
    public double itKW;
    public double crahKW;
    public double chillerKW;
    public double pumpKW;
    public double towerKW;
    public double crahPowerKW; // per-component explicit fields (kept for backward compat names)
    public double chillerPowerKW;
    public double totalKW;
    public double pue;
    public double ambientC;
    public double wetbulbC;
    public double hourlyCostUSD;
    public double hourlyCO2kg;
    public double hourWaterL;
    public double pumpPowerKW;
    public double towerPowerKW;
    // Note: keep existing field names used elsewhere (crahKW/chillerKW/pumpKW/towerKW)
    public double chillerCOP;
}
