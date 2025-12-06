package com.acme.chilledwatersystem.datacenter;

import java.util.List;

public class Rack {
    private String rackId;
    private List<Server> servers;
    private double airflowRate; // m³/s
    private double inletTemp; // °C
    private double outletTemp; // °C

    public Rack(String id, List<Server> servers, double airflowRate) {
        this.rackId = id;
        this.servers = servers;
        this.airflowRate = airflowRate;
    }

    public double getTotalHeat() {
        return servers.stream().mapToDouble(Server::getHeatOutput).sum();
    }

    public java.util.List<Server> getServers() {
        return servers;
    }

    public double getInletTemp() {
        return inletTemp;
    }

    public void setInletTemp(double t) {
        this.inletTemp = t;
    }

    public double getOutletTemp() {
        return outletTemp;
    }

    public void setOutletTemp(double t) {
        this.outletTemp = t;
    }
}
