import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Truck } from "lucide-react";
import { VEHICLE_TYPES, VehicleType } from "@/lib/vehicles";

interface VehicleSelectorProps {
  selectedVehicles: Map<string, number>;
  onVehicleChange: (vehicleId: string, count: number) => void;
}

export function VehicleSelector({ selectedVehicles, onVehicleChange }: VehicleSelectorProps) {
  const getTotalVehicles = () => {
    return Array.from(selectedVehicles.values()).reduce((sum, count) => sum + count, 0);
  };

  const getTotalCapacity = () => {
    return Array.from(selectedVehicles.entries()).reduce((sum, [id, count]) => {
      const vehicle = VEHICLE_TYPES.find(v => v.id === id);
      return sum + (vehicle ? vehicle.capacity * count : 0);
    }, 0);
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Truck className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium mb-1">Voertuigen Selecteren</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Kies hoeveel voertuigen van elk type je wilt inzetten
          </p>
          
          <div className="space-y-3">
            {VEHICLE_TYPES.map((vehicle) => {
              const count = selectedVehicles.get(vehicle.id) || 0;
              return (
                <div key={vehicle.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: vehicle.color }}
                    />
                    <div>
                      <div className="font-medium text-sm">{vehicle.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {vehicle.capacity} laadmeters
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onVehicleChange(vehicle.id, Math.max(0, count - 1))}
                      disabled={count === 0}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-medium">{count}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onVehicleChange(vehicle.id, count + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {getTotalVehicles() > 0 && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Totaal voertuigen:</span>
                <span className="font-medium">{getTotalVehicles()}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Totale capaciteit:</span>
                <span className="font-medium">{getTotalCapacity().toFixed(1)} laadmeters</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
