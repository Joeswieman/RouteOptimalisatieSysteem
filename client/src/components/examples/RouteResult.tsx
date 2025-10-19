import { RouteResult } from '../RouteResult';
import { Point } from '../PointInput';

export default function RouteResultExample() {
  const mockRoute: Point[] = [
    { id: '1', name: 'Amsterdam', x: 52.37, y: 4.89 },
    { id: '2', name: 'Utrecht', x: 52.09, y: 5.12 },
    { id: '3', name: 'Rotterdam', x: 51.92, y: 4.48 }
  ];

  return (
    <RouteResult
      optimizedRoute={mockRoute}
      totalDistance={85.5}
      calculationTime={12}
    />
  );
}
