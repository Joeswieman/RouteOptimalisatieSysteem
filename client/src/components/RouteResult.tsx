import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoveRight, CheckCircle2, Clock } from "lucide-react";
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
    // create a local datetime-local string: YYYY-MM-DDTHH:mm - default to tomorrow at 07:00
    const d = new Date();
    d.setDate(d.getDate() + 1); // tomorrow
    d.setHours(7, 0, 0, 0); // 07:00
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  const { arrivalString, departureString, departureTime, departureDate, arrivalTime, arrivalDate, perStopArrivals } = useMemo(() => {
    let depStr = "";
    let arrStr = "";
    let depTime = "";
    let depDate = "";
    let arrTime = "";
    let arrDate = "";
    const arrivals: (string | null)[] = [];
    try {
      // HTML datetime-local produces a string like 'YYYY-MM-DDTHH:mm' which is parsed as local time
      const depDateObj = new Date(departure);
      if (!isNaN(depDateObj.getTime())) {
        depStr = depDateObj.toLocaleString("nl-NL", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        depTime = depDateObj.toLocaleString("nl-NL", {
          hour: "2-digit",
          minute: "2-digit",
        });
        depDate = depDateObj.toLocaleString("nl-NL", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

        if (totalDuration && totalDuration > 0) {
          // Add 10 minutes service time per stop (exclude start point, so length - 1)
          const serviceTime = (optimizedRoute.length - 1) * 600; // 10 min = 600 sec
          const arrDateObj = new Date(depDateObj.getTime() + (totalDuration + serviceTime) * 1000);
          arrStr = arrDateObj.toLocaleString("nl-NL", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
          arrTime = arrDateObj.toLocaleString("nl-NL", {
            hour: "2-digit",
            minute: "2-digit",
          });
          arrDate = arrDateObj.toLocaleString("nl-NL", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
        }

        // compute per-stop arrivals if segments available
        if (segments && segments.length > 0) {
          // arrival at point 0 is departure
          for (let i = 0; i < optimizedRoute.length; i++) {
            if (i === 0) {
              arrivals.push(depDateObj.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }));
            } else {
              // sum durations of segments 0..i-1 + 10 minutes per previous stop
              let seconds = 0;
              for (let s = 0; s < i; s++) {
                if (segments[s]) seconds += segments[s].duration || 0;
              }
              // Add 10 minutes (600 seconds) service time for each previous stop
              seconds += (i * 600);
              const arrDateObj = new Date(depDateObj.getTime() + seconds * 1000);
              arrivals.push(arrDateObj.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }));
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
    return { arrivalString: arrStr, departureString: depStr, departureTime: depTime, departureDate: depDate, arrivalTime: arrTime, arrivalDate: arrDate, perStopArrivals: arrivals };
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
            {departureTime && (
              <>
                <p className="text-lg font-semibold text-foreground mt-1">{departureTime}</p>
                <p className="text-xs text-muted-foreground">{departureDate}</p>
              </>
            )}
          </div>
          {/* Aankomsttijd weergave */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">Terug op Depot</p>
            {arrivalTime ? (
              <>
                <p className="text-lg font-semibold text-foreground" data-testid="text-arrival-time">
                  {arrivalTime}
                </p>
                <p className="text-xs text-muted-foreground">{arrivalDate}</p>
                <p className="text-xs text-muted-foreground">(incl. servicetijd)</p>
              </>
            ) : (
              <p className="text-lg font-semibold text-foreground" data-testid="text-arrival-time">-</p>
            )}
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        <h3 className="text-lg font-medium">Optimale Volgorde</h3>
        {optimizedRoute.map((point, index) => {
          // Skip tussenliggende start-end punten (toon alleen eerste en laatste)
          const isStartEnd = point.id === 'start-end';
          if (isStartEnd && index > 0 && index < optimizedRoute.length - 1) {
            return null; // Skip tussenliggende depot stops
          }
          
          // Check if arrival time is within time window
          const arrivalTime = perStopArrivals && perStopArrivals[index] ? perStopArrivals[index] : null;
          let isWithinWindow = true;
          let isTimedDelivery = false;
          
          if (point.timeWindow && arrivalTime) {
            isTimedDelivery = true;
            const windowMatch = point.timeWindow.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
            if (windowMatch) {
              const [_, startHour, startMin, endHour, endMin] = windowMatch;
              const arrivalMatch = arrivalTime.match(/(\d{1,2}):(\d{2})/);
              if (arrivalMatch) {
                const [__, arrHour, arrMin] = arrivalMatch;
                const arrivalMinutes = parseInt(arrHour) * 60 + parseInt(arrMin);
                const windowStart = parseInt(startHour) * 60 + parseInt(startMin);
                const windowEnd = parseInt(endHour) * 60 + parseInt(endMin);
                isWithinWindow = arrivalMinutes >= windowStart && arrivalMinutes <= windowEnd;
              }
            }
          }
          
          return (
            <div key={point.id}>
              <Card className={`p-4 ${!isWithinWindow ? 'border-orange-500 border-2' : ''}`}>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="w-8 h-8 rounded-full flex items-center justify-center p-0">
                    {index + 1}
                  </Badge>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium" data-testid={`text-route-point-name-${index}`}>
                        {point.city && <span className="text-muted-foreground">{point.city} - </span>}
                        {point.name || `Punt ${index + 1}`}
                      </p>
                      {isTimedDelivery && (
                        <Clock className={`h-4 w-4 ${!isWithinWindow ? 'text-orange-500' : 'text-blue-500'}`} />
                      )}
                    </div>
                    {point.timeWindow && (
                      <p className={`text-xs mt-1 ${!isWithinWindow ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>
                        Venster: {point.timeWindow} {!isWithinWindow && '⚠️ Buiten tijdvenster!'}
                      </p>
                    )}
                  </div>
                  {perStopArrivals && perStopArrivals[index] && (
                    <div className="text-muted-foreground" data-testid={`text-arrival-${index}`}>
                      <span className="font-mono text-sm">
                        {perStopArrivals[index]}
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
          );
        })}
      </div>
    </div>
  );
}

function calculateDistance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}
