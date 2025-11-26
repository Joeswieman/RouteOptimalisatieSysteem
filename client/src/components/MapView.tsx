import React, { useEffect } from "react";
import { VEHICLE_COLORS } from "@/lib/colors";
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

// Use an inline SVG DivIcon that matches the default marker silhouette but colored red.
const redDivIcon = L.divIcon({
  className: "", // keep no extra classes to avoid css interference
  html: `
    <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="s" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000" flood-opacity="0.25"/>
        </filter>
      </defs>
      <path d="M12.5 0 C7 0 2 5 2 10 C2 18 12.5 41 12.5 41 C12.5 41 23 18 23 10 C23 5 18 0 12.5 0 Z" fill="#ef4444" filter="url(#s)"/>
      <circle cx="12.5" cy="12" r="5.2" fill="#ffffff" />
    </svg>
  `,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Yellow/gold icon for highlighted markers
const goldDivIcon = L.divIcon({
  className: "",
  html: `
    <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="sg" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#000" flood-opacity="0.4"/>
        </filter>
      </defs>
      <path d="M12.5 0 C7 0 2 5 2 10 C2 18 12.5 41 12.5 41 C12.5 41 23 18 23 10 C23 5 18 0 12.5 0 Z" fill="#eab308" filter="url(#sg)"/>
      <circle cx="12.5" cy="12" r="5.2" fill="#ffffff" />
    </svg>
  `,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = defaultIcon;

interface MapViewProps {
  points: Point[];
  route: Point[] | null;
  routeGeometry?: [number, number][][];
  vehicleGeometries?: [number, number][][][] | null;
  selectedVehicle?: number | null;
  onHoverVehicle?: (index: number | null) => void;
  showLegendOverlay?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  highlightedPointId?: string | null;
  highlightedVehicle?: number | null;
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

export function MapView({ points, route, routeGeometry, vehicleGeometries, selectedVehicle, onHoverVehicle, showLegendOverlay, onMapClick, highlightedPointId, highlightedVehicle }: MapViewProps) {
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
        
        {points.filter(point => {
          // Filter punten met ongeldige coördinaten
          const isValid = point.x !== 0 && point.y !== 0;
          const inNetherlands = point.y >= 50 && point.y <= 54 && point.x >= 3 && point.x <= 8;
          return isValid && inNetherlands;
        }).map((point, index) => {
          const isStartEnd = point.id === 'start-end';
          const isHighlighted = point.id === highlightedPointId;
          const markerIcon = isStartEnd ? redDivIcon : (isHighlighted ? goldDivIcon : defaultIcon);
          
          return (
            <Marker 
              key={point.id} 
              position={[point.y, point.x]}
              icon={markerIcon}
            >
              <Popup>
                <div>
                  <strong>{point.name || `Punt ${index + 1}`}</strong>
                  <br />
                  Coördinaten: {point.y.toFixed(4)}, {point.x.toFixed(4)}
                </div>
              </Popup>
            </Marker>
          );
        })}
        
        {/* single-route geometry (old API) */}
        {routeGeometry && routeGeometry.length > 0 && (!vehicleGeometries || vehicleGeometries.length === 0) && (
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

        {/* per-vehicle geometries */}
        {vehicleGeometries && vehicleGeometries.length > 0 && (
          <>
            {vehicleGeometries.map((vehicleSegments, vi) => {
              const color = VEHICLE_COLORS[vi % VEHICLE_COLORS.length];
              const isHighlighted = highlightedVehicle === vi;
              const isHovered = selectedVehicle === vi;
              const isOtherHighlighted = highlightedVehicle !== null && highlightedVehicle !== vi;
              
              if (vi === 0) {
                console.log('🗺️ MapView render - voertuig 0:', { 
                  highlightedVehicle, 
                  isHighlighted, 
                  isOtherHighlighted,
                  color: isOtherHighlighted ? '#999999' : color,
                  weight: isHighlighted ? 10 : (isHovered ? 6 : 4),
                  opacity: isOtherHighlighted ? 0.25 : (isHighlighted ? 1.0 : (isHovered ? 0.95 : 0.85))
                });
              }
              
              return (
                <React.Fragment key={vi}>
                  {vehicleSegments.map((segment, si) => (
                    <Polyline
                      key={`${vi}-${si}`}
                      positions={segment}
                      color={isOtherHighlighted ? '#999999' : color}
                      weight={isHighlighted ? 10 : (isHovered ? 6 : 4)}
                      opacity={isOtherHighlighted ? 0.25 : (isHighlighted ? 1.0 : (isHovered ? 0.95 : 0.85))}
                      eventHandlers={{
                        mouseover: () => onHoverVehicle && onHoverVehicle(vi),
                        mouseout: () => onHoverVehicle && onHoverVehicle(null),
                      }}
                    />
                  ))}
                </React.Fragment>
              );
            })}
          </>
        )}

        {/* floating legend overlay inside map */}
        {showLegendOverlay && vehicleGeometries && vehicleGeometries.length > 0 && (
          <div className="absolute top-4 right-4 z-50 bg-white/90 p-3 rounded shadow-lg max-w-xs">
            <div className="text-sm font-medium mb-2">Legenda</div>
            {vehicleGeometries.map((_, i) => (
              <div key={`overlay-${i}`} className="flex items-center gap-2 mb-1">
                <div style={{ width: 12, height: 12, background: VEHICLE_COLORS[i % VEHICLE_COLORS.length], borderRadius: 3 }} />
                <div className="text-sm">Voertuig {i + 1}</div>
              </div>
            ))}
          </div>
        )}
      </MapContainer>
    </div>
  );
}
