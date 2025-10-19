import { Point } from "@/components/PointInput";

export interface RouteSegment {
  distance: number;
  duration: number;
  coordinates: [number, number][];
}

export interface RouteResult {
  route: Point[];
  totalDistance: number;
  totalDuration: number;
  segments: RouteSegment[];
  geometry: [number, number][][];
}

export async function calculateOptimalRoute(
  points: Point[], 
  startEndPoint?: Point
): Promise<RouteResult> {
  if (points.length < 2 && !startEndPoint) {
    throw new Error('Minimaal 2 punten nodig');
  }

  let routePoints = [...points];
  
  if (startEndPoint) {
    const otherPoints = points.filter(p => p.id !== startEndPoint.id);
    const optimizedMiddle = optimizeRouteOrder(otherPoints, startEndPoint);
    routePoints = [startEndPoint, ...optimizedMiddle, startEndPoint];
  } else {
    routePoints = optimizeRouteOrder([...points]);
  }
  
  let totalDistance = 0;
  let totalDuration = 0;
  const segments: RouteSegment[] = [];
  const geometry: [number, number][][] = [];

  for (let i = 0; i < routePoints.length - 1; i++) {
    const from = routePoints[i];
    const to = routePoints[i + 1];
    
    try {
      const routeData = await calculateRoadRoute(from, to);
      
      totalDistance += routeData.distance;
      totalDuration += routeData.duration;
      
      segments.push({
        distance: routeData.distance,
        duration: routeData.duration,
        coordinates: routeData.coordinates
      });
      
      geometry.push(routeData.coordinates);
    } catch (error) {
      console.error('Road routing failed, falling back to straight line:', error);
      const distance = calculateHaversineDistance(
        from.y, from.x,
        to.y, to.x
      );
      
      totalDistance += distance;
      totalDuration += (distance / 60) * 60;
      
      const straightLine: [number, number][] = [[from.y, from.x], [to.y, to.x]];
      segments.push({
        distance,
        duration: (distance / 60) * 60,
        coordinates: straightLine
      });
      geometry.push(straightLine);
    }
  }

  return {
    route: routePoints,
    totalDistance,
    totalDuration,
    segments,
    geometry
  };
}

async function calculateRoadRoute(from: Point, to: Point): Promise<{
  distance: number;
  duration: number;
  coordinates: [number, number][];
}> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.x},${from.y};${to.x},${to.y}?overview=full&geometries=geojson`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Routing API request failed');
  }
  
  const data = await response.json();
  
  if (!data.routes || data.routes.length === 0) {
    throw new Error('No route found');
  }
  
  const route = data.routes[0];
  
  const coordinates: [number, number][] = route.geometry.coordinates.map(
    (coord: [number, number]) => [coord[1], coord[0]]
  );
  
  return {
    distance: route.distance / 1000,
    duration: route.duration,
    coordinates
  };
}

function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function optimizeRouteOrder(points: Point[], startPoint?: Point): Point[] {
  if (points.length === 0) return [];
  if (points.length === 1) return points;

  const unvisited = [...points];
  const route: Point[] = [];
  
  let current = startPoint || unvisited.shift()!;
  if (!startPoint) {
    route.push(current);
  }

  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const distance = calculateHaversineDistance(
        current.y, current.x,
        unvisited[i].y, unvisited[i].x
      );
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    current = unvisited.splice(nearestIndex, 1)[0];
    route.push(current);
  }

  return route;
}
