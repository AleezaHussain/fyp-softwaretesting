package provider;

public class WeatherPoint {
    public double Tdb_C;
    public double RH_percent;
    public double P_kPa;

    public WeatherPoint(double Tdb_C, double RH_percent, double P_kPa) {
        this.Tdb_C = Tdb_C;
        this.RH_percent = RH_percent;
        this.P_kPa = P_kPa;
    }
}
