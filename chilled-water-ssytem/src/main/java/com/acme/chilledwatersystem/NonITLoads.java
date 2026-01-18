package com.acme.chilledwatersystem;

/**
 * Ancillary loads that become heat in the white space and must be removed by
 * cooling:
 * UPS, PDU, lighting, people, and envelope gains.
 * Defaults match common rules of thumb; adjust to your site.
 */
public class NonITLoads {

    // Percentages of IT load (fractions)
    private double upsIdleFrac = 0.04; // 4% base
    private double upsLossFrac = 0.05; // +5% of IT when loaded
    private double pduBaseFrac = 0.01; // 1% base
    private double pduLoadFrac = 0.02; // +2% of IT

    // Fixed loads
    private double lightingKW = 5.0; // example: area * 21.5 W/m^2 → sum; keep simple here
    private double peopleKW = 0.2; // 2 persons * 0.1 kW sensible each
    private double envelopeKW = 2.0; // small building gains

    public double estimateKW(double itLoadKW) {
        double upsKW = upsIdleFrac * itLoadKW + upsLossFrac * itLoadKW;
        double pduKW = pduBaseFrac * itLoadKW + pduLoadFrac * itLoadKW;
        return upsKW + pduKW + lightingKW + peopleKW + envelopeKW;
    }

    // Tuners
    public void setLightingKW(double v) {
        this.lightingKW = v;
    }

    public void setPeopleKW(double v) {
        this.peopleKW = v;
    }

    public void setEnvelopeKW(double v) {
        this.envelopeKW = v;
    }

    public void setUpsIdleFrac(double v) {
        this.upsIdleFrac = v;
    }

    public void setUpsLossFrac(double v) {
        this.upsLossFrac = v;
    }

    public void setPduBaseFrac(double v) {
        this.pduBaseFrac = v;
    }

    public void setPduLoadFrac(double v) {
        this.pduLoadFrac = v;
    }
}
