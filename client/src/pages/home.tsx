import { useState } from "react";
import { Plus, Route as RouteIcon, Trash2, MapPinned } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PointInput, Point } from "@/components/PointInput";
import { RouteResult } from "@/components/RouteResult";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MapView } from "@/components/MapView";
import { LocationSearch } from "@/components/LocationSearch";
import { Card } from "@/components/ui/card";
import { calculateOptimalRoute, calculateOptimalRoutes } from "@/lib/routing";
import { VEHICLE_COLORS } from "@/lib/colors";
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
  const [multiRoutes, setMultiRoutes] = useState<any[] | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][][]>([]);
  const [vehicleGeometries, setVehicleGeometries] = useState<[number, number][][][] | null>(null);
  const [showLegendOverlay, setShowLegendOverlay] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [vehicleCount, setVehicleCount] = useState<number>(1);
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
      // validate coordinates
      const invalid = points.find(p => !Number.isFinite(p.x) || !Number.isFinite(p.y));
      if (invalid) {
        throw new Error('Controleer punten: alle coördinaten moeten geldige getallen zijn (gebruik "." als decimaal).');
      }
      // If user requested multiple vehicles, use the multi-vehicle solver
      if (vehicleCount > 1) {
        const multi = await calculateOptimalRoutes([...points], vehicleCount, START_END_LOCATION);
        const endTime = performance.now();

        setMultiRoutes(multi.routes);
        setOptimizedRoute(null);
        setVehicleGeometries(multi.routes.map(r => r.geometry));
        setRouteGeometry([]);
        setTotalDistance(multi.totalDistance);
        setTotalDuration(multi.totalDuration);
        setCalculationTime(Math.round(endTime - startTime));
        toast({
          title: `Rondrit berekend voor ${vehicleCount} voertuigen`,
          description: `${multi.totalDistance.toFixed(1)} km • gemiddelde tijd: ${Math.round(multi.meanDuration/60)} min`,
        });
      } else {
        const result = await calculateOptimalRoute([...points], START_END_LOCATION);
        const endTime = performance.now();

        setOptimizedRoute(result.route);
        setMultiRoutes(null);
        setRouteGeometry(result.geometry);
  setVehicleGeometries(null);
        setTotalDistance(result.totalDistance);
        setTotalDuration(result.totalDuration);
        setCalculationTime(Math.round(endTime - startTime));
        const durationMinutes = Math.round(result.totalDuration / 60);
        toast({
          title: "Rondrit berekend!",
          description: `${result.totalDistance.toFixed(1)} km • ${durationMinutes} min • Start & eind: ${START_END_LOCATION.name}`,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Route calculation error:', error);
      toast({
        title: "Fout bij berekenen",
        description: message || "Er ging iets mis bij het berekenen van de route",
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
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Voertuigen</label>
                  <input
                    type="number"
                    min={1}
                    value={vehicleCount}
                    onChange={(e) => setVehicleCount(Math.max(1, parseInt(e.target.value || '1', 10)))}
                    className="w-20 px-2 py-1 border rounded"
                    data-testid="input-vehicle-count"
                  />
                </div>
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
            {multiRoutes && (
              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-medium">Resultaten per voertuig</h3>
                <div className="flex items-center justify-between">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                    {multiRoutes.map((r, i) => (
                      <div
                        key={`legend-${i}`}
                        className={`flex items-center gap-3 p-2 border rounded cursor-pointer ${selectedVehicle === i ? 'bg-muted/20 border-primary' : ''}`}
                        onMouseEnter={() => setSelectedVehicle(i)}
                        onMouseLeave={() => setSelectedVehicle(null)}
                        onClick={() => setSelectedVehicle(selectedVehicle === i ? null : i)}
                      >
                        <div style={{ width: 16, height: 16, background: VEHICLE_COLORS[i % VEHICLE_COLORS.length], borderRadius: 4 }} />
                        <div>
                          <div className="text-sm font-medium">Voertuig {i + 1}</div>
                          <div className="text-xs text-muted-foreground">{r.totalDistance?.toFixed?.(1) ?? 0} km • {Math.round((r.totalDuration ?? 0)/60)} min</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="ml-4">
                    <button
                      className="px-3 py-1 border rounded bg-background/80"
                      onClick={() => setShowLegendOverlay(v => !v)}
                      data-testid="button-toggle-legend"
                    >
                      {showLegendOverlay ? 'Verberg legenda' : 'Toon legenda op kaart'}
                    </button>
                  </div>
                </div>
                {multiRoutes.map((r, i) => (
                  <div key={i}>
                    <Card className="p-4">
                      <h4 className="font-medium mb-2">Voertuig {i + 1}</h4>
                      <RouteResult
                        optimizedRoute={r.route}
                        totalDistance={r.totalDistance}
                        totalDuration={r.totalDuration}
                        calculationTime={calculationTime}
                      />
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:sticky lg:top-24 h-[500px] lg:h-[calc(100vh-8rem)]">
            <MapView 
              points={[...points, START_END_LOCATION]} 
              route={optimizedRoute}
              routeGeometry={routeGeometry}
              vehicleGeometries={vehicleGeometries}
              selectedVehicle={selectedVehicle}
              onHoverVehicle={setSelectedVehicle}
              showLegendOverlay={showLegendOverlay}
              onMapClick={addPointFromMap}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
