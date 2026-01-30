package provider;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class CsvWeatherProvider implements WeatherProvider {
    private final List<WeatherPoint> weatherPoints = new ArrayList<>();
    private final int SECONDS_PER_HOUR = 3600;

    public CsvWeatherProvider(String csvPath) throws IOException {
        try (BufferedReader br = new BufferedReader(new FileReader(csvPath))) {
            String line = br.readLine(); // skip header
            while ((line = br.readLine()) != null) {
                String[] tokens = line.split(",");
                if (tokens.length < 4)
                    continue;
                // tokens[0] = timestamp, tokens[1] = Tdb_C, tokens[2] = RH_percent, tokens[3] =
                // Pressure_kPa
                double Tdb_C = Double.parseDouble(tokens[1]);
                double RH_percent = Double.parseDouble(tokens[2]);
                double P_kPa = Double.parseDouble(tokens[3]);
                weatherPoints.add(new WeatherPoint(Tdb_C, RH_percent, P_kPa));
            }
        }
    }

    @Override
    public WeatherPoint get(long tSec) {
        int hourIdx = (int) (tSec / SECONDS_PER_HOUR);
        if (hourIdx < 0)
            hourIdx = 0;
        if (hourIdx >= weatherPoints.size())
            hourIdx = weatherPoints.size() - 1;
        return weatherPoints.get(hourIdx);
    }
}
