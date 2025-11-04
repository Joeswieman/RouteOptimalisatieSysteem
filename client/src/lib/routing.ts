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

export interface MultiRouteResult {
  routes: RouteResult[];
  totalDistance: number;
  totalDuration: number;
  meanDuration: number;
  vehicleLoads?: number[]; // laadmeters per voertuig
}

export async function calculateOptimalRoutes(
  points: Point[],
  vehicleCount: number,
  startEndPoint?: Point
): Promise<MultiRouteResult> {
  // clamp vehicleCount
  const k = Math.max(1, Math.floor(vehicleCount || 1));

  if (points.length === 0) {
    return {
      routes: [],
      totalDistance: 0,
      totalDuration: 0,
      meanDuration: 0,
    };
  }

  // If only one vehicle, reuse single-vehicle solver
  if (k === 1) {
    const single = await calculateOptimalRoute(points, startEndPoint);
    return {
      routes: [single],
      totalDistance: single.totalDistance,
      totalDuration: single.totalDuration,
      meanDuration: single.totalDuration,
    };
  }

  // Simple k-means clustering on coordinates (lon=x, lat=y)
  const pts = points.map((p) => ({ x: p.x, y: p.y, id: p.id }));
  const centroids: { x: number; y: number }[] = [];
  for (let i = 0; i < Math.min(k, pts.length); i++) {
    centroids.push({ x: pts[i].x, y: pts[i].y });
  }

  let assignments: number[] = new Array(pts.length).fill(0);

  for (let iter = 0; iter < 10; iter++) {
    // assign
    for (let i = 0; i < pts.length; i++) {
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const dx = pts[i].x - centroids[c].x;
        const dy = pts[i].y - centroids[c].y;
        const d = dx * dx + dy * dy;
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      assignments[i] = best;
    }

    // update centroids
    const sums = new Array(centroids.length).fill(0).map(() => ({ x: 0, y: 0, n: 0 }));
    for (let i = 0; i < pts.length; i++) {
      const a = assignments[i];
      sums[a].x += pts[i].x;
      sums[a].y += pts[i].y;
      sums[a].n += 1;
    }

    let moved = false;
    for (let c = 0; c < centroids.length; c++) {
      if (sums[c].n === 0) continue;
      const nx = sums[c].x / sums[c].n;
      const ny = sums[c].y / sums[c].n;
      if (nx !== centroids[c].x || ny !== centroids[c].y) moved = true;
      centroids[c].x = nx;
      centroids[c].y = ny;
    }

    if (!moved) break;
  }

  // build clusters
  const clusters: Point[][] = new Array(centroids.length).fill(0).map(() => []);
  for (let i = 0; i < pts.length; i++) {
    const c = assignments[i] || 0;
    const p = points.find((pp) => pp.id === pts[i].id)!;
    clusters[c].push(p);
  }

  // If some clusters are empty (because k > points), create empty arrays
  while (clusters.length < k) clusters.push([]);

  const routes: RouteResult[] = [];
  let totalDistance = 0;
  let totalDuration = 0;

  for (let i = 0; i < k; i++) {
    const clusterPoints = clusters[i];
    if (clusterPoints.length === 0) {
      // empty vehicle, zero route (starts and ends at depot)
      routes.push({ route: [], totalDistance: 0, totalDuration: 0, segments: [], geometry: [] });
      continue;
    }

    // re-use the single-route logic but calculate per-cluster
    const routeResult = await calculateOptimalRoute(clusterPoints, startEndPoint);
    routes.push(routeResult);
    totalDistance += routeResult.totalDistance;
    totalDuration += routeResult.totalDuration;
  }

  const meanDuration = totalDuration / Math.max(1, k);

  return {
    routes,
    totalDistance,
    totalDuration,
    meanDuration,
  };
}

export async function calculateOptimalRoutesWithCapacity(
  points: Point[],
  vehicleCapacities: number[], // capaciteit per voertuig in laadmeters
  startEndPoint?: Point
): Promise<MultiRouteResult> {
  if (points.length === 0 || vehicleCapacities.length === 0) {
    return {
      routes: [],
      totalDistance: 0,
      totalDuration: 0,
      meanDuration: 0,
      vehicleLoads: [],
    };
  }

  // Sorteer punten op laadmeters (descending) voor betere packing
  const sortedPoints = [...points].sort((a, b) => 
    (b.loadMeters || 0) - (a.loadMeters || 0)
  );

  // First-Fit Decreasing algorithm voor bin packing
  const vehicleAssignments: Point[][] = vehicleCapacities.map(() => []);
  const vehicleLoads: number[] = vehicleCapacities.map(() => 0);

  for (const point of sortedPoints) {
    const loadMeters = point.loadMeters || 0;
    
    // Zoek eerste voertuig met genoeg capaciteit
    let assigned = false;
    for (let i = 0; i < vehicleCapacities.length; i++) {
      if (vehicleLoads[i] + loadMeters <= vehicleCapacities[i]) {
        vehicleAssignments[i].push(point);
        vehicleLoads[i] += loadMeters;
        assigned = true;
        break;
      }
    }

    // Als geen voertuig genoeg capaciteit heeft, assign aan voertuig met meeste capaciteit
    // (dit betekent dat we over capaciteit gaan - gebruiker moet gewaarschuwd worden)
    if (!assigned) {
      const maxCapIndex = vehicleCapacities.indexOf(Math.max(...vehicleCapacities));
      vehicleAssignments[maxCapIndex].push(point);
      vehicleLoads[maxCapIndex] += loadMeters;
    }
  }

  // Bereken routes voor elk voertuig
  const routes: RouteResult[] = [];
  let totalDistance = 0;
  let totalDuration = 0;

  for (let i = 0; i < vehicleCapacities.length; i++) {
    const vehiclePoints = vehicleAssignments[i];
    
    if (vehiclePoints.length === 0) {
      // Leeg voertuig
      routes.push({ 
        route: [], 
        totalDistance: 0, 
        totalDuration: 0, 
        segments: [], 
        geometry: [] 
      });
      continue;
    }

    const routeResult = await calculateOptimalRoute(vehiclePoints, startEndPoint);
    routes.push(routeResult);
    totalDistance += routeResult.totalDistance;
    totalDuration += routeResult.totalDuration;
  }

  const meanDuration = totalDuration / Math.max(1, vehicleCapacities.filter((_, i) => vehicleAssignments[i].length > 0).length);

  return {
    routes,
    totalDistance,
    totalDuration,
    meanDuration,
    vehicleLoads,
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
