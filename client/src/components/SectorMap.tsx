import { useMemo, useRef, useCallback, useState, useEffect } from "react";

export interface MapData {
  currentSectorId: number;
  sectors: {
    id: number;
    type: string;
    regionId: number;
    hasStarMall: boolean;
    hasOutposts: boolean;
    hasPlanets: boolean;
    outpostCount?: number;
    planetCount?: number;
    sectorName?: string | null;
    owner?: { name: string; type: "player" | "syndicate" } | null;
    isNpcStarmall?: boolean;
    npcCount?: number;
    planetNames?: string[];
    outpostNames?: string[];
    commodities?: {
      buysCyr: boolean;
      sellsCyr: boolean;
      buysFood: boolean;
      sellsFood: boolean;
      buysTech: boolean;
      sellsTech: boolean;
      sellsFuel: boolean;
    } | null;
  }[];
  edges: { from: number; to: number; oneWay: boolean }[];
}

export type CommodityFilter =
  | null
  | "buys_cyr"
  | "sells_cyr"
  | "buys_food"
  | "sells_food"
  | "buys_tech"
  | "sells_tech"
  | "sells_fuel";

interface Props {
  mapData: MapData | null;
  currentSectorId: number | null;
  adjacentSectorIds: number[];
  onMoveToSector: (sectorId: number) => void;
  compact?: boolean;
  commodityFilter?: CommodityFilter;
}

const WIDTH = 400;
const HEIGHT = 380;
const IDEAL_EDGE_LENGTH = 80;
const ITERATIONS = 120;

const ZOOM_MIN = 1;
const ZOOM_MAX = 15;
const ZOOM_BUTTON_STEP = 1.0;
const ZOOM_WHEEL_STEP = 0.15;

// Seeded PRNG (Lehmer / Park-Miller)
function seededRng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

// Generate deterministic star positions for background layers
function generateStars(count: number, seed: number): string {
  const stars: string[] = [];
  const rand = seededRng(seed);
  for (let i = 0; i < count; i++) {
    const x = Math.round(rand() * 2000);
    const y = Math.round(rand() * 2000);
    stars.push(`${x}px ${y}px`);
  }
  return stars.join(", ");
}

// Pre-generate 4 star layers (dust=ultra-tiny, far=tiny+many, mid, near=big+few)
const STAR_LAYER_DUST = generateStars(800, 7);
const STAR_LAYER_FAR = generateStars(400, 42);
const STAR_LAYER_MID = generateStars(150, 137);
const STAR_LAYER_NEAR = generateStars(50, 293);

// Map sector type to star color scheme { gradient id suffix, core color }
const STAR_COLORS: Record<string, { gradient: string; core: string }> = {
  standard: { gradient: "white", core: "#fffbe8" },
  protected: { gradient: "green", core: "#a0ffb0" },
  harmony_enforced: { gradient: "blue", core: "#a0c8ff" },
  one_way: { gradient: "amber", core: "#ffd080" },
};

const BASE_RADIUS = 10;
function getNodeRadius(s: MapData["sectors"][0]): number {
  let r = BASE_RADIUS;
  r += (s.planetCount || 0) * 2;
  r += (s.outpostCount || 0) * 1.5;
  if (s.hasStarMall) r += 3;
  return Math.min(r, 24);
}

function getStarCoreRadius(s: MapData["sectors"][0]): number {
  const rand = ((s.id * 7919 + 104729) % 1000) / 1000;
  const base = 1.5 + rand * 2.0;
  const bonus =
    (s.planetCount || 0) * 0.3 +
    (s.outpostCount || 0) * 0.2 +
    (s.hasStarMall ? 0.5 : 0);
  return Math.min(base + bonus, 5);
}

