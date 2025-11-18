import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoveRight, CheckCircle2 } from "lucide-react";
import { Point } from "./PointInput";
import { useMemo, useState } from "react";

interface RouteResultProps {
  optimizedRoute: Point[];
  totalDistance: number;
  totalDuration?: number;
  segments?: { distance: number; duration: number; coordinates: [number, number][] }[];
  calculationTime: number;
}

export function RouteResult({ optimizedRoute, totalDistance, totalDuration, segments, calculationTime }: RouteResultProps) {
  const durationMinutes = totalDuration ? Math.round(totalDuration / 60) : 0;
  const [departure, setDeparture] = useState<string>(() => {
    // create a local datetime-local string: YYYY-MM-DDTHH:mm
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  const { arrivalString, departureString, perStopArrivals } = useMemo(() => {
    let depStr = "";
    let arrStr = "";
    const arrivals: (string | null)[] = [];
    try {
      // HTML datetime-local produces a string like 'YYYY-MM-DDTHH:mm' which is parsed as local time
      const depDate = new Date(departure);
      if (!isNaN(depDate.getTime())) {
        depStr = depDate.toLocaleString("nl-NL", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        if (totalDuration && totalDuration > 0) {
          const arrDate = new Date(depDate.getTime() + totalDuration * 1000);
          arrStr = arrDate.toLocaleString("nl-NL", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        }

        // compute per-stop arrivals if segments available
        if (segments && segments.length > 0) {
          // arrival at point 0 is departure
          for (let i = 0; i < optimizedRoute.length; i++) {
            if (i === 0) {
              arrivals.push(depDate.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }));
            } else {
              // sum durations of segments 0..i-1
              let seconds = 0;
              for (let s = 0; s < i; s++) {
                if (segments[s]) seconds += segments[s].duration || 0;
              }
              const arrDate = new Date(depDate.getTime() + seconds * 1000);
              arrivals.push(arrDate.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }));
            }
          }
        } else {
          // if no segments, but totalDuration exists, we can show only final arrival
          for (let i = 0; i < optimizedRoute.length; i++) arrivals.push(null);
        }
      }
    } catch (e) {
      // ignore parse errors, leave strings empty
    }
    return { arrivalString: arrStr, departureString: depStr, perStopArrivals: arrivals };
  }, [departure, totalDuration, segments, optimizedRoute]);
  
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-5 w-5 text-chart-2" />
          <h3 className="text-xl font-medium">Route Berekend</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-start">
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
          {/* Vertrektijd invoer */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">Gewenste Vertrektijd</p>
            <div className="flex items-center gap-2">
              <input
                aria-label="Gewenste vertrektijd"
                data-testid="input-departure"
                type="datetime-local"
                value={departure}
                onChange={(e) => setDeparture(e.target.value)}
                className="h-10 px-3 rounded-md border border-muted-foreground/20 bg-background text-sm font-mono w-full max-w-[220px]"
              />
            </div>
            {departureString && (
              <p className="text-xs text-muted-foreground mt-1">{departureString}</p>
            )}
          </div>
          {/* Aankomsttijd weergave */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">Geschatte Aankomst</p>
            <p className="text-lg font-semibold text-foreground" data-testid="text-arrival-time">
              {arrivalString || "-"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">(vertrek + route duur)</p>
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
                  {perStopArrivals && perStopArrivals[index] && (
                    <p className="text-xs text-muted-foreground mt-1">Aankomst: <span className="font-mono">{perStopArrivals[index]}</span></p>
                  )}
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
