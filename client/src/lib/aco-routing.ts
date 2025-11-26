import { Point } from "@/components/PointInput";

interface Ant {
  tour: number[];
  distance: number;
}

interface ACOConfig {
  numAnts: number;
  numIterations: number;
  alpha: number; // Pheromone importance
  beta: number;  // Heuristic importance
  evaporationRate: number;
  Q: number;     // Pheromone deposit factor
}

interface TabuConfig {
  maxIterations: number;
  tabuTenure: number;
}

/**
 * Calculate Haversine distance between two points
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Ant Colony Optimization for TSP
 */
export class AntColonyOptimizer {
  private points: Point[];
  private distanceMatrix: number[][];
  private pheromoneMatrix: number[][];
  private config: ACOConfig;

  constructor(points: Point[], config?: Partial<ACOConfig>) {
    this.points = points;
    this.config = {
      numAnts: Math.min(points.length, 20),
      numIterations: Math.min(100, points.length * 2),
      alpha: 1.0,
      beta: 2.5,
      evaporationRate: 0.5,
      Q: 100,
      ...config
    };
    
    this.distanceMatrix = this.buildDistanceMatrix();
    this.pheromoneMatrix = this.initializePheromones();
  }

  private buildDistanceMatrix(): number[][] {
    const n = this.points.length;
    const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dist = calculateDistance(
          this.points[i].y,
          this.points[i].x,
          this.points[j].y,
          this.points[j].x
        );
        matrix[i][j] = dist;
        matrix[j][i] = dist;
      }
    }
    
    return matrix;
  }

  private initializePheromones(): number[][] {
    const n = this.points.length;
    const initialPheromone = 1.0;
    return Array(n).fill(0).map(() => Array(n).fill(initialPheromone));
  }

  private constructAntSolution(): Ant {
    const n = this.points.length;
    const visited = new Set<number>();
    const tour: number[] = [0]; // Start at depot (first point)
    visited.add(0);

    let current = 0;

    while (visited.size < n) {
      const next = this.selectNextCity(current, visited);
      tour.push(next);
      visited.add(next);
      current = next;
    }

    tour.push(0); // Return to depot
    const distance = this.calculateTourDistance(tour);

    return { tour, distance };
  }

  private selectNextCity(current: number, visited: Set<number>): number {
    const n = this.points.length;
    const probabilities: number[] = [];
    let sum = 0;

    for (let i = 0; i < n; i++) {
      if (visited.has(i)) {
        probabilities.push(0);
        continue;
      }

      const pheromone = Math.pow(this.pheromoneMatrix[current][i], this.config.alpha);
      const heuristic = Math.pow(1.0 / (this.distanceMatrix[current][i] + 0.01), this.config.beta);
      const prob = pheromone * heuristic;
      
      probabilities.push(prob);
      sum += prob;
    }

    // Roulette wheel selection
    let random = Math.random() * sum;
    for (let i = 0; i < n; i++) {
      if (probabilities[i] === 0) continue;
      random -= probabilities[i];
      if (random <= 0) return i;
    }

    // Fallback: return first unvisited
    for (let i = 0; i < n; i++) {
      if (!visited.has(i)) return i;
    }

    return 0;
  }

  private calculateTourDistance(tour: number[]): number {
    let distance = 0;
    for (let i = 0; i < tour.length - 1; i++) {
      distance += this.distanceMatrix[tour[i]][tour[i + 1]];
    }
    return distance;
  }

  private updatePheromones(ants: Ant[]): void {
    const n = this.points.length;

    // Evaporation
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        this.pheromoneMatrix[i][j] *= (1 - this.config.evaporationRate);
      }
    }

    // Deposit pheromones
    for (const ant of ants) {
      const deposit = this.config.Q / ant.distance;
      for (let i = 0; i < ant.tour.length - 1; i++) {
        const from = ant.tour[i];
        const to = ant.tour[i + 1];
        this.pheromoneMatrix[from][to] += deposit;
        this.pheromoneMatrix[to][from] += deposit;
      }
    }
  }

  public optimize(): number[] {
    let bestTour: number[] = [];
    let bestDistance = Infinity;

    for (let iteration = 0; iteration < this.config.numIterations; iteration++) {
      const ants: Ant[] = [];

      // Construct solutions for all ants
      for (let k = 0; k < this.config.numAnts; k++) {
        const ant = this.constructAntSolution();
        ants.push(ant);

        if (ant.distance < bestDistance) {
          bestDistance = ant.distance;
          bestTour = [...ant.tour];
        }
      }

      // Update pheromones
      this.updatePheromones(ants);
    }

    return bestTour;
  }
}

