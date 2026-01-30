package provider;

public class Rack {
    public double P_max_kW;
    public double P_idle_kW;
    public double airflow_m3s;
    public double serverFanDesign_kW;

    public Rack(double P_max_kW, double P_idle_kW, double airflow_m3s, double serverFanDesign_kW) {
        this.P_max_kW = P_max_kW;
        this.P_idle_kW = P_idle_kW;
        this.airflow_m3s = airflow_m3s;
        this.serverFanDesign_kW = serverFanDesign_kW;
    }

    public Rack(double P_max_kW, double P_idle_kW, double airflow_m3s) {
        this(P_max_kW, P_idle_kW, airflow_m3s, 0.0);
    }
}