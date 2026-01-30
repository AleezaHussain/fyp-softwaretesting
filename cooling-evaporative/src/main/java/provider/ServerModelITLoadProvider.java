package provider;

import com.acme.evap.App;

public class ServerModelITLoadProvider implements ITLoadProvider {
    private final App.Scenario scenario;
    private final UtilizationProfile utilizationProfile;

    public interface UtilizationProfile {
        double getUtilization(long tSec);
    }

    public ServerModelITLoadProvider(App.Scenario scenario, UtilizationProfile utilizationProfile) {
        this.scenario = scenario;
        this.utilizationProfile = utilizationProfile;
    }

    @Override
    public double getTotalITkW(long tSec) {
        double u = utilizationProfile.getUtilization(tSec);
        double P_idle = scenario.P_server_idle_W;
        double P_max = scenario.P_server_max_W;
        double n = scenario.num_servers;
        double P_servers = n * (P_idle + (P_max - P_idle) * u);
        // Server fan model (linear with inlet temp, here use scenario.T_in_C as proxy)
        double alpha = 0.05; // sensitivity per deg C above T_ref
        double Fan_factor = 1.0 + alpha * Math.max(0, scenario.T_in_C - scenario.T_ref_C);
        double P_server_fans = n * scenario.P_fan_server_design_W * Fan_factor;
        return (P_servers + P_server_fans) / 1000.0; // kW
    }
}