/**
 * Tabu Search for further optimization
 */
export class TabuSearch {
  private points: Point[];
  private distanceMatrix: number[][];
  private config: TabuConfig;

  constructor(points: Point[], config?: Partial<TabuConfig>) {
    this.points = points;
    this.config = {
      maxIterations: Math.min(200, points.length * 3),
      tabuTenure: Math.floor(Math.sqrt(points.length)),
      ...config
    };
    this.distanceMatrix = this.buildDistanceMatrix();
  }

  private buildDistanceMatrix(): number[][] {
    const n = this.points.length;
    const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dist = calculateDistance(
          this.points[i].y,
          this.points[i].x,
          this.points[j].y,
          this.points[j].x
        );
        matrix[i][j] = dist;
        matrix[j][i] = dist;
      }
    }
    
    return matrix;
  }

  private calculateTourDistance(tour: number[]): number {
    let distance = 0;
    for (let i = 0; i < tour.length - 1; i++) {
      distance += this.distanceMatrix[tour[i]][tour[i + 1]];
    }
    return distance;
  }

  private twoOptSwap(tour: number[], i: number, k: number): number[] {
    const newTour = [...tour.slice(0, i), ...tour.slice(i, k + 1).reverse(), ...tour.slice(k + 1)];
    return newTour;
  }

  public optimize(initialTour: number[]): number[] {
    let currentTour = [...initialTour];
    let bestTour = [...currentTour];
    let bestDistance = this.calculateTourDistance(bestTour);
    
    const tabuList: Set<string> = new Set();
    const n = currentTour.length - 1; // Exclude return to depot

    for (let iteration = 0; iteration < this.config.maxIterations; iteration++) {
      let bestCandidate: number[] | null = null;
      let bestCandidateDistance = Infinity;
      let bestMove = '';

      // Explore neighborhood (2-opt moves)
      for (let i = 1; i < n - 1; i++) {
        for (let k = i + 1; k < n; k++) {
          const candidate = this.twoOptSwap(currentTour, i, k);
          const candidateDistance = this.calculateTourDistance(candidate);
          const moveKey = `${i}-${k}`;

          // Accept move if not tabu or if it improves best known solution (aspiration criterion)
          if (!tabuList.has(moveKey) || candidateDistance < bestDistance) {
            if (candidateDistance < bestCandidateDistance) {
              bestCandidate = candidate;
              bestCandidateDistance = candidateDistance;
              bestMove = moveKey;
            }
          }
        }
      }

      if (!bestCandidate) break;

      currentTour = bestCandidate;
      tabuList.add(bestMove);

      // Manage tabu list size
      if (tabuList.size > this.config.tabuTenure) {
        const firstKey = tabuList.values().next().value;
        if (firstKey !== undefined) {
          tabuList.delete(firstKey);
        }
      }

      // Update best solution
      if (bestCandidateDistance < bestDistance) {
        bestTour = [...bestCandidate];
        bestDistance = bestCandidateDistance;
      }
    }

    return bestTour;
  }
}

/**
 * Main function: ACO + Tabu Search hybrid
 */
export function optimizeRouteACOTabu(points: Point[], startPoint?: Point): Point[] {
  if (points.length === 0) return [];
  if (points.length === 1) return points;

  console.log(`🐜 Starting ACO+Tabu optimization for ${points.length} points...`);
  
  const startTime = Date.now();

  // Prepare points with depot
  let allPoints: Point[];
  if (startPoint) {
    // Filter out startPoint from points if it exists
    const otherPoints = points.filter(p => p.id !== startPoint.id);
    allPoints = [startPoint, ...otherPoints];
  } else {
    allPoints = [...points];
  }

  // Step 1: Ant Colony Optimization
  const aco = new AntColonyOptimizer(allPoints);
  const acoSolution = aco.optimize();
  
  const acoTime = Date.now() - startTime;
  console.log(`✅ ACO completed in ${acoTime}ms`);

  // Step 2: Tabu Search refinement
  const tabu = new TabuSearch(allPoints);
  const finalSolution = tabu.optimize(acoSolution);
  
  const totalTime = Date.now() - startTime;
  console.log(`✅ Tabu Search completed. Total time: ${totalTime}ms`);

  // Convert indices back to Point objects (exclude last point which is return to depot)
  const optimizedPoints = finalSolution.slice(0, -1).map(idx => allPoints[idx]);

  return optimizedPoints;
}
