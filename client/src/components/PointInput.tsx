import { X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export interface Point {
  id: string;
  name: string;
  x: number;
  y: number;
}

interface PointInputProps {
  point: Point;
  index: number;
  onUpdate: (point: Point) => void;
  onRemove: () => void;
}

export function PointInput({ point, index, onUpdate, onRemove }: PointInputProps) {
  return (
    <Card className="p-4 gap-3 flex items-center">
      <div className="flex items-center gap-2 flex-1">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
          {index + 1}
        </div>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input
            placeholder="Naam locatie"
            value={point.name}
            onChange={(e) => onUpdate({ ...point, name: e.target.value })}
            data-testid={`input-point-name-${index}`}
          />
          <Input
            type="number"
            placeholder="Breedtegraad"
            value={point.y}
            onChange={(e) => onUpdate({ ...point, y: parseFloat(e.target.value) || 0 })}
            data-testid={`input-point-y-${index}`}
            step="0.0001"
          />
          <Input
            type="number"
            placeholder="Lengtegraad"
            value={point.x}
            onChange={(e) => onUpdate({ ...point, x: parseFloat(e.target.value) || 0 })}
            data-testid={`input-point-x-${index}`}
            step="0.0001"
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
