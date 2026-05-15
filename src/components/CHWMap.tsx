import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type { MapContainerProps } from "react-leaflet";
import L from "leaflet";
import { useEffect, useState } from "react";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Location {
  id: string;
  name: string;
  location_lat: number | null;
  location_lng: number | null;
  last_sync: string | null;
}

interface Props {
  locations: Location[];
}

export default function CHWMap({ locations }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const center: [number, number] =
    locations.length > 0
      ? [
          locations.reduce((s, l) => s + (l.location_lat ?? 0), 0) / locations.length,
          locations.reduce((s, l) => s + (l.location_lng ?? 0), 0) / locations.length,
        ]
      : [0, 0];

  const validLocations = locations.filter(
    (l): l is Location & { location_lat: number; location_lng: number } =>
      l.location_lat != null && l.location_lng != null,
  );

  return (
    <MapContainer
      center={center}
      zoom={10}
      className="h-80 w-full rounded-2xl"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {validLocations.map((loc) => (
        <Marker key={loc.id} position={[loc.location_lat, loc.location_lng]} icon={defaultIcon}>
          <Popup>
            <strong>{loc.name}</strong>
            <br />
            Last sync: {loc.last_sync ? new Date(loc.last_sync).toLocaleString() : "never"}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