function computeLayout(
  sectors: MapData["sectors"],
  edges: MapData["edges"],
  currentSectorId: number,
  cached: Map<number, { x: number; y: number }>,
): Map<number, { x: number; y: number }> {
  const positions = new Map<number, { x: number; y: number }>();
  const sectorIds = new Set(sectors.map((s) => s.id));

  // Build adjacency for neighbor lookup
  const adjacency = new Map<number, Set<number>>();
  for (const s of sectors) adjacency.set(s.id, new Set());
  for (const e of edges) {
    adjacency.get(e.from)?.add(e.to);
    adjacency.get(e.to)?.add(e.from);
  }

  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;

  // Use cached positions if available
  let hasCached = false;
  for (const s of sectors) {
    const c = cached.get(s.id);
    if (c) {
      positions.set(s.id, { x: c.x, y: c.y });
      hasCached = true;
    }
  }

  // For uncached nodes, use BFS ring layout centered on current sector
  // This ensures adjacent sectors always start near each other
  if (!hasCached) {
    // Deterministic seed so layout is stable across refreshes
    const seedBase = sectors.reduce(
      (acc, s) => acc + s.id * 7919,
      currentSectorId * 104729,
    );
    const rand = seededRng(seedBase);

    const visited = new Set<number>();
    const queue: { id: number; depth: number }[] = [];

    // Start BFS from current sector at center
    if (sectorIds.has(currentSectorId)) {
      positions.set(currentSectorId, { x: cx, y: cy });
      visited.add(currentSectorId);
      queue.push({ id: currentSectorId, depth: 0 });
    }

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      const neighbors = adjacency.get(id);
      if (!neighbors) continue;

      // Collect unvisited neighbors, sort by ID for determinism
      const unvisited = [...neighbors]
        .filter((n) => !visited.has(n) && sectorIds.has(n))
        .sort((a, b) => a - b);
      if (unvisited.length === 0) continue;

      const parentPos = positions.get(id)!;
      const ringRadius = IDEAL_EDGE_LENGTH * (0.8 + depth * 0.15);
      // Spread neighbors evenly around parent with a deterministic offset
      const angleStep = (2 * Math.PI) / Math.max(unvisited.length, 3);
      const baseAngle = rand() * Math.PI * 2;

      for (let i = 0; i < unvisited.length; i++) {
        const nid = unvisited[i];
        const angle = baseAngle + angleStep * i;
        // Add small jitter to prevent perfect overlaps
        const jitter = (rand() - 0.5) * 8;
        positions.set(nid, {
          x: parentPos.x + Math.cos(angle) * ringRadius + jitter,
          y: parentPos.y + Math.sin(angle) * ringRadius + jitter,
        });
        visited.add(nid);
        queue.push({ id: nid, depth: depth + 1 });
      }
    }

    // Place any disconnected nodes not reached by BFS
    for (const s of sectors) {
      if (!positions.has(s.id)) {
        positions.set(s.id, {
          x: cx + (rand() - 0.5) * WIDTH * 0.4,
          y: cy + (rand() - 0.5) * HEIGHT * 0.4,
        });
      }
    }
  } else {
    // Fill in any new uncached nodes near their neighbors
    const seedBase = sectors.reduce(
      (acc, s) => acc + s.id * 7919,
      currentSectorId * 104729,
    );
    const rand = seededRng(seedBase);
    for (const s of sectors) {
      if (positions.has(s.id)) continue;
      const neighbors = adjacency.get(s.id);
      let placed = false;
      if (neighbors) {
        for (const nid of neighbors) {
          const np = positions.get(nid);
          if (np) {
            const angle = rand() * Math.PI * 2;
            positions.set(s.id, {
              x: np.x + Math.cos(angle) * IDEAL_EDGE_LENGTH,
              y: np.y + Math.sin(angle) * IDEAL_EDGE_LENGTH,
            });
            placed = true;
            break;
          }
        }
      }
      if (!placed) {
        positions.set(s.id, {
          x: cx + (rand() - 0.5) * WIDTH * 0.4,
          y: cy + (rand() - 0.5) * HEIGHT * 0.4,
        });
      }
    }
  }

  if (sectors.length <= 1) {
    if (sectors.length === 1) positions.set(sectors[0].id, { x: cx, y: cy });
    return positions;
  }

  // Force-directed iterations to refine the BFS layout
  const velocities = new Map<number, { vx: number; vy: number }>();
  for (const s of sectors) velocities.set(s.id, { vx: 0, vy: 0 });

  const damping = 0.82;
  const repulsionStrength = 5000;
  const minSeparation = 70;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    const temp = 1 - iter / ITERATIONS; // cooling factor

    // Repulsion between all pairs (extra strong when overlapping)
    for (let i = 0; i < sectors.length; i++) {
      for (let j = i + 1; j < sectors.length; j++) {
        const a = positions.get(sectors[i].id)!;
        const b = positions.get(sectors[j].id)!;
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) {
          dx = 1;
          dy = 0;
          dist = 1;
        }
        // Boost repulsion when nodes are overlapping
        const overlap = dist < minSeparation;
        const strength = overlap ? repulsionStrength * 4 : repulsionStrength;
        const force = strength / (dist * dist);
        const fx = (dx / dist) * force * temp;
        const fy = (dy / dist) * force * temp;
        const va = velocities.get(sectors[i].id)!;
        const vb = velocities.get(sectors[j].id)!;
        va.vx += fx;
        va.vy += fy;
        vb.vx -= fx;
        vb.vy -= fy;
      }
    }

    // Attraction along edges — strong spring toward ideal length
    for (const e of edges) {
      const a = positions.get(e.from);
      const b = positions.get(e.to);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) continue;
      const displacement = dist - IDEAL_EDGE_LENGTH;
      const force = 0.15 * displacement * temp;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      const va = velocities.get(e.from)!;
      const vb = velocities.get(e.to)!;
      va.vx += fx;
      va.vy += fy;
      vb.vx -= fx;
      vb.vy -= fy;
    }

    // Gentle center pull on current sector
    const cp = positions.get(currentSectorId);
    if (cp) {
      const cv = velocities.get(currentSectorId)!;
      cv.vx += (cx - cp.x) * 0.02 * temp;
      cv.vy += (cy - cp.y) * 0.02 * temp;
    }

    // Very light gravity toward center for all nodes (prevents drifting)
    for (const s of sectors) {
      const p = positions.get(s.id)!;
      const v = velocities.get(s.id)!;
      v.vx += (cx - p.x) * 0.001 * temp;
      v.vy += (cy - p.y) * 0.001 * temp;
    }

    // Apply velocities (no boundary clamping — spread + pan handle navigation)
    for (const s of sectors) {
      const v = velocities.get(s.id)!;
      const p = positions.get(s.id)!;
      v.vx *= damping;
      v.vy *= damping;
      p.x += v.vx;
      p.y += v.vy;
    }

    // Hard overlap separation — push apart any nodes closer than minSeparation
    for (let i = 0; i < sectors.length; i++) {
      for (let j = i + 1; j < sectors.length; j++) {
        const a = positions.get(sectors[i].id)!;
        const b = positions.get(sectors[j].id)!;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minSeparation) {
          if (dist < 1) {
            dx = 1;
            dy = 0;
          }
          const overlap = minSeparation - dist;
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);
          const push = overlap * 0.5;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
        }
      }
    }
  }

  // Re-center layout so current sector is always at map center.
  // This ensures pan {0,0} at zoom 1 shows the current sector centered.
  const currentPos = positions.get(currentSectorId);
  if (currentPos) {
    const offsetX = cx - currentPos.x;
    const offsetY = cy - currentPos.y;
    if (Math.abs(offsetX) > 0.5 || Math.abs(offsetY) > 0.5) {
      for (const [, p] of positions) {
        p.x += offsetX;
        p.y += offsetY;
      }
    }
  }

  return positions;
}

