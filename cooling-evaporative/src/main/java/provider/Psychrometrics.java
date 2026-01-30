package provider;

public class Psychrometrics {
    // Saturation vapor pressure (kPa) using Magnus formula
    public static double Pws(double Tdb_C) {
        double T = Tdb_C;
        return 0.61094 * Math.exp((17.625 * T) / (T + 243.04));
    }

    // Vapor pressure (kPa)
    public static double Pv(double RH_percent, double Tdb_C) {
        return (RH_percent / 100.0) * Pws(Tdb_C);
    }

    // Humidity ratio (kg/kg dry air)
    public static double W(double Pv, double P_kPa) {
        return 0.62198 * Pv / (P_kPa - Pv);
    }

    // Enthalpy (kJ/kg dry air)
    public static double h(double Tdb_C, double W) {
        return 1.006 * Tdb_C + W * (2501 + 1.86 * Tdb_C);
    }

    // Dew point (C) from vapor pressure (kPa)
    public static double Tdp(double Pv) {
        double a = 17.625;
        double b = 243.04;
        double lnPv = Math.log(Pv / 0.61094);
        return (b * lnPv) / (a - lnPv);
    }

    // Wet bulb temperature (approx, Stull 2011, valid 0-50C, 1-100% RH)
    public static double Twb(double Tdb_C, double RH_percent, double P_kPa) {
        double rh = RH_percent / 100.0;
        double twb = Tdb_C * Math.atan(0.151977 * Math.sqrt(rh + 8.313659))
                + Math.atan(Tdb_C + rh)
                - Math.atan(rh - 1.676331)
                + 0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh)
                - 4.686035;
        return twb;
    }

    // Build full state
    public static PsychroState from(double Tdb_C, double RH_percent, double P_kPa) {
        double pws = Pws(Tdb_C);
        double pv = Pv(RH_percent, Tdb_C);
        double w = W(pv, P_kPa);
        double h = h(Tdb_C, w);
        double tdp = Tdp(pv);
        double twb = Twb(Tdb_C, RH_percent, P_kPa);
        return new PsychroState(Tdb_C, RH_percent, w, h, tdp, twb, P_kPa);
    }
}
