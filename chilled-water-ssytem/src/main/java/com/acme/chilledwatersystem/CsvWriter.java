package com.acme.chilledwatersystem;

import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

public class CsvWriter {
    public static void writeHourly(Path out, List<HourlyResult> rows) throws IOException {
        try (BufferedWriter w = Files.newBufferedWriter(out)) {
            w.write("hour,it_kW,crah_kW,crah_power_kW,chiller_kW,chiller_power_kW,chiller_COP,pump_kW,pump_power_kW,tower_kW,tower_power_kW,total_kW,pue,ambientC,wetbulbC,costUSD,co2kg,waterL\n");
            for (HourlyResult r : rows) {
                w.write(String.format(
                        "%d,%.3f,%.3f,%.3f,%.3f,%.3f,%.3f,%.3f,%.3f,%.3f,%.3f,%.3f,%.2f,%.2f,%.4f,%.4f,%.3f\n",
                        r.hour,
                        r.itKW,
                        r.crahKW,
                        r.crahPowerKW,
                        r.chillerKW,
                        r.chillerPowerKW,
                        r.chillerCOP,
                        r.pumpKW,
                        r.pumpPowerKW,
                        r.towerKW,
                        r.towerPowerKW,
                        r.totalKW,
                        r.pue,
                        r.ambientC,
                        r.wetbulbC,
                        r.hourlyCostUSD,
                        r.hourlyCO2kg,
                        r.hourWaterL));
            }
        }
    }
}
