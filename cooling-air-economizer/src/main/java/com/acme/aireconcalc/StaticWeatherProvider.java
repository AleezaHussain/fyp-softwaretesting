package com.acme.aireconcalc;

public class StaticWeatherProvider implements WeatherProvider {
    @Override
    public WeatherData getWeather() {
        WeatherData w = new WeatherData();
        w.dryBulbC = 22.0;
        w.relativeHumidity = 40.0;
        w.dewPointC = Psychrometrics.calcDewPoint(w.dryBulbC, w.relativeHumidity);
        return w;
    }
}
