export interface GeocodingResult {
  name: string;
  lat: number;
  lon: number;
  displayName: string;
}

export async function searchLocation(query: string): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 3) {
    return [];
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}&` +
      `format=json&` +
      `limit=5&` +
      `countrycodes=nl&` +
      `addressdetails=1`,
      {
        headers: {
          'User-Agent': 'RoutePlannerApp/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data = await response.json();
    
    return data.map((item: any) => ({
      name: item.name || item.display_name.split(',')[0],
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      displayName: item.display_name
    }));
  } catch (error) {
    console.error('Geocoding error:', error);
    return [];
  }
}
