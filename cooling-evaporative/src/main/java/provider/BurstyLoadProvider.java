package provider;

import java.util.Random;

public class BurstyLoadProvider implements ITLoadProvider {
    private final double mean;
    private final double amplitude;
    private final double spikeProbability;
    private final Random random;

    public BurstyLoadProvider(double mean, double amplitude, double spikeProbability) {
        this.mean = mean;
        this.amplitude = amplitude;
        this.spikeProbability = spikeProbability;
        this.random = new Random();
    }

    @Override
    public double getTotalITkW(long tSec) {
        double base = mean + amplitude * Math.sin(2 * Math.PI * ((tSec % (24 * 3600)) / (24.0 * 3600)));
        if (random.nextDouble() < spikeProbability) {
            return base + amplitude;
        }
        return base;
    }
}
