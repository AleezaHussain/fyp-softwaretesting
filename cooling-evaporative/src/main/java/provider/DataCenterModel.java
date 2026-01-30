package provider;

import java.util.List;

public class DataCenterModel {
    public List<Rack> racks;
    public ITLoadProvider itLoadProvider;
    public double recircFrac; // r
    public double supplyAirTemp_C;
    public double hotAisleTemp_C;
    public double Cp_kJ_per_kgC = 1.006;
    public double rho_air = 1.2;

    public DataCenterModel(List<Rack> racks, ITLoadProvider itLoadProvider, double recircFrac, double supplyAirTemp_C) {
        this.racks = racks;
        this.itLoadProvider = itLoadProvider;
        this.recircFrac = recircFrac;
        this.supplyAirTemp_C = supplyAirTemp_C;
        this.hotAisleTemp_C = supplyAirTemp_C; // initial
    }

    public double getTotalITkW(long tSec) {
        // For now, sum max power of all racks (could be dynamic)
        return racks.stream().mapToDouble(r -> r.P_max_kW).sum();
    }

    public double getTotalAirflow() {
        return racks.stream().mapToDouble(r -> r.airflow_m3s).sum();
    }

    public void updateTemps(long tSec) {
        double P_IT = getTotalITkW(tSec);
        double m_air = getTotalAirflow() * rho_air;
        double deltaT = (m_air > 0) ? (P_IT / (m_air * Cp_kJ_per_kgC)) : 0.0;
        double T_cold = supplyAirTemp_C;
        double T_hot = T_cold + deltaT;
        // Recirculation
        double T_cold_actual = (1 - recircFrac) * T_cold + recircFrac * T_hot;
        this.hotAisleTemp_C = T_hot;
        this.supplyAirTemp_C = T_cold_actual;
    }
}
