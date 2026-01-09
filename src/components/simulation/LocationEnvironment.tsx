import React, { useState, useEffect } from 'react'
import { MapPin, CloudRain, Thermometer } from 'lucide-react'
import { LocationData, WeatherInfo } from '../../types/simulation'

interface LocationEnvironmentProps {
  onConfirm: (data: LocationData) => void
  onBack: () => void
}

const COMMON_LOCATIONS = [
  { city: 'New York', country: 'USA', lat: 40.7128, lng: -74.006, temp: 12, humidity: 65 },
  { city: 'London', country: 'UK', lat: 51.5074, lng: -0.1278, temp: 10, humidity: 70 },
  { city: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503, temp: 15, humidity: 68 },
  { city: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198, temp: 28, humidity: 80 },
  { city: 'Frankfurt', country: 'Germany', lat: 50.1109, lng: 8.6821, temp: 11, humidity: 62 },
]

const ASHRAE_STANDARDS = {
  standard: { low: 18, high: 27 },
  extended: { low: 15, high: 32 },
}

export const LocationEnvironment: React.FC<LocationEnvironmentProps> = ({ onConfirm, onBack }) => {
  const [usePreset, setUsePreset] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState(COMMON_LOCATIONS[0])
  const [customLat, setCustomLat] = useState(selectedLocation.lat)
  const [customLng, setCustomLng] = useState(selectedLocation.lng)
  const [customCity, setCustomCity] = useState(selectedLocation.city)
  const [customCountry, setCustomCountry] = useState(selectedLocation.country)
  const [electricityCost, setElectricityCost] = useState(0.12)
  const [ashraaeType, setAshraaeType] = useState<'standard' | 'extended'>('standard')
  const [weather, setWeather] = useState<WeatherInfo>({
    temperature: selectedLocation.temp,
    humidity: selectedLocation.humidity,
    timestamp: new Date().toISOString(),
  })

  useEffect(() => {
    if (usePreset) {
      setCustomCity(selectedLocation.city)
      setCustomCountry(selectedLocation.country)
      setCustomLat(selectedLocation.lat)
      setCustomLng(selectedLocation.lng)
      setWeather({
        temperature: selectedLocation.temp,
        humidity: selectedLocation.humidity,
        timestamp: new Date().toISOString(),
      })
    }
  }, [selectedLocation, usePreset])

  const ashrae = ASHRAE_STANDARDS[ashraaeType]

  const handleConfirm = () => {
    const locationData: LocationData = {
      latitude: parseFloat(customLat.toString()),
      longitude: parseFloat(customLng.toString()),
      city: customCity,
      country: customCountry,
      weatherData: weather,
      electricityCost,
      ashraeLow: ashrae.low,
      ashraHigh: ashrae.high,
    }
    onConfirm(locationData)
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#1a1a2e] to-[#16213e] rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Location & Environmental Data</h2>
        <p className="text-gray-300">Configure location and operational parameters</p>
      </div>

      {/* Location Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-[#1a1a2e] mb-4 flex items-center gap-2">
          <MapPin size={20} className="text-[#5ce1e5]" />
          Location Selection
        </h3>

        <div className="flex gap-4 mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={usePreset}
              onChange={() => setUsePreset(true)}
              className="rounded"
            />
            <span className="text-sm font-medium text-gray-700">Use Preset Location</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={!usePreset}
              onChange={() => setUsePreset(false)}
              className="rounded"
            />
            <span className="text-sm font-medium text-gray-700">Custom Coordinates</span>
          </label>
        </div>

        {usePreset ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Location
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {COMMON_LOCATIONS.map((loc) => (
                <button
                  key={`${loc.city}-${loc.country}`}
                  onClick={() => setSelectedLocation(loc)}
                  className={`p-4 rounded-lg border-2 transition text-left ${
                    selectedLocation.city === loc.city && selectedLocation.country === loc.country
                      ? 'border-[#fd5757] bg-red-50'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-[#1a1a2e]">{loc.city}</div>
                  <div className="text-sm text-gray-600">{loc.country}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {loc.lat.toFixed(2)}°, {loc.lng.toFixed(2)}°
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                value={customCity}
                onChange={(e) => setCustomCity(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ce1e5]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <input
                type="text"
                value={customCountry}
                onChange={(e) => setCustomCountry(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ce1e5]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Latitude
              </label>
              <input
                type="number"
                step="0.0001"
                value={customLat}
                onChange={(e) => setCustomLat(parseFloat(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ce1e5]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Longitude
              </label>
              <input
                type="number"
                step="0.0001"
                value={customLng}
                onChange={(e) => setCustomLng(parseFloat(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ce1e5]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Weather Data */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-[#1a1a2e] mb-4 flex items-center gap-2">
          <Thermometer size={20} className="text-[#5ce1e5]" />
          Current Weather Data
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temperature (°C)
            </label>
            <input
              type="number"
              step="0.1"
              value={weather.temperature}
              onChange={(e) =>
                setWeather({
                  ...weather,
                  temperature: parseFloat(e.target.value),
                })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ce1e5]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Humidity (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={weather.humidity}
              onChange={(e) =>
                setWeather({
                  ...weather,
                  humidity: parseFloat(e.target.value),
                })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ce1e5]"
            />
          </div>
        </div>
      </div>

      {/* ASHRAE Standards */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-[#1a1a2e] mb-4 flex items-center gap-2">
          <CloudRain size={20} className="text-[#5ce1e5]" />
          ASHRAE Standards
        </h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Operating Class
          </label>
          <select
            value={ashraaeType}
            onChange={(e) => setAshraaeType(e.target.value as 'standard' | 'extended')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ce1e5]"
          >
            <option value="standard">Standard (18-27°C)</option>
            <option value="extended">Extended (15-32°C)</option>
          </select>
        </div>

        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Minimum Temperature</div>
              <div className="text-2xl font-bold text-[#5ce1e5]">{ashrae.low}°C</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Maximum Temperature</div>
              <div className="text-2xl font-bold text-[#fd5757]">{ashrae.high}°C</div>
            </div>
          </div>
        </div>
      </div>

      {/* Electricity Cost */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Electricity Cost ($/kWh)
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={electricityCost}
          onChange={(e) => setElectricityCost(parseFloat(e.target.value))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5ce1e5]"
        />
        <p className="text-xs text-gray-500 mt-2">Regional average: $0.12/kWh</p>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
        >
          Back
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 bg-[#5ce1e5] text-[#1a1a2e] py-3 rounded-lg font-semibold hover:bg-cyan-400 transition"
        >
          Run Simulation
        </button>
      </div>
    </div>
  )
}
