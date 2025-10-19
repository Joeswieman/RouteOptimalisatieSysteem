import { useState } from "react";
import { Plus, Route as RouteIcon, Trash2, MapPinned } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PointInput, Point } from "@/components/PointInput";
import { RouteResult } from "@/components/RouteResult";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MapView } from "@/components/MapView";
import { LocationSearch } from "@/components/LocationSearch";
import { Card } from "@/components/ui/card";
import { calculateOptimalRoute } from "@/lib/routing";
import { useToast } from "@/hooks/use-toast";

const START_END_LOCATION: Point = {
  id: 'start-end',
  name: "Wickenburghseweg 75, 't Goy",
  x: 5.2198,
  y: 51.9845
};

export default function Home() {
  const [points, setPoints] = useState<Point[]>([]);
  const [optimizedRoute, setOptimizedRoute] = useState<Point[] | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][][]>([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [calculationTime, setCalculationTime] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const { toast } = useToast();

  const addPoint = () => {
    const newPoint: Point = {
      id: Math.random().toString(36).substr(2, 9),
      name: "",
      x: 5.2913,
      y: 52.1326,
    };
    setPoints([...points, newPoint]);
  };

  const addPointFromLocation = (name: string, lat: number, lon: number) => {
    const newPoint: Point = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      x: lon,
      y: lat,
    };
    setPoints([...points, newPoint]);
    toast({
      title: "Locatie toegevoegd",
      description: `${name} is toegevoegd aan de route`,
    });
  };

  const addPointFromMap = (lat: number, lng: number) => {
    const newPoint: Point = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Punt ${points.length + 1}`,
      x: lng,
      y: lat,
    };
    setPoints([...points, newPoint]);
    toast({
      title: "Punt toegevoegd",
      description: `Nieuwe locatie toegevoegd via kaart`,
    });
  };

  const updatePoint = (index: number, updatedPoint: Point) => {
    const newPoints = [...points];
    newPoints[index] = updatedPoint;
    setPoints(newPoints);
  };

  const removePoint = (index: number) => {
    setPoints(points.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setPoints([]);
    setOptimizedRoute(null);
  };

  const calculateRoute = async () => {
    setIsCalculating(true);
    const startTime = performance.now();

    try {
      const result = await calculateOptimalRoute([...points], START_END_LOCATION);
      const endTime = performance.now();

      setOptimizedRoute(result.route);
      setRouteGeometry(result.geometry);
      setTotalDistance(result.totalDistance);
      setTotalDuration(result.totalDuration);
      setCalculationTime(Math.round(endTime - startTime));
      
      const durationMinutes = Math.round(result.totalDuration / 60);
      toast({
        title: "Rondrit berekend!",
        description: `${result.totalDistance.toFixed(1)} km • ${durationMinutes} min • Start & eind: ${START_END_LOCATION.name}`,
      });
    } catch (error) {
      toast({
        title: "Fout bij berekenen",
        description: "Er ging iets mis bij het berekenen van de route",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
                <MapPinned className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Routeplanner</h1>
                <p className="text-xs text-muted-foreground">Nederland Routes</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 max-w-7xl py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Punten Beheren</h2>
              <p className="text-muted-foreground mb-3">
                Zoek locaties, klik op de kaart of voer coördinaten in
              </p>
              <Card className="p-4 bg-primary/5 border-primary/20">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    S/E
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Start & Eindpunt (vast)</p>
                    <p className="text-sm text-muted-foreground">{START_END_LOCATION.name}</p>
                  </div>
                </div>
              </Card>
            </div>

            <LocationSearch onSelectLocation={addPointFromLocation} />

            <div className="space-y-3">
              {points.length === 0 ? (
                <Card className="p-8 text-center">
                  <MapPinned className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    Nog geen punten toegevoegd
                  </p>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Zoek een locatie hierboven, of klik op de kaart
                    </p>
                    <Button onClick={addPoint} data-testid="button-add-first-point">
                      <Plus className="h-4 w-4 mr-2" />
                      Handmatig Punt Toevoegen
                    </Button>
                  </div>
                </Card>
              ) : (
                <>
                  {points.map((point, index) => (
                    <PointInput
                      key={point.id}
                      point={point}
                      index={index}
                      onUpdate={(p) => updatePoint(index, p)}
                      onRemove={() => removePoint(index)}
                    />
                  ))}
                </>
              )}
            </div>

            {points.length > 0 && (
              <div className="flex gap-3 flex-wrap">
                <Button onClick={addPoint} variant="outline" data-testid="button-add-point">
                  <Plus className="h-4 w-4 mr-2" />
                  Punt Toevoegen
                </Button>
                <Button
                  onClick={calculateRoute}
                  disabled={points.length < 1 || isCalculating}
                  data-testid="button-calculate-route"
                >
                  <RouteIcon className="h-4 w-4 mr-2" />
                  {isCalculating ? "Berekenen..." : "Bereken Rondrit"}
                </Button>
                <Button
                  onClick={clearAll}
                  variant="ghost"
                  data-testid="button-clear-all"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Wis Alles
                </Button>
              </div>
            )}

            {optimizedRoute && (
              <div className="mt-6">
                <RouteResult
                  optimizedRoute={optimizedRoute}
                  totalDistance={totalDistance}
                  totalDuration={totalDuration}
                  calculationTime={calculationTime}
                />
              </div>
            )}
          </div>

          <div className="lg:sticky lg:top-24 h-[500px] lg:h-[calc(100vh-8rem)]">
            <MapView 
              points={[...points, START_END_LOCATION]} 
              route={optimizedRoute}
              routeGeometry={routeGeometry}
              onMapClick={addPointFromMap}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
