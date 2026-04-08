import { supabase } from '../lib/supabase';

export interface Location {
  id: number;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  elevation: number | null;
  wmo_station: string | null;
  source: string | null;
}

export interface LocationFilters {
  country?: string;
  minElevation?: number;
  maxElevation?: number;
  search?: string;
}

export const locationService = {
  // Get all locations
  async getAllLocations(): Promise<{ data: Location[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('country', { ascending: true })
        .order('city', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : 'Failed to fetch locations' };
    }
  },

  // Get locations with filters
  async getFilteredLocations(filters: LocationFilters): Promise<{ data: Location[] | null; error: string | null }> {
    try {
      let query = supabase
        .from('locations')
        .select('*');

      if (filters.country) {
        query = query.eq('country', filters.country);
      }

      if (filters.minElevation !== undefined) {
        query = query.gte('elevation', filters.minElevation);
      }

      if (filters.maxElevation !== undefined) {
        query = query.lte('elevation', filters.maxElevation);
      }

      if (filters.search) {
        query = query.or(`city.ilike.%${filters.search}%,country.ilike.%${filters.search}%`);
      }

      const { data, error } = await query.order('country', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : 'Failed to fetch locations' };
    }
  },

  // Get unique countries
  async getUniqueCountries(): Promise<{ data: string[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('country')
        .order('country');

      if (error) throw error;
      
      const countries = [...new Set(data.map(item => item.country).filter(Boolean))];
      return { data: countries, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : 'Failed to fetch countries' };
    }
  },

  // Get location by ID
  async getLocationById(id: number): Promise<{ data: Location | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : 'Failed to fetch location' };
    }
  }
};