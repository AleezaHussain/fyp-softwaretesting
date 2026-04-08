import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface Location {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

interface LocationMapProps {
  locations: Location[];
}

const LocationMap: React.FC<LocationMapProps> = ({ locations }) => {
  // Center map to average lat/lng
  const avgLat =
    locations.reduce((sum, loc) => sum + loc.latitude, 0) / locations.length;
  const avgLng =
    locations.reduce((sum, loc) => sum + loc.longitude, 0) / locations.length;

  return (
    <MapContainer
      center={[avgLat, avgLng]}
      zoom={2}
      style={{ height: "400px", width: "100%", borderRadius: "1rem" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      {locations.map((loc, i) => (
        <Marker key={i} position={[loc.latitude, loc.longitude]}>
          <Popup>
            <strong>
              {loc.city}, {loc.country}
            </strong>
            <br />
            Lat: {loc.latitude.toFixed(2)}
            <br />
            Lng: {loc.longitude.toFixed(2)}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default LocationMap;
