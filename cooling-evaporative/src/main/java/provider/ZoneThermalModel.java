package provider;

public class ZoneThermalModel {
    public double T_cold;
    public double T_hot;
    public double tau_cold;
    public double tau_hot;

    public ZoneThermalModel(double T_cold_init, double T_hot_init, double tau_cold, double tau_hot) {
        this.T_cold = T_cold_init;
        this.T_hot = T_hot_init;
        this.tau_cold = tau_cold;
        this.tau_hot = tau_hot;
    }

    // Update cold and hot zone temperatures
    public void update(double dt, double T_cold_eq, double T_hot_eq) {
        T_cold = T_cold + (dt / tau_cold) * (T_cold_eq - T_cold);
        T_hot = T_hot + (dt / tau_hot) * (T_hot_eq - T_hot);
    }
}
