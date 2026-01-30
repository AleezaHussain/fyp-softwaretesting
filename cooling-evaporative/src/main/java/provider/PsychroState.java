package provider;

public class PsychroState {
    public double Tdb_C;
    public double RH;
    public double W; // humidity ratio kg/kg dry air
    public double h; // enthalpy kJ/kg dry air
    public double Tdp_C; // dew point
    public double Twb_C; // wet bulb (approx)
    public double P_kPa; // ambient pressure

    public PsychroState(double Tdb_C, double RH, double W, double h, double Tdp_C, double Twb_C, double P_kPa) {
        this.Tdb_C = Tdb_C;
        this.RH = RH;
        this.W = W;
        this.h = h;
        this.Tdp_C = Tdp_C;
        this.Twb_C = Twb_C;
        this.P_kPa = P_kPa;
    }
}
