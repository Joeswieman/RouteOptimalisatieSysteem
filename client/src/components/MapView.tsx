import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from "react-leaflet";
import { Point } from "./PointInput";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

interface MapViewProps {
  points: Point[];
  route: Point[] | null;
  routeGeometry?: [number, number][][];
  onMapClick?: (lat: number, lng: number) => void;
}

function MapClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export function MapView({ points, route, routeGeometry, onMapClick }: MapViewProps) {
  const center: [number, number] = [52.1326, 5.2913];

  return (
    <div className="h-full w-full rounded-md overflow-hidden border" data-testid="map-container">
      <MapContainer
        center={center}
        zoom={7}
        className="h-full w-full"
        style={{ height: "100%", minHeight: "400px" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onMapClick={onMapClick} />
        
        {points.map((point, index) => (
          <Marker key={point.id} position={[point.y, point.x]}>
            <Popup>
              <div>
                <strong>{point.name || `Punt ${index + 1}`}</strong>
                <br />
                Coördinaten: {point.y.toFixed(4)}, {point.x.toFixed(4)}
              </div>
            </Popup>
          </Marker>
        ))}
        
        {routeGeometry && routeGeometry.length > 0 && (
          <>
            {routeGeometry.map((segment, index) => (
              <Polyline
                key={index}
                positions={segment}
                color="#3b82f6"
                weight={4}
                opacity={0.7}
              />
            ))}
          </>
        )}
      </MapContainer>
    </div>
  );
}
