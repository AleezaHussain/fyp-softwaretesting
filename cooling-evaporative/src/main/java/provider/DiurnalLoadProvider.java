package provider;

public class DiurnalLoadProvider implements ITLoadProvider {
    private final double mean;
    private final double amplitude;
    private static final double SECONDS_PER_DAY = 24 * 3600.0;

    public DiurnalLoadProvider(double mean, double amplitude) {
        this.mean = mean;
        this.amplitude = amplitude;
    }

    @Override
    public double getTotalITkW(long tSec) {
        double dayFrac = (tSec % SECONDS_PER_DAY) / SECONDS_PER_DAY;
        return mean + amplitude * Math.sin(2 * Math.PI * dayFrac);
    }
}
