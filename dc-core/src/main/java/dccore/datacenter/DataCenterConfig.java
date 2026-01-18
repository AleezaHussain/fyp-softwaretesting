package dccore.datacenter;

public class DataCenterConfig {

    // Environmental parameters
    public static final double AMBIENT_TEMP_C = 25.0;
    public static final double RETURN_AIR_TEMP_C = 35.0;
    public static final double CHILLED_WATER_TEMP_C = 12.0;

    // IT load configuration
    public static final double IT_LOAD_KW = 100.0;

    // Cooling system configuration
    public static final String COOLING_TYPE = "CRAC"; // or "CRAH"
    public static final int CRAC_UNITS = 4;
    public static final int CRAH_UNITS = 3;

    // Economic parameters
    public static final double ELECTRICITY_COST_PER_KWH = 0.12; // USD per kWh
    public static final double CO2_EMISSION_FACTOR = 0.45; // kg CO2 per kWh

    // Performance targets
    public static final double TARGET_PUE = 1.5;
    public static final double MAX_SUPPLY_TEMP_C = 18.0;
    public static final double MIN_SUPPLY_TEMP_C = 16.0;
}