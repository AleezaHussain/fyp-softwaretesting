package org.cloudbus.cloudsim.datacenter;

import java.util.List;

public class DataCenterModel {
    private List<Rack> racks;
    private ITLoadProfile loadProfile;

    public DataCenterModel(List<Rack> racks, ITLoadProfile profile) {
        this.racks = racks;
        this.loadProfile = profile;
    }

    public double updateAndGetTotalHeat(int hour) {
        double totalHeat = 0;
        double loadFraction = loadProfile.getLoadFraction(hour);

        for (Rack r : racks) {
            r.getServers().forEach(s -> s.setLoad(loadFraction));
            totalHeat += r.getTotalHeat();
        }
        return totalHeat; // kW heat to cooling system
    }

    public List<Rack> getRacks() { return racks; }
}
