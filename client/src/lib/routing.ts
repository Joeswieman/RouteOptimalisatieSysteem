import { Point } from "@/components/PointInput";
import { optimizeRouteACOTabu } from "./aco-routing";

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
  vehicleNames?: string[]; // namen van voertuigen (bv. "Trailer", "Bakwagen")
  vehicleCapacities?: number[]; // capaciteiten per voertuig
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
  vehicleNames?: string[], // namen van voertuigen
  startEndPoint?: Point
): Promise<MultiRouteResult> {
  if (points.length === 0 || vehicleCapacities.length === 0) {
    return {
      routes: [],
      totalDistance: 0,
      totalDuration: 0,
      meanDuration: 0,
      vehicleLoads: [],
      vehicleNames: vehicleNames || [],
      vehicleCapacities: vehicleCapacities,
    };
  }

  // Stap 1: Sorteer punten op laadmeters (descending) voor betere packing
  const sortedPoints = [...points].sort((a, b) => 
    (b.loadMeters || 0) - (a.loadMeters || 0)
  );

  // Stap 2: Geografische clustering met k-means voor betere route-verdeling
  // Dit zorgt ervoor dat punten die dicht bij elkaar liggen in hetzelfde voertuig komen
  const k = vehicleCapacities.length;
  const pts = sortedPoints.map((p) => ({ x: p.x, y: p.y, id: p.id, loadMeters: p.loadMeters || 0 }));
  
  // Initialiseer centroids - spread ze goed over de punten
  const centroids: { x: number; y: number }[] = [];
  const step = Math.floor(pts.length / k);
  for (let i = 0; i < k; i++) {
    const idx = Math.min(i * step, pts.length - 1);
    centroids.push({ x: pts[idx].x, y: pts[idx].y });
  }

  // K-means met capaciteitsbeperking
  let assignments: number[] = new Array(pts.length).fill(0);
  const vehicleLoads: number[] = vehicleCapacities.map(() => 0);

  for (let iter = 0; iter < 20; iter++) {
    // Reset loads
    vehicleLoads.fill(0);
    const tempAssignments = new Array(pts.length).fill(-1);
    
    // Assign points to nearest cluster met capaciteitscheck
    const unassigned: number[] = [];
    
    for (let i = 0; i < pts.length; i++) {
      let best = -1;
      let bestDist = Infinity;
      
      // Zoek dichtstbijzijnde cluster met genoeg capaciteit
      for (let c = 0; c < centroids.length; c++) {
        const dx = pts[i].x - centroids[c].x;
        const dy = pts[i].y - centroids[c].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        
        // Check of er nog capaciteit is
        if (vehicleLoads[c] + pts[i].loadMeters <= vehicleCapacities[c]) {
          if (d < bestDist) {
            bestDist = d;
            best = c;
          }
        }
      }
      
      if (best !== -1) {
        tempAssignments[i] = best;
        vehicleLoads[best] += pts[i].loadMeters;
      } else {
        unassigned.push(i);
      }
    }
    
    // Assign unassigned points aan voertuig met meeste restcapaciteit
    for (const i of unassigned) {
      let bestVehicle = 0;
      let maxRemainingCap = vehicleCapacities[0] - vehicleLoads[0];
      
      for (let c = 1; c < vehicleCapacities.length; c++) {
        const remaining = vehicleCapacities[c] - vehicleLoads[c];
        if (remaining > maxRemainingCap) {
          maxRemainingCap = remaining;
          bestVehicle = c;
        }
      }
      
      tempAssignments[i] = bestVehicle;
      vehicleLoads[bestVehicle] += pts[i].loadMeters;
    }
    
    assignments = tempAssignments;

    // Update centroids op basis van toegewezen punten
    const sums = new Array(centroids.length).fill(0).map(() => ({ x: 0, y: 0, n: 0 }));
    for (let i = 0; i < pts.length; i++) {
      const a = assignments[i];
      if (a >= 0) {
        sums[a].x += pts[i].x;
        sums[a].y += pts[i].y;
        sums[a].n += 1;
      }
    }

    let moved = false;
    for (let c = 0; c < centroids.length; c++) {
      if (sums[c].n === 0) continue;
      const nx = sums[c].x / sums[c].n;
      const ny = sums[c].y / sums[c].n;
      if (Math.abs(nx - centroids[c].x) > 0.0001 || Math.abs(ny - centroids[c].y) > 0.0001) {
        moved = true;
      }
      centroids[c].x = nx;
      centroids[c].y = ny;
    }

    if (!moved) break;
  }

  // Build vehicle assignments
  const vehicleAssignments: Point[][] = vehicleCapacities.map(() => []);
  for (let i = 0; i < pts.length; i++) {
    const c = assignments[i];
    if (c >= 0) {
      const p = points.find((pp) => pp.id === pts[i].id)!;
      vehicleAssignments[c].push(p);
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
    vehicleNames: vehicleNames || [],
    vehicleCapacities: vehicleCapacities,
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

  // Use ACO + Tabu Search for better route optimization
  console.log('🐜 Using ACO + Tabu Search algorithm...');
  const optimizedPoints = optimizeRouteACOTabu(points, startPoint);
  
  return optimizedPoints;
}
