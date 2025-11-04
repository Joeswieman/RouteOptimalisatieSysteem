import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { Point } from "./PointInput";
import { useToast } from "@/hooks/use-toast";

interface XmlImporterProps {
  onImportPoints: (points: Point[]) => void;
}

export function XmlImporter({ onImportPoints }: XmlImporterProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const parseXmlAddress = async (xmlText: string): Promise<Point[]> => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");

    // Check for parsing errors
    const parseError = xmlDoc.querySelector("parsererror");
    if (parseError) {
      throw new Error("Ongeldig XML-bestand");
    }

    const orders = xmlDoc.querySelectorAll("Order");
    const points: Point[] = [];

    for (const order of Array.from(orders)) {
      const addressList = order.querySelector("AddressList");
      if (!addressList) continue;

      const addresses = addressList.querySelectorAll("Address");
      
      // Haal laadmeters op uit de order (zoek in verschillende mogelijke velden)
      let loadMeters: number | undefined;
      const loadMeterFields = ['LoadMeters', 'Laadmeters', 'Volume', 'LoadingMeters', 'LM'];
      
      for (const fieldName of loadMeterFields) {
        const field = order.querySelector(fieldName);
        if (field && field.textContent) {
          const value = parseFloat(field.textContent.replace(',', '.'));
          if (!isNaN(value)) {
            loadMeters = value;
            break;
          }
        }
      }
      
      // We nemen het tweede Address element (index 1) zoals gevraagd
      if (addresses.length >= 2) {
        const secondAddress = addresses[1];
        
        // Haal straatnaam en nummer op (tweede regel van address)
        const street = secondAddress.querySelector("Street")?.textContent || "";
        const houseNumber = secondAddress.querySelector("HouseNumber")?.textContent || "";
        const city = secondAddress.querySelector("City")?.textContent || "";
        const zipCode = secondAddress.querySelector("Zip")?.textContent || "";
        
        // Combineer voor naam
        const name = `${street} ${houseNumber}, ${city}`.trim();
        const fullAddress = `${street} ${houseNumber}, ${zipCode} ${city}, Nederland`.trim();

        // Geocodeer het adres om coördinaten te krijgen
        try {
          const coords = await geocodeAddress(fullAddress);
          if (coords) {
            points.push({
              id: Math.random().toString(36).substr(2, 9),
              name: name,
              x: coords.lon,
              y: coords.lat,
              loadMeters: loadMeters,
            });
          }
        } catch (error) {
          console.error(`Kon adres niet geocoderen: ${fullAddress}`, error);
          // Voeg toe zonder coördinaten (gebruiker kan handmatig aanpassen)
          points.push({
            id: Math.random().toString(36).substr(2, 9),
            name: name,
            x: 0,
            y: 0,
            loadMeters: loadMeters,
          });
        }
      }
    }

    return points;
  };

  const geocodeAddress = async (address: string): Promise<{ lat: number; lon: number } | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
        };
      }
    } catch (error) {
      console.error("Geocoding fout:", error);
    }
    return null;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      const text = await file.text();
      const points = await parseXmlAddress(text);

      if (points.length === 0) {
        toast({
          title: "Geen adressen gevonden",
          description: "Het XML-bestand bevat geen geldige Order/Address elementen",
          variant: "destructive",
        });
        return;
      }

      onImportPoints(points);
      
      toast({
        title: "Import geslaagd!",
        description: `${points.length} ${points.length === 1 ? 'adres' : 'adressen'} geïmporteerd uit XML`,
      });
    } catch (error) {
      console.error("XML import fout:", error);
      toast({
        title: "Import mislukt",
        description: error instanceof Error ? error.message : "Kon XML-bestand niet verwerken",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      // Reset input zodat hetzelfde bestand opnieuw geüpload kan worden
      event.target.value = "";
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium mb-1">Importeer uit XML</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Upload een XML-bestand met orders. Het tweede adres van elke order wordt als stop toegevoegd.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".xml,text/xml,application/xml"
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="hidden"
              id="xml-upload"
            />
            <label htmlFor="xml-upload">
              <Button
                variant="outline"
                disabled={isProcessing}
                asChild
              >
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  {isProcessing ? "Verwerken..." : "Selecteer XML-bestand"}
                </span>
              </Button>
            </label>
          </div>
          <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>
              Adressen worden automatisch geocodeerd. Dit kan even duren voor grote bestanden.
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
