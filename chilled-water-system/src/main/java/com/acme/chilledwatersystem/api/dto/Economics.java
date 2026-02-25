package com.acme.chilledwatersystem.api.dto;


public class Economics {
    private Double capex_USD;
    private Double opex_annual_USD;
    private Double lccp_USD;
    private Double npv_USD;
    private Double paybackPeriod_years;


    public Double getCapex_USD() {
        return capex_USD;
    }

    public void setCapex_USD(Double capex_USD) {
        this.capex_USD = capex_USD;
    }

    public Double getOpex_annual_USD() {
        return opex_annual_USD;
    }

    public void setOpex_annual_USD(Double opex_annual_USD) {
        this.opex_annual_USD = opex_annual_USD;
    }

    public Double getLccp_USD() {
        return lccp_USD;
    }

    public void setLccp_USD(Double lccp_USD) {
        this.lccp_USD = lccp_USD;
    }

    public Double getNpv_USD() {
        return npv_USD;
    }

    public void setNpv_USD(Double npv_USD) {
        this.npv_USD = npv_USD;
    }

    public Double getPaybackPeriod_years() {
        return paybackPeriod_years;
    }

    public void setPaybackPeriod_years(Double paybackPeriod_years) {
        this.paybackPeriod_years = paybackPeriod_years;
    }

}