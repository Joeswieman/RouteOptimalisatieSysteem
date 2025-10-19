import { PointInput, Point } from '../PointInput';
import { useState } from 'react';

export default function PointInputExample() {
  const [point, setPoint] = useState<Point>({
    id: '1',
    name: 'Amsterdam',
    x: 52.37,
    y: 4.89
  });

  return (
    <PointInput
      point={point}
      index={0}
      onUpdate={setPoint}
      onRemove={() => console.log('Remove clicked')}
    />
  );
}
