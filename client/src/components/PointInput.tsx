import { X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export interface Point {
  id: string;
  name: string;
  x: number;
  y: number;
  loadMeters?: number; // laadmeters voor deze stop
  timeWindow?: string; // tijdvenster bijv. "7:00-11:30"
  city?: string; // stad/gemeente
}

interface PointInputProps {
  point: Point;
  index: number;
  onUpdate: (point: Point) => void;
  onRemove: () => void;
  onHighlight?: () => void;
  isHighlighted?: boolean;
}

export function PointInput({ point, index, onUpdate, onRemove, onHighlight, isHighlighted }: PointInputProps) {
  return (
    <Card className={`p-4 gap-3 flex items-center transition-all ${isHighlighted ? 'ring-2 ring-yellow-500 bg-yellow-50 dark:bg-yellow-950' : ''}`}>
      <div className="flex items-center gap-2 flex-1">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <div 
          className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium cursor-pointer transition-all ${isHighlighted ? 'bg-yellow-500 text-white scale-110' : 'bg-primary text-primary-foreground hover:scale-105'}`}
          onClick={onHighlight}
        >
          {index + 1}
        </div>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
          <Input
            placeholder="Stad/Gemeente"
            value={point.city ?? ''}
            onChange={(e) => onUpdate({ ...point, city: e.target.value })}
            data-testid={`input-point-city-${index}`}
          />
          <Input
            placeholder="Straat + Nummer"
            value={point.name}
            onChange={(e) => onUpdate({ ...point, name: e.target.value })}
            data-testid={`input-point-name-${index}`}
          />
          <Input
            type="text"
            placeholder="Laadmeters"
            value={point.loadMeters ?? ''}
            onChange={(e) => {
              const val = e.target.value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
              onUpdate({ ...point, loadMeters: val ? parseFloat(val) : undefined });
            }}
            data-testid={`input-point-loadmeters-${index}`}
          />
          <Input
            type="text"
            placeholder="Tijdvenster (7:00-11:30)"
            value={point.timeWindow ?? ''}
            onChange={(e) => onUpdate({ ...point, timeWindow: e.target.value })}
            data-testid={`input-point-timewindow-${index}`}
          />
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        data-testid={`button-remove-point-${index}`}
      >
        <X className="h-4 w-4" />
      </Button>
    </Card>
  );
}
