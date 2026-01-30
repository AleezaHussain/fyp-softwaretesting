package provider;

public class FlatLoadProvider implements ITLoadProvider {
    private final double kW;

    public FlatLoadProvider(double kW) {
        this.kW = kW;
    }

    @Override
    public double getTotalITkW(long tSec) {
        return kW;
    }
}
