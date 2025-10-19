import { useState, useEffect } from "react";
import { Search, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { searchLocation, GeocodingResult } from "@/lib/geocoding";
import { useDebounce } from "@/hooks/use-debounce";

interface LocationSearchProps {
  onSelectLocation: (name: string, lat: number, lon: number) => void;
}

export function LocationSearch({ onSelectLocation }: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    if (debouncedQuery.length >= 3) {
      setIsSearching(true);
      searchLocation(debouncedQuery)
        .then((locations) => {
          setResults(locations);
          setIsSearching(false);
        })
        .catch(() => {
          setResults([]);
          setIsSearching(false);
        });
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

  const handleSelect = (result: GeocodingResult) => {
    onSelectLocation(result.name, result.lat, result.lon);
    setQuery("");
    setResults([]);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Zoek locatie in Nederland..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
          data-testid="input-location-search"
        />
      </div>

      {results.length > 0 && (
        <Card className="absolute z-10 w-full mt-2 p-2 max-h-60 overflow-y-auto">
          {results.map((result, index) => (
            <button
              key={index}
              className="w-full text-left p-2 rounded-md hover-elevate active-elevate-2 flex items-start gap-2"
              onClick={() => handleSelect(result)}
              data-testid={`button-location-result-${index}`}
            >
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{result.name}</p>
                <p className="text-sm text-muted-foreground truncate">{result.displayName}</p>
              </div>
            </button>
          ))}
        </Card>
      )}

      {isSearching && query.length >= 3 && (
        <div className="absolute z-10 w-full mt-2">
          <Card className="p-3 text-center text-sm text-muted-foreground">
            Zoeken...
          </Card>
        </div>
      )}
    </div>
  );
}
