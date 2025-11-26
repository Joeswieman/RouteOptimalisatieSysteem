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

  // Batch geocoding met rate limiting
  const batchGeocodeAddresses = async (addresses: string[]): Promise<Map<string, { lat: number; lon: number }>> => {
    const results = new Map<string, { lat: number; lon: number }>();
    const BATCH_SIZE = 10; // Maximaal 10 parallelle requests
    const DELAY_MS = 120; // 120ms tussen batches

    console.log(`🗺️ Geocoding ${addresses.length} unieke adressen (meerdere pogingen)...`);

    for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
      const batch = addresses.slice(i, i + BATCH_SIZE);

      // Parallel geocoden binnen batch, maar per adres meerdere pogingen achter elkaar
      const promises = batch.map(async (address) => {
        // helper to fetch nominatim
        const tryQuery = async (q: string) => {
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
              { headers: { 'User-Agent': 'RouteOptimalisatieSysteem/1.0' } }
            );
            const data = await response.json();
            if (data && data.length > 0) {
              const lat = parseFloat(data[0].lat);
              const lon = parseFloat(data[0].lon);
              if (!isNaN(lat) && !isNaN(lon)) return { lat, lon };
            }
          } catch (e) {
            console.error(`Nominatim fout voor query='${q}':`, e);
          }
          return null;
        };

        try {
          // 1) probeer met countrycode NL
          let coords = await tryQuery(`${address} country:NL`);
          // 2) als geen resultaat, probeer zonder countrycode
          if (!coords) coords = await tryQuery(address);
          // 3) als nog geen resultaat, probeer kortere versie (drop postcode)
          if (!coords) {
            const short = address.split(',').slice(0, 2).join(',');
            coords = await tryQuery(short);
          }
          // 4) als nog geen resultaat, probeer volledig ongebonden query
          if (!coords) coords = await tryQuery(address.replace(/,?\s*Nederland/i, ''));

          if (coords) return { address, coords };
        } catch (error) {
          console.error(`Geocoding fout voor ${address}:`, error);
        }
        // no coords
        return null;
      });

      const batchResults = await Promise.all(promises);
      batchResults.forEach(result => {
        if (result) results.set(result.address, result.coords);
      });

      // Kleine vertraging tussen batches
      if (i + BATCH_SIZE < addresses.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    console.log(`✅ Geocoding voltooid: ${results.size} van ${addresses.length} succesvol`);
    return results;
  };

  const parseXmlAddress = async (xmlText: string): Promise<{ points: Point[]; geocodedCount: number }> => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");

    // Check for parsing errors
    const parseError = xmlDoc.querySelector("parsererror");
    if (parseError) {
      throw new Error("Ongeldig XML-bestand");
    }

    // Tijdvensters per gemeente
    const cityTimeWindows: { [key: string]: string } = {
      'Amsterdam': '7:00-11:30',
      'Rotterdam': '6:00-11:00',
      'Den Haag': '6:00-11:30',
      'Utrecht': '6:00-10:00',
      'Eindhoven': '6:00-11:30',
      'Tilburg': '7:00-11:30',
      'Gouda': '6:00-11:00',
      'Haarlem': '7:00-11:30',
      'Delft': '6:00-11:00',
      'Leiden': '6:00-11:30',
      'Arnhem': '7:00-11:00',
      'Groningen': '7:00-12:00',
      'Maastricht': '7:00-11:30',
      'Zwolle': '6:00-11:00',
      'Amersfoort': '7:00-11:00',
      'Deventer': '6:00-11:00',
      'Enschede': '7:00-11:00',
    };

    const orders = xmlDoc.querySelectorAll("Order");
    console.log(`📦 XML verwerken: ${orders.length} orders gevonden`);
    
    // Eerst alle data verzamelen zonder geocoding
    const pointsData: Array<{
      name: string;
      city: string;
      fullAddress: string;
      loadMeters?: number;
      timeWindow?: string;
    }> = [];
    
    let skippedNoAddressList = 0;
    let skippedNoSecondAddress = 0;
    let skippedEmptyAddress = 0;

    for (const order of Array.from(orders)) {
      // probeer AddressList te vinden, maar fallback op alle Address nodes binnen de order
      const addressList = order.querySelector("AddressList");
      let addresses = addressList ? addressList.querySelectorAll("Address") : order.querySelectorAll("Address");

      // Haal laadmeters op uit de order
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

      // Kies bij voorkeur het tweede adres, maar val terug op het eerste als er maar één is
      let chosenAddress: Element | null = null;
      if (addresses && addresses.length >= 2) {
        chosenAddress = addresses[1];
      } else if (addresses && addresses.length === 1) {
        chosenAddress = addresses[0];
      }

      // Als er geen Address nodes zijn: probeer generieke velden (AddressLine/AddressText)
      if (!chosenAddress) {
        const anyAddr = order.querySelector("Address") || order.querySelector("AddressLine") || order.querySelector("AddressText");
        if (anyAddr) chosenAddress = anyAddr;
      }

      if (!chosenAddress) {
        // geen adresinformatie, log en voeg een placeholder entry zodat orders niet verloren gaan
        console.warn(`⚠️ Order zonder adresseerbare velden gevonden; invoegen als lege stop`);
        pointsData.push({
          name: "Onbekend adres",
          city: "",
          fullAddress: "",
          loadMeters,
          timeWindow: undefined,
        });
        continue;
      }

      // Probeer gestructureerde velden eerst
      const street = chosenAddress.querySelector("Street")?.textContent?.trim() || "";
      const houseNumber = chosenAddress.querySelector("HouseNumber")?.textContent?.trim() || "";
      const city = chosenAddress.querySelector("City")?.textContent?.trim() || "";
      const zipCode = chosenAddress.querySelector("Zip")?.textContent?.trim() || "";

      // Als straat of stad ontbreekt, bouw fullAddress uit de volledige tekst van het address-element
      let name = `${street} ${houseNumber}`.trim();
      let fullAddress = `${street} ${houseNumber}, ${zipCode} ${city}, Nederland`.trim();
      if ((!street || !city) && chosenAddress.textContent) {
        const fallback = chosenAddress.textContent.split(/\n|\r|;/).map(s => s.trim()).filter(Boolean).join(', ');
        name = name || fallback;
        fullAddress = fullAddress || (fallback ? `${fallback}, Nederland` : "");
      }

      const timeWindow = cityTimeWindows[city] || undefined;

      pointsData.push({
        name: name || "Onbekend adres",
        city: city || "",
        fullAddress: fullAddress || "",
        loadMeters,
        timeWindow,
      });
    }

    console.log(`📊 Parsing resultaat: ${pointsData.length} stops verzameld (geen strikte filtering toegepast)`);

    // Nu batch geocoding voor alle adressen
    const uniqueAddresses = Array.from(new Set(pointsData.map(p => p.fullAddress)));
    console.log(`📍 Totaal ${pointsData.length} stops uit ${uniqueAddresses.length} unieke adressen`);
    
    const geocodedAddresses = await batchGeocodeAddresses(uniqueAddresses);

    // Converteer naar Point objecten - incl. punten zonder geocode (x/y = 0)
    const points: Point[] = [];
    let geocodedCount = 0;

    for (const data of pointsData) {
      const coords = geocodedAddresses.get(data.fullAddress);
      if (coords) geocodedCount++;
      points.push({
        id: Math.random().toString(36).substr(2, 9),
        name: data.name,
        city: data.city,
        x: coords ? coords.lon : 0,
        y: coords ? coords.lat : 0,
        loadMeters: data.loadMeters,
        timeWindow: data.timeWindow,
      });
    }

    console.log(`✅ ${points.length} punten verzameld, ${geocodedCount} succesvol geocodeerd`);
    return { points, geocodedCount };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      const text = await file.text();
      const { points, geocodedCount } = await parseXmlAddress(text);

      if (points.length === 0) {
        toast({
          title: "Geen adressen gevonden",
          description: "Controleer of het XML-bestand geldige adressen bevat in Nederland",
          variant: "destructive",
        });
        return;
      }

      onImportPoints(points);
      
      toast({
        title: "Import geslaagd!",
        description: `${points.length} stop${points.length === 1 ? '' : 's'} geïmporteerd (${geocodedCount} succesvol geocodeerd)`,
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
              Adressen worden automatisch geocodeerd. Alleen adressen in Nederland worden geïmporteerd.
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
