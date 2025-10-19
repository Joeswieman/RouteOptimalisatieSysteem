import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoveRight, CheckCircle2 } from "lucide-react";
import { Point } from "./PointInput";

interface RouteResultProps {
  optimizedRoute: Point[];
  totalDistance: number;
  totalDuration?: number;
  calculationTime: number;
}

export function RouteResult({ optimizedRoute, totalDistance, totalDuration, calculationTime }: RouteResultProps) {
  const durationMinutes = totalDuration ? Math.round(totalDuration / 60) : 0;
  
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-5 w-5 text-chart-2" />
          <h3 className="text-xl font-medium">Route Berekend</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Stops</p>
            <p className="text-2xl font-semibold" data-testid="text-stop-count">
              {optimizedRoute.length}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Afstand</p>
            <p className="text-2xl font-semibold font-mono" data-testid="text-total-distance">
              {totalDistance.toFixed(1)} km
            </p>
          </div>
          {totalDuration && totalDuration > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Tijd</p>
              <p className="text-2xl font-semibold font-mono" data-testid="text-duration">
                {durationMinutes} min
              </p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground mb-1">Berekend</p>
            <p className="text-2xl font-semibold font-mono" data-testid="text-calculation-time">
              {calculationTime}ms
            </p>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        <h3 className="text-lg font-medium">Optimale Volgorde</h3>
        {optimizedRoute.map((point, index) => (
          <div key={point.id}>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="w-8 h-8 rounded-full flex items-center justify-center p-0">
                  {index + 1}
                </Badge>
                <div className="flex-1">
                  <p className="font-medium" data-testid={`text-route-point-name-${index}`}>
                    {point.name || `Punt ${index + 1}`}
                  </p>
                  <p className="text-sm text-muted-foreground font-mono" data-testid={`text-route-point-coords-${index}`}>
                    {point.y.toFixed(4)}°N, {point.x.toFixed(4)}°E
                  </p>
                </div>
                {index < optimizedRoute.length - 1 && (
                  <div className="text-muted-foreground" data-testid={`text-distance-${index}`}>
                    <span className="font-mono text-sm">
                      {calculateDistance(point, optimizedRoute[index + 1]).toFixed(2)} km
                    </span>
                  </div>
                )}
              </div>
            </Card>
            {index < optimizedRoute.length - 1 && (
              <div className="flex justify-center py-2">
                <MoveRight className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function calculateDistance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}
