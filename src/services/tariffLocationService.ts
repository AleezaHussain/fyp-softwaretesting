import { supabase } from "../lib/supabase";

export async function getTariffCarbonLocations() {
  // Fetch tariff_carbon
  const { data: tariffs, error: tariffError } = await supabase
    .from("tariff_carbon")
    .select(
      "id, country_name, co2_grid_factor, electricity_tariff, created_at",
    );

  // Fetch locations
  const { data: locations, error: locationError } = await supabase
    .from("locations")
    .select(
      "id, city, country, latitude, longitude, elevation, wmo_station, source",
    );

  return {
    tariffs: tariffs || [],
    locations: locations || [],
    error: tariffError?.message || locationError?.message || null,
  };
}