function matchesCommodityFilter(
  s: MapData["sectors"][0],
  filter: CommodityFilter,
): boolean {
  if (!filter || !s.commodities) return false;
  switch (filter) {
    case "buys_cyr":
      return s.commodities.buysCyr;
    case "sells_cyr":
      return s.commodities.sellsCyr;
    case "buys_food":
      return s.commodities.buysFood;
    case "sells_food":
      return s.commodities.sellsFood;
    case "buys_tech":
      return s.commodities.buysTech;
    case "sells_tech":
      return s.commodities.sellsTech;
    case "sells_fuel":
      return s.commodities.sellsFuel;
    default:
      return false;
  }
}

export default function SectorMap({
  mapData,
  currentSectorId,
  adjacentSectorIds,
  onMoveToSector,
  compact,
  commodityFilter,
}: Props) {
  const positionCache = useRef<Map<number, { x: number; y: number }>>(
    new Map(),
  );
  const [zoom, setZoom] = useState(ZOOM_MIN);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const [hoveredSector, setHoveredSector] = useState<{
    id: number;
    type: string;
    x: number;
    y: number;
    sectorName?: string | null;
    owner?: { name: string; type: string } | null;
    isNpcStarmall?: boolean;
    hasPlanets?: boolean;
    hasOutposts?: boolean;
    hasStarMall?: boolean;
    planetCount?: number;
    outpostCount?: number;
    npcCount?: number;
    planetNames?: string[];
    outpostNames?: string[];
    commodities?: MapData["sectors"][0]["commodities"];
  } | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const mapBodyRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Keep refs in sync with state for stable event handlers
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const handleParallaxMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      // Normalize to -1..1 from center
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      setParallax({ x: nx, y: ny });
    },
    [],
  );

  // zoom is now state directly

  const positions = useMemo(() => {
    if (!mapData || currentSectorId == null)
      return new Map<number, { x: number; y: number }>();
    const result = computeLayout(
      mapData.sectors,
      mapData.edges,
      currentSectorId,
      positionCache.current,
    );
    // Update cache
    positionCache.current = new Map(result);
    return result;
  }, [mapData, currentSectorId]);

  // Compute bounding box of sector positions for pan limits
  const layoutBounds = useMemo(() => {
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const [, p] of positions) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    if (!isFinite(minX)) return { minX: 0, maxX: WIDTH, minY: 0, maxY: HEIGHT };
    // Add margin
    const margin = 50;
    return {
      minX: minX - margin,
      maxX: maxX + margin,
      minY: minY - margin,
      maxY: maxY + margin,
    };
  }, [positions]);
  const layoutBoundsRef = useRef(layoutBounds);
  useEffect(() => {
    layoutBoundsRef.current = layoutBounds;
  }, [layoutBounds]);

  const handleNodeClick = useCallback(
    (sectorId: number) => {
      if (adjacentSectorIds.includes(sectorId)) {
        onMoveToSector(sectorId);
      }
    },
    [adjacentSectorIds, onMoveToSector],
  );

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + ZOOM_BUTTON_STEP, ZOOM_MAX));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => {
      const next = Math.max(z - ZOOM_BUTTON_STEP, ZOOM_MIN);
      if (next <= ZOOM_MIN) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleDoubleClick = useCallback(() => {
    // Center viewport on the current sector
    if (currentSectorId != null && positions.has(currentSectorId)) {
      const pos = positions.get(currentSectorId)!;
      const z = zoomRef.current;
      const s = Math.pow(z, 0.7);
      const mcx = WIDTH / 2;
      const mcy = HEIGHT / 2;
      // Sector's visual position after spread
      const sx = mcx + (pos.x - mcx) * s;
      const sy = mcy + (pos.y - mcy) * s;
      // Pan needed to put that position at viewport center
      const vw = WIDTH / z;
      const vh = HEIGHT / z;
      setPan({
        x: sx - (WIDTH - vw) / 2 - vw / 2,
        y: sy - (HEIGHT - vh) / 2 - vh / 2,
      });
    } else {
      setPan({ x: 0, y: 0 });
    }
  }, [currentSectorId, positions]);

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { x: panRef.current.x, y: panRef.current.y };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging.current) return;
    const z = zoomRef.current;
    // Convert pixel movement to viewBox units
    const svgEl = e.currentTarget;
    const rect = svgEl.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const scaleY = HEIGHT / rect.height;
    const panAccel = Math.pow(z, 0.4);
    const dx = (((e.clientX - dragStart.current.x) * scaleX) / z) * panAccel;
    const dy = (((e.clientY - dragStart.current.y) * scaleY) / z) * panAccel;
    // Pan limits: use actual layout bounds so all sectors are reachable
    const spreadAtZ = Math.pow(z, 0.7);
    const lb = layoutBoundsRef.current;
    const mcx = WIDTH / 2;
    const mcy = HEIGHT / 2;
    // Bounds after spread transform
    const sMinX = mcx + (lb.minX - mcx) * spreadAtZ;
    const sMaxX = mcx + (lb.maxX - mcx) * spreadAtZ;
    const sMinY = mcy + (lb.minY - mcy) * spreadAtZ;
    const sMaxY = mcy + (lb.maxY - mcy) * spreadAtZ;
    // Viewbox dimensions at current zoom
    const vw = WIDTH / z;
    const vh = HEIGHT / z;
    const vbx0 = (WIDTH - vw) / 2;
    const vby0 = (HEIGHT - vh) / 2;
    // Allow panning so the viewbox can reach any edge of the spread bounds
    const panMinX = sMinX - vbx0 - vw * 0.1;
    const panMaxX = sMaxX - vbx0 - vw * 0.9;
    const panMinY = sMinY - vby0 - vh * 0.1;
    const panMaxY = sMaxY - vby0 - vh * 0.9;
    setPan({
      x: Math.max(panMinX, Math.min(panMaxX, panStart.current.x - dx)),
      y: Math.max(panMinY, Math.min(panMaxY, panStart.current.y - dy)),
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();

    // Mouse position as fraction of SVG element (0-1)
    const mx = (e.clientX - rect.left) / rect.width;
    const my = (e.clientY - rect.top) / rect.height;

    setZoom((prev) => {
      const next =
        e.deltaY < 0
          ? Math.min(prev + ZOOM_WHEEL_STEP, ZOOM_MAX)
          : Math.max(prev - ZOOM_WHEEL_STEP, ZOOM_MIN);

      if (next <= ZOOM_MIN) {
        setPan({ x: 0, y: 0 });
      } else {
        // Read current pan from ref to avoid stale closure
        const curPan = panRef.current;
        // Shift pan toward/away from mouse cursor, accounting for spread change
        const oldVw = WIDTH / prev;
        const oldVh = HEIGHT / prev;
        const newVw = WIDTH / next;
        const newVh = HEIGHT / next;
        // ViewBox position under cursor at old zoom
        const cursorVx = (WIDTH - oldVw) / 2 + curPan.x + oldVw * mx;
        const cursorVy = (HEIGHT - oldVh) / 2 + curPan.y + oldVh * my;
        // Content under cursor moves due to spread change — track it
        const spreadOld = Math.pow(prev, 0.7);
        const spreadNew = Math.pow(next, 0.7);
        const mcx = WIDTH / 2;
        const mcy = HEIGHT / 2;
        const targetVx = mcx + ((cursorVx - mcx) * spreadNew) / spreadOld;
        const targetVy = mcy + ((cursorVy - mcy) * spreadNew) / spreadOld;
        const newPanX = targetVx - (WIDTH - newVw) / 2 - newVw * mx;
        const newPanY = targetVy - (HEIGHT - newVh) / 2 - newVh * my;
        // Pan limits from actual layout bounds
        const lb = layoutBoundsRef.current;
        const sMinX2 = mcx + (lb.minX - mcx) * spreadNew;
        const sMaxX2 = mcx + (lb.maxX - mcx) * spreadNew;
        const sMinY2 = mcy + (lb.minY - mcy) * spreadNew;
        const sMaxY2 = mcy + (lb.maxY - mcy) * spreadNew;
        const vbx02 = (WIDTH - newVw) / 2;
        const vby02 = (HEIGHT - newVh) / 2;
        const pMinX = sMinX2 - vbx02 - newVw * 0.1;
        const pMaxX = sMaxX2 - vbx02 - newVw * 0.9;
        const pMinY = sMinY2 - vby02 - newVh * 0.1;
        const pMaxY = sMaxY2 - vby02 - newVh * 0.9;
        setPan({
          x: Math.max(pMinX, Math.min(pMaxX, newPanX)),
          y: Math.max(pMinY, Math.min(pMaxY, newPanY)),
        });
      }
      return next;
    });
  }, []);

  // Attach wheel listener to map body container so it works on hover anywhere in the map area
  useEffect(() => {
    const el = mapBodyRef.current;
    if (!el || compact) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel, compact]);

  // Re-attach if mapBodyRef becomes available after initial render
  const mapBodyCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      mapBodyRef.current = node;
      if (node && !compact) {
        node.addEventListener("wheel", handleWheel, { passive: false });
      }
    },
    [handleWheel, compact],
  );

  const effectiveWidth = compact ? 240 : WIDTH;
  const effectiveHeight = compact ? 200 : HEIGHT;

  if (!mapData || currentSectorId == null) return null;

  const adjacentSet = new Set(adjacentSectorIds);

  // NMS-style zoom: positions spread from center, nodes stay constant screen size
  const spread = Math.pow(zoom, 0.7);
  const renderScale = 1 / Math.pow(zoom, 0.35);
  const mapCenterX = WIDTH / 2;
  const mapCenterY = HEIGHT / 2;

  // Deduplicate bidirectional edges by canonical key
  const edgeMap = new Map<
    string,
    { from: number; to: number; oneWay: boolean }
  >();
  for (const e of mapData.edges) {
    const key = e.oneWay
      ? `${e.from}->${e.to}`
      : `${Math.min(e.from, e.to)}-${Math.max(e.from, e.to)}`;
    if (!edgeMap.has(key)) {
      edgeMap.set(key, e);
    }
  }
  const dedupedEdges = Array.from(edgeMap.values());

  // Compute viewBox based on zoom and pan
  const vw = effectiveWidth / zoom;
  const vh = effectiveHeight / zoom;
  const vx = (effectiveWidth - vw) / 2 + pan.x;
  const vy = (effectiveHeight - vh) / 2 + pan.y;

  const svgContent = (
    <svg
      ref={svgRef}
      className="sector-map-svg"
      viewBox={`${vx} ${vy} ${vw} ${vh}`}
      xmlns="http://www.w3.org/2000/svg"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      style={{ cursor: dragging.current ? "grabbing" : "grab" }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="8"
          markerHeight="6"
          refX="7"
          refY="3"
          orient="auto"
          className="sector-map-arrowhead"
        >
          <polygon points="0 0, 8 3, 0 6" />
        </marker>

        {/* Star glow gradients */}
        <radialGradient id="star-glow-white">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="25%" stopColor="#fffbe8" stopOpacity="0.6" />
          <stop offset="60%" stopColor="#d4c896" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#d4c896" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="star-glow-green">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="25%" stopColor="#a0ffb0" stopOpacity="0.6" />
          <stop offset="60%" stopColor="#40a050" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#40a050" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="star-glow-blue">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="25%" stopColor="#a0c8ff" stopOpacity="0.6" />
          <stop offset="60%" stopColor="#4080c0" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#4080c0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="star-glow-amber">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="25%" stopColor="#ffd080" stopOpacity="0.6" />
          <stop offset="60%" stopColor="#c08830" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#c08830" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="star-glow-cyan">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="25%" stopColor="#56d4dd" stopOpacity="0.7" />
          <stop offset="60%" stopColor="#2a8a90" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#2a8a90" stopOpacity="0" />
        </radialGradient>

        {/* Bloom filter for current sector */}
        <filter id="star-bloom" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
        </filter>
      </defs>

      {/* Layer 1: Edges */}
      {dedupedEdges.map((e) => {
        const fromBase = positions.get(e.from);
        const toBase = positions.get(e.to);
        if (!fromBase || !toBase) return null;

        // Apply spread to positions
        const from = {
          x: mapCenterX + (fromBase.x - mapCenterX) * spread,
          y: mapCenterY + (fromBase.y - mapCenterY) * spread,
        };
        const to = {
          x: mapCenterX + (toBase.x - mapCenterX) * spread,
          y: mapCenterY + (toBase.y - mapCenterY) * spread,
        };

        // Shorten line by scaled node radius at each end
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) return null;
        const nx = dx / dist;
        const ny = dy / dist;
        // Use small core radius so edges reach close to star cores
        const coreOffset = 3 * renderScale;
        const x1 = from.x + nx * coreOffset;
        const y1 = from.y + ny * coreOffset;
        const x2 = to.x - nx * coreOffset;
        const y2 = to.y - ny * coreOffset;

        const key = `edge-${e.from}-${e.to}`;
        return (
          <line
            key={key}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            className={`sector-map-edge${e.oneWay ? " sector-map-edge--oneway" : ""}`}
            strokeWidth={1 / zoom}
            markerEnd={e.oneWay ? "url(#arrowhead)" : undefined}
          />
        );
      })}

      {/* Layer 2: Star Nodes */}
      {mapData.sectors.map((s) => {
        const basePos = positions.get(s.id);
        if (!basePos) return null;
        const pos = {
          x: mapCenterX + (basePos.x - mapCenterX) * spread,
          y: mapCenterY + (basePos.y - mapCenterY) * spread,
        };

        const isCurrent = s.id === currentSectorId;
        const isAdjacent = adjacentSet.has(s.id);
        const colors = isCurrent
          ? { gradient: "cyan", core: "#56d4dd" }
          : STAR_COLORS[s.type] || STAR_COLORS.standard;
        const glowRadius = getNodeRadius(s);

        // Glow-only parallax: deterministic depth per sector, current=near, far=deeper
        const depthRand = ((s.id * 7919 + 104729) % 1000) / 1000;
        const depth = isCurrent ? 0.2 : 0.5 + depthRand * 0.5;
        const glowOffsetX = parallax.x * depth * 3;
        const glowOffsetY = parallax.y * depth * 3;

        const filterMatch = commodityFilter
          ? matchesCommodityFilter(s, commodityFilter)
          : null;
        // When filter active: dim non-matching, boost matching
        const filterDim = commodityFilter && !filterMatch && !isCurrent;

        let nodeClass = "sector-map-node sector-map-node--twinkle";
        if (isCurrent) nodeClass += " sector-map-node--current";
        else if (isAdjacent) nodeClass += " sector-map-node--adjacent";

        const typeClass = `sector-map-node--${s.type}`;

        return (
          <g
            key={`node-${s.id}`}
            transform={`translate(${pos.x}, ${pos.y})`}
            className={`${nodeClass} ${typeClass}`}
            onClick={isAdjacent ? () => handleNodeClick(s.id) : undefined}
            style={
              {
                ...(isAdjacent ? { cursor: "pointer" } : {}),
                "--twinkle-dur": `${12 + (s.id % 11) * 4}s`,
                "--twinkle-delay": `${(s.id * 3.7) % 40}s`,
                ...(filterDim ? { opacity: 0.15 } : {}),
              } as React.CSSProperties
            }
            onMouseEnter={(e) => {
              const svgEl = e.currentTarget.closest("svg");
              if (!svgEl) return;
              const rect = svgEl.getBoundingClientRect();
              const svgPt = svgEl.createSVGPoint();
              svgPt.x = pos.x;
              svgPt.y = pos.y;
              const ctm = svgEl.getScreenCTM();
              if (ctm) {
                const screenPt = svgPt.matrixTransform(ctm);
                setHoveredSector({
                  id: s.id,
                  type: s.type,
                  x: screenPt.x - rect.left,
                  y: screenPt.y - rect.top,
                  sectorName: s.sectorName,
                  owner: s.owner,
                  isNpcStarmall: s.isNpcStarmall,
                  hasPlanets: s.hasPlanets,
                  hasOutposts: s.hasOutposts,
                  hasStarMall: s.hasStarMall,
                  planetCount: s.planetCount,
                  outpostCount: s.outpostCount,
                  npcCount: s.npcCount,
                  planetNames: s.planetNames,
                  outpostNames: s.outpostNames,
                  commodities: s.commodities,
                });
              }
            }}
            onMouseLeave={() => setHoveredSector(null)}
          >
            <g transform={`scale(${renderScale})`}>
              {/* Invisible hit area for mouse events */}
              <circle r={glowRadius} fill="transparent" />

              {/* 1-2. Glow + Bloom with parallax offset */}
              <g transform={`translate(${glowOffsetX}, ${glowOffsetY})`}>
                {/* Glow halo — soft radial glow */}
                <circle
                  r={glowRadius}
                  fill={`url(#star-glow-${colors.gradient})`}
                  className="sector-star-glow"
                />

                {/* Bloom — current sector only, larger + blur */}
                {isCurrent && (
                  <circle
                    r={glowRadius * 1.8}
                    fill={`url(#star-glow-${colors.gradient})`}
                    className="sector-star-bloom"
                    filter="url(#star-bloom)"
                  />
                )}
              </g>

              {/* 3. Pulse ring — current sector only */}
              {isCurrent && (
                <circle r={glowRadius + 4} className="sector-node-pulse" />
              )}

              {/* 4. Star core — tiny bright dot, size varies by sector */}
              <circle
                r={getStarCoreRadius(s)}
                fill={colors.core}
                className="sector-star-core"
              />

              {/* 5. Owner ring — thin ring at half-glow radius */}
              {s.owner && (
                <circle
                  r={glowRadius * 0.5}
                  fill="none"
                  stroke={
                    s.owner.type === "player" ? "var(--green)" : "var(--purple)"
                  }
                  strokeWidth={0.8}
                  opacity={0.35}
                />
              )}

              {/* 5b. Commodity filter highlight ring */}
              {filterMatch && (
                <circle
                  r={glowRadius * 0.7}
                  fill="none"
                  stroke="var(--yellow)"
                  strokeWidth={1.5}
                  opacity={0.9}
                  className="sector-commodity-ring"
                />
              )}

              {/* 6. Sector ID label — only visible when zoomed in, current, or adjacent */}
              {(isCurrent || isAdjacent || zoom >= 4) && (
                <text
                  className={`sector-node-label${isCurrent ? " sector-node-label--current" : isAdjacent ? " sector-node-label--adjacent" : ""}`}
                  textAnchor="middle"
                  dy={s.sectorName ? "-2.6em" : "-1.4em"}
                >
                  {s.id}
                </text>
              )}

              {/* 7. Sector name label (below ID, closer to star) */}
              {s.sectorName && (
                <text
                  className="sector-node-name"
                  textAnchor="middle"
                  dy="-1.4em"
                >
                  {s.sectorName}
                </text>
              )}

              {/* 8. Star Mall icon — subtle dot */}
              {s.hasStarMall && (
                <circle
                  className="sector-star-mall-icon"
                  cx={glowRadius * 0.6 + 4}
                  cy={-(glowRadius * 0.6 + 4)}
                  r={2}
                />
              )}

              {/* Outpost icon — tiny diamond */}
              {s.hasOutposts && (
                <polygon
                  className="sector-outpost-icon"
                  points="0,-2.5 2.5,0 0,2.5 -2.5,0"
                  transform={`translate(-4, ${glowRadius * 0.5 + 6})`}
                />
              )}

              {/* Planet icon — tiny circle */}
              {s.hasPlanets && (
                <circle
                  className="sector-planet-icon"
                  cx={4}
                  cy={glowRadius * 0.5 + 6}
                  r={2}
                />
              )}
            </g>
          </g>
        );
      })}
    </svg>
  );

  if (compact) {
    return (
      <div
        className="sector-map-compact"
        style={{ border: "1px solid var(--border)", borderRadius: 4 }}
      >
        <div className="sector-map-body" style={{ padding: 4 }}>
          {svgContent}
        </div>
      </div>
    );
  }

  return (
    <div className="sector-map-full">
      <div className="sector-map-full__header">
        <span className="sector-map-full__title">
          SECTOR MAP {currentSectorId != null ? `| ${currentSectorId}` : ""}
        </span>
        <span className="sector-map-controls">
          <button
            className="sector-map-zoom-btn sector-map-zoom-btn--legend"
            onClick={() => setShowLegend((v) => !v)}
            title="Toggle legend"
          >
            {showLegend ? "×" : "?"}
          </button>
          <button
            className="sector-map-zoom-btn"
            onClick={handleZoomOut}
            disabled={zoom <= ZOOM_MIN}
            title="Zoom out"
          >
            −
          </button>
          <button
            className="sector-map-zoom-btn"
            onClick={handleZoomIn}
            disabled={zoom >= ZOOM_MAX}
            title="Zoom in"
          >
            +
          </button>
        </span>
      </div>
      <div
        className="sector-map-body"
        style={{ padding: 4, position: "relative" }}
        onMouseMove={handleParallaxMove}
        ref={mapBodyCallbackRef}
      >
        {/* Space background with parallax starfield + nebula */}
        <div className="space-bg">
          <img
            src="/logo.png"
            alt=""
            className="space-bg__logo"
            style={{
              transform: `translate(${parallax.x * 2}px, ${parallax.y * 2}px)`,
            }}
          />
          <div
            className="space-bg__galaxies"
            style={{
              transform: `translate(${parallax.x * 1.5}px, ${parallax.y * 1.5}px)`,
            }}
          >
            <div className="space-bg__galaxy space-bg__galaxy--1" />
            <div className="space-bg__galaxy space-bg__galaxy--2" />
            <div className="space-bg__galaxy space-bg__galaxy--3" />
            <div className="space-bg__galaxy space-bg__galaxy--4" />
          </div>
          <div
            className="space-bg__nebula"
            style={{
              transform: `translate(${parallax.x * 8}px, ${parallax.y * 8}px)`,
            }}
          />
          <div className="space-bg__shooting-stars">
            <div className="shooting-star shooting-star--1" />
            <div className="shooting-star shooting-star--2" />
            <div className="shooting-star shooting-star--3" />
            <div className="shooting-star shooting-star--4" />
            <div className="shooting-star shooting-star--5" />
          </div>
          <div
            className="space-bg__stars space-bg__stars--dust"
            style={{
              boxShadow: STAR_LAYER_DUST,
              transform: `translate(${parallax.x * 3}px, ${parallax.y * 3}px)`,
            }}
          />
          <div
            className="space-bg__stars space-bg__stars--far"
            style={{
              boxShadow: STAR_LAYER_FAR,
              transform: `translate(${parallax.x * 6}px, ${parallax.y * 6}px)`,
            }}
          />
          <div
            className="space-bg__stars space-bg__stars--mid"
            style={{
              boxShadow: STAR_LAYER_MID,
              transform: `translate(${parallax.x * 15}px, ${parallax.y * 15}px)`,
            }}
          />
          <div
            className="space-bg__stars space-bg__stars--near"
            style={{
              boxShadow: STAR_LAYER_NEAR,
              transform: `translate(${parallax.x * 28}px, ${parallax.y * 28}px)`,
            }}
          />
        </div>
        {svgContent}
        {hoveredSector && (
          <div
            className="sector-map-tooltip"
            style={{ left: hoveredSector.x, top: hoveredSector.y - 28 }}
          >
            <div>
              Sector {hoveredSector.id}{" "}
              <span style={{ opacity: 0.6 }}>[{hoveredSector.type}]</span>
            </div>
            {hoveredSector.sectorName && (
              <div style={{ color: "var(--cyan)", fontWeight: "bold" }}>
                {hoveredSector.sectorName}
              </div>
            )}
            {hoveredSector.owner && (
              <div
                style={{
                  color:
                    hoveredSector.owner.type === "player"
                      ? "var(--green)"
                      : "var(--purple)",
                }}
              >
                Owner: {hoveredSector.owner.name} ({hoveredSector.owner.type})
              </div>
            )}
            {hoveredSector.isNpcStarmall && (
              <div
                className="sector-map-tooltip__sub"
                style={{ color: "var(--yellow)" }}
              >
                NPC Star Mall
              </div>
            )}
            {hoveredSector.hasStarMall && !hoveredSector.isNpcStarmall && (
              <div
                className="sector-map-tooltip__sub"
                style={{ color: "var(--yellow)" }}
              >
                Star Mall
              </div>
            )}
            {hoveredSector.hasPlanets && (
              <div
                className="sector-map-tooltip__sub"
                style={{ color: "var(--blue)" }}
              >
                {hoveredSector.planetCount} Planet
                {hoveredSector.planetCount !== 1 ? "s" : ""}
                {hoveredSector.planetNames &&
                hoveredSector.planetNames.length > 0
                  ? ": " + hoveredSector.planetNames.join(", ")
                  : ""}
              </div>
            )}
            {hoveredSector.hasOutposts && (
              <div
                className="sector-map-tooltip__sub"
                style={{ color: "var(--green)" }}
              >
                {hoveredSector.outpostCount} Outpost
                {hoveredSector.outpostCount !== 1 ? "s" : ""}
                {hoveredSector.outpostNames &&
                hoveredSector.outpostNames.length > 0
                  ? ": " + hoveredSector.outpostNames.join(", ")
                  : ""}
              </div>
            )}
            {(hoveredSector.npcCount ?? 0) > 0 && (
              <div
                className="sector-map-tooltip__sub"
                style={{ color: "var(--red)" }}
              >
                {hoveredSector.npcCount} NPC
                {hoveredSector.npcCount !== 1 ? "s" : ""}
              </div>
            )}
            {hoveredSector.commodities && (
              <div
                className="sector-map-tooltip__sub"
                style={{ color: "var(--yellow)", fontSize: "0.615rem" }}
              >
                {[
                  hoveredSector.commodities.buysCyr && "Sell Cyr",
                  hoveredSector.commodities.sellsCyr && "Buy Cyr",
                  hoveredSector.commodities.buysFood && "Sell Food",
                  hoveredSector.commodities.sellsFood && "Buy Food",
                  hoveredSector.commodities.buysTech && "Sell Tech",
                  hoveredSector.commodities.sellsTech && "Buy Tech",
                  hoveredSector.commodities.sellsFuel && "Fuel",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            )}
          </div>
        )}
        {showLegend && (
          <div className="sector-map-legend-overlay">
            <div className="sector-map-legend-overlay__title">LEGEND</div>
            <div className="sector-map-legend-overlay__items">
              <span className="sector-map-legend-item">
                <span
                  style={{ color: "#56d4dd", textShadow: "0 0 4px #56d4dd" }}
                >
                  ✦
                </span>{" "}
                Current
              </span>
              <span className="sector-map-legend-item">
                <span
                  style={{ color: "#a0c8ff", textShadow: "0 0 3px #a0c8ff" }}
                >
                  ✦
                </span>{" "}
                Adjacent (click to warp)
              </span>
              <span className="sector-map-legend-item">
                <span style={{ color: "var(--yellow)", opacity: 0.7 }}>·</span>{" "}
                Star Mall
              </span>
              <span className="sector-map-legend-item">
                <span style={{ color: "var(--green)", opacity: 0.5 }}>◆</span>{" "}
                Outpost
              </span>
              <span className="sector-map-legend-item">
                <span style={{ color: "var(--blue)", opacity: 0.5 }}>●</span>{" "}
                Planet
              </span>
              <span className="sector-map-legend-item">
                <span style={{ color: "#d29922", opacity: 0.4 }}>⤏</span>{" "}
                One-way route
              </span>
              <div
                style={{
                  borderTop: "1px solid var(--border)",
                  marginTop: 4,
                  paddingTop: 4,
                }}
              >
                <span className="sector-map-legend-item">
                  <span
                    style={{ color: "#a0ffb0", textShadow: "0 0 3px #40a050" }}
                  >
                    ✦
                  </span>{" "}
                  Protected
                </span>
                <span className="sector-map-legend-item">
                  <span
                    style={{ color: "#a0c8ff", textShadow: "0 0 3px #4080c0" }}
                  >
                    ✦
                  </span>{" "}
                  Harmony
                </span>
                <span className="sector-map-legend-item">
                  <span
                    style={{ color: "#ffd080", textShadow: "0 0 3px #c08830" }}
                  >
                    ✦
                  </span>{" "}
                  One-way
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
