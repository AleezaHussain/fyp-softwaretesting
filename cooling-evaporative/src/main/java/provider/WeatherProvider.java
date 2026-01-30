package provider;

public interface WeatherProvider {
    WeatherPoint get(long tSec);
}
