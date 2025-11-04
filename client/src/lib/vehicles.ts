export interface VehicleType {
  id: string;
  name: string;
  capacity: number; // laadmeters
  color: string;
}

export const VEHICLE_TYPES: VehicleType[] = [
  { id: 'trailer', name: 'Trailer', capacity: 13.2, color: '#ef4444' },
  { id: 'bakwagen', name: 'Bakwagen', capacity: 7.2, color: '#3b82f6' },
  { id: 'kleine-bakwagen', name: 'Kleine Bakwagen', capacity: 6.0, color: '#10b981' },
  { id: 'busje', name: 'Busje', capacity: 2.4, color: '#f59e0b' },
];

export interface VehicleSelection {
  type: VehicleType;
  count: number;
}
