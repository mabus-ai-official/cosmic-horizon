import { GAME_CONFIG } from "../config/game";

export interface SectorData {
  id: number;
  type: "standard" | "one_way" | "protected" | "harmony_enforced" | "core";
  hasStarMall: boolean;
  hasSeedPlanet: boolean;
  regionId: number;
}

export interface SectorEdge {
  from: number;
  to: number;
  oneWay: boolean;
}

export interface UniverseGraph {
  sectors: Map<number, SectorData>;
  edges: Map<number, SectorEdge[]>;
}

// Seeded random number generator (mulberry32)
function createRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleArray<T>(arr: T[], rng: () => number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function addEdge(
  edges: Map<number, SectorEdge[]>,
  from: number,
  to: number,
  oneWay: boolean,
): void {
  const fromEdges = edges.get(from) || [];
  const toEdges = edges.get(to) || [];

  if (fromEdges.some((e) => e.to === to)) return;

  fromEdges.push({ from, to, oneWay });
  edges.set(from, fromEdges);

  if (!oneWay) {
    if (!toEdges.some((e) => e.to === from)) {
      toEdges.push({ from: to, to: from, oneWay: false });
      edges.set(to, toEdges);
    }
  }
}

// BFS shortest path
export function findShortestPath(
  edges: Map<number, SectorEdge[]>,
  start: number,
  end: number,
  maxDepth: number = 50,
): number[] | null {
  if (start === end) return [start];

  const visited = new Set<number>();
  const queue: Array<{ node: number; path: number[] }> = [
    { node: start, path: [start] },
  ];
  visited.add(start);

  while (queue.length > 0) {
    const { node, path } = queue.shift()!;
    if (path.length > maxDepth) continue;

    for (const edge of edges.get(node) || []) {
      if (visited.has(edge.to)) continue;
      const newPath = [...path, edge.to];
      if (edge.to === end) return newPath;
      visited.add(edge.to);
      queue.push({ node: edge.to, path: newPath });
    }
  }
  return null;
}

export function generateUniverse(
  totalSectors: number = GAME_CONFIG.TOTAL_SECTORS,
  seed: number = Date.now(),
): UniverseGraph {
  const rng = createRng(seed);
  const sectors = new Map<number, SectorData>();
  const edges = new Map<number, SectorEdge[]>();

  // Initialize all sectors
  for (let i = 1; i <= totalSectors; i++) {
    sectors.set(i, {
      id: i,
      type: "standard",
      hasStarMall: false,
      hasSeedPlanet: false,
      regionId: 0,
    });
    edges.set(i, []);
  }

  // Generate regions (clusters)
  const avgRegionSize = Math.max(
    5,
    Math.floor(
      totalSectors / Math.ceil(totalSectors / GAME_CONFIG.SECTORS_PER_REGION),
    ),
  );
  const sectorIds = shuffleArray(
    [...Array(totalSectors)].map((_, i) => i + 1),
    rng,
  );
  let regionId = 0;
  let idx = 0;

  const regions: number[][] = [];
  while (idx < sectorIds.length) {
    const regionSize = Math.max(
      3,
      Math.floor(avgRegionSize * (0.6 + rng() * 0.8)),
    );
    const region = sectorIds.slice(idx, idx + regionSize);
    regions.push(region);
    for (const sid of region) {
      sectors.get(sid)!.regionId = regionId;
    }
    regionId++;
    idx += regionSize;
  }

  // Connect sectors within each region (create a connected subgraph)
  for (const region of regions) {
    // Spanning tree first (ensures connectivity)
    for (let i = 1; i < region.length; i++) {
      const connectTo = region[Math.floor(rng() * i)];
      addEdge(edges, region[i], connectTo, false);
    }
    // Extra edges within region for richer connectivity
    const extraEdges = Math.floor(region.length * 0.5);
    for (let i = 0; i < extraEdges; i++) {
      const a = region[Math.floor(rng() * region.length)];
      const b = region[Math.floor(rng() * region.length)];
      if (
        a !== b &&
        (edges.get(a)?.length || 0) < GAME_CONFIG.MAX_ADJACENT_SECTORS
      ) {
        addEdge(edges, a, b, false);
      }
    }
  }

  // Connect regions together (inter-region edges via spanning tree)
  for (let i = 1; i < regions.length; i++) {
    const targetRegion = regions[Math.floor(rng() * i)];
    const sourceNode = regions[i][Math.floor(rng() * regions[i].length)];
    const targetNode = targetRegion[Math.floor(rng() * targetRegion.length)];
    addEdge(edges, sourceNode, targetNode, false);
  }

  // Extra inter-region connections
  const extraInterRegion = Math.floor(regions.length * 0.3);
  for (let i = 0; i < extraInterRegion; i++) {
    const rA = Math.floor(rng() * regions.length);
    const rB = Math.floor(rng() * regions.length);
    if (rA !== rB) {
      const a = regions[rA][Math.floor(rng() * regions[rA].length)];
      const b = regions[rB][Math.floor(rng() * regions[rB].length)];
      addEdge(edges, a, b, false);
    }
  }

  // Assign sector types
  const allSectorIds = [...sectors.keys()];
  const shuffledIds = shuffleArray(allSectorIds, rng);

  const numStarMalls = Math.max(
    1,
    Math.min(GAME_CONFIG.NUM_STAR_MALLS, Math.floor(totalSectors / 100)),
  );
  const numSeedPlanets = Math.max(
    1,
    Math.min(GAME_CONFIG.NUM_SEED_PLANETS, Math.floor(totalSectors / 300)),
  );
  const numOneWay = Math.floor(
    totalSectors * GAME_CONFIG.SECTOR_TYPE_DISTRIBUTION.one_way,
  );

  let assignIdx = 0;

  // Assign star malls (protected sectors)
  for (
    let i = 0;
    i < numStarMalls && assignIdx < shuffledIds.length;
    i++, assignIdx++
  ) {
    const sid = shuffledIds[assignIdx];
    const sector = sectors.get(sid)!;
    sector.type = "protected";
    sector.hasStarMall = true;
    // Mark adjacent sectors as protected too
    for (const edge of edges.get(sid) || []) {
      const adj = sectors.get(edge.to)!;
      if (adj.type === "standard") {
        adj.type = "protected";
      }
    }
  }

  // Assign seed planets (in protected sectors near star malls)
  let seedsPlaced = 0;
  for (const [, sector] of sectors) {
    if (seedsPlaced >= numSeedPlanets) break;
    if (
      sector.type === "protected" &&
      !sector.hasStarMall &&
      !sector.hasSeedPlanet
    ) {
      sector.hasSeedPlanet = true;
      seedsPlaced++;
    }
  }
  // If not enough protected sectors, place remaining in fresh protected sectors
  while (seedsPlaced < numSeedPlanets && assignIdx < shuffledIds.length) {
    const sid = shuffledIds[assignIdx++];
    const sector = sectors.get(sid)!;
    if (sector.type === "standard") {
      sector.type = "protected";
      sector.hasSeedPlanet = true;
      seedsPlaced++;
    }
  }

  // Assign one-way sectors
  // Only convert an edge to one-way if the source sector has at least 2 incoming edges
  // (so removing the reverse doesn't isolate it) and the target has other incoming edges
  let oneWayCount = 0;
  for (
    ;
    assignIdx < shuffledIds.length && oneWayCount < numOneWay;
    assignIdx++
  ) {
    const sid = shuffledIds[assignIdx];
    const sector = sectors.get(sid)!;
    if (sector.type === "standard") {
      const sectorEdges = edges.get(sid) || [];
      if (sectorEdges.length < 2) continue; // need at least 2 edges to safely make one one-way

      // Find an edge where the target will still have outgoing edges after removing the reverse
      let converted = false;
      const shuffledEdges = shuffleArray([...sectorEdges], rng);
      for (const edge of shuffledEdges) {
        // Count outgoing edges from the target sector
        const targetOutgoing = (edges.get(edge.to) || []).length;
        // Target needs at least 2 outgoing edges so it keeps >=1 after we remove the reverse
        if (targetOutgoing >= 2) {
          edge.oneWay = true;
          // Remove the reverse edge
          const reverseEdges = edges.get(edge.to) || [];
          const revIdx = reverseEdges.findIndex((e) => e.to === sid);
          if (revIdx >= 0) reverseEdges.splice(revIdx, 1);
          converted = true;
          break;
        }
      }
      if (converted) {
        sector.type = "one_way";
        oneWayCount++;
      }
    }
  }

  // Ensure strong connectivity: every sector must be reachable from every other.
  // One-way edge conversion can create "sink" components that players can enter
  // but never leave. Use Kosaraju's algorithm to find strongly connected
  // components, then add bidirectional bridge edges to merge them.
  const ensureStrongConnectivity = () => {
    // Step 1: Forward BFS order (finish order)
    const visited = new Set<number>();
    const finishOrder: number[] = [];

    const dfsForward = (start: number) => {
      const stack: Array<{ node: number; edgeIdx: number }> = [
        { node: start, edgeIdx: 0 },
      ];
      visited.add(start);

      while (stack.length > 0) {
        const top = stack[stack.length - 1];
        const nodeEdges = edges.get(top.node) || [];
        if (top.edgeIdx < nodeEdges.length) {
          const next = nodeEdges[top.edgeIdx].to;
          top.edgeIdx++;
          if (!visited.has(next)) {
            visited.add(next);
            stack.push({ node: next, edgeIdx: 0 });
          }
        } else {
          finishOrder.push(top.node);
          stack.pop();
        }
      }
    };

    for (let i = 1; i <= totalSectors; i++) {
      if (!visited.has(i)) dfsForward(i);
    }

    // Step 2: Build reverse adjacency
    const reverseAdj = new Map<number, number[]>();
    for (let i = 1; i <= totalSectors; i++) reverseAdj.set(i, []);
    for (const [src, srcEdges] of edges) {
      for (const e of srcEdges) {
        reverseAdj.get(e.to)!.push(src);
      }
    }

    // Step 3: Reverse BFS in finish order (Kosaraju's second pass)
    const sccId = new Map<number, number>();
    const sccs: number[][] = [];
    const visited2 = new Set<number>();

    for (let i = finishOrder.length - 1; i >= 0; i--) {
      const start = finishOrder[i];
      if (visited2.has(start)) continue;

      const component: number[] = [];
      const queue: number[] = [start];
      visited2.add(start);

      while (queue.length > 0) {
        const node = queue.shift()!;
        component.push(node);
        sccId.set(node, sccs.length);
        for (const src of reverseAdj.get(node) || []) {
          if (!visited2.has(src)) {
            visited2.add(src);
            queue.push(src);
          }
        }
      }

      sccs.push(component);
    }

    if (sccs.length <= 1) return; // Already strongly connected

    // Step 4: Connect SCCs into a single strongly connected component.
    // Chain all SCCs: add bidirectional edges between consecutive SCCs.
    // Pick representative nodes from each SCC that are in the same or nearby
    // regions for natural-feeling connections.
    for (let i = 1; i < sccs.length; i++) {
      const prevScc = sccs[i - 1];
      const currScc = sccs[i];

      // Find the best pair: prefer nodes that already have a one-way edge
      // between them (just add the reverse direction)
      let bestFrom: number | null = null;
      let bestTo: number | null = null;
      let foundExisting = false;

      // Check if any node in currScc has a one-way edge to prevScc
      for (const sid of currScc) {
        for (const edge of edges.get(sid) || []) {
          if (sccId.get(edge.to) === i - 1) {
            bestFrom = sid;
            bestTo = edge.to;
            foundExisting = true;
            break;
          }
        }
        if (foundExisting) break;
      }

      if (!foundExisting) {
        // Check reverse: prevScc -> currScc
        for (const sid of prevScc) {
          for (const edge of edges.get(sid) || []) {
            if (sccId.get(edge.to) === i) {
              bestFrom = edge.to;
              bestTo = sid;
              foundExisting = true;
              break;
            }
          }
          if (foundExisting) break;
        }
      }

      if (!foundExisting) {
        // No existing connection; pick closest pair by region
        bestFrom = currScc[0];
        bestTo = prevScc[0];
        const fromRegion = sectors.get(bestFrom)!.regionId;
        let bestDist = Infinity;
        for (const rid of prevScc) {
          const rRegion = sectors.get(rid)!.regionId;
          const dist =
            Math.abs(rRegion - fromRegion) * 1000 + Math.abs(rid - bestFrom!);
          if (dist < bestDist) {
            bestDist = dist;
            bestTo = rid;
          }
        }
      }

      addEdge(edges, bestFrom!, bestTo!, false);
    }

    // Also connect last SCC back to first to complete the cycle
    const firstScc = sccs[0];
    const lastScc = sccs[sccs.length - 1];
    const lastNode = lastScc[0];
    const firstNode = firstScc[0];
    addEdge(edges, lastNode, firstNode, false);
  };

  ensureStrongConnectivity();

  // Mark harmony-enforced routes between star malls and seed planets
  const starMallSectors = [...sectors.values()].filter((s) => s.hasStarMall);
  const seedPlanetSectors = [...sectors.values()].filter(
    (s) => s.hasSeedPlanet,
  );

  for (const mall of starMallSectors) {
    for (const seed of seedPlanetSectors) {
      const path = findShortestPath(edges, mall.id, seed.id);
      if (path) {
        for (const sid of path) {
          const sector = sectors.get(sid)!;
          if (sector.type === "standard") {
            sector.type = "harmony_enforced";
          }
        }
      }
    }
  }

  // Designate the most-connected sector as the galaxy core.
  // Used by story missions (M40, M45) for "journey to the center" objectives.
  // Pick the standard/harmony_enforced sector with the highest edge count.
  let coreSectorId = -1;
  let maxEdges = 0;
  for (const [sid, sectorEdges] of edges) {
    const sector = sectors.get(sid)!;
    // Don't reassign star malls, seed planets, or protected sectors
    if (sector.type === "standard" || sector.type === "harmony_enforced") {
      if (sectorEdges.length > maxEdges) {
        maxEdges = sectorEdges.length;
        coreSectorId = sid;
      }
    }
  }
  if (coreSectorId > 0) {
    sectors.get(coreSectorId)!.type = "core";
  }

  return { sectors, edges };
}
