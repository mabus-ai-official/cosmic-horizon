import db from "../db/connection";
import { findShortestPath, SectorEdge } from "./universe";

/**
 * Target resolution types for dynamic mission locations.
 * Resolves sector IDs at mission accept / phase advance time based on
 * the player's current game state and the galaxy graph.
 */
export interface TargetResolution {
  type:
    | "nearest_starmall"
    | "nearest_outpost"
    | "nearest_outpost_selling"
    | "player_colony"
    | "npc_location"
    | "explored_frontier"
    | "specific_type"
    | "waypoints"
    | "galaxy_center"
    | "galaxy_center_waypoints";
  params?: {
    commodity?: string;
    sectorType?: string;
    npcId?: string;
    count?: number;
  };
}

export interface ResolvedTargets {
  /** Primary target sector ID */
  targetSectorId?: number;
  /** Multiple target sector IDs (for waypoints) */
  targetSectorIds?: number[];
  /** Human-readable location hint */
  locationHint?: string;
  /** Distance from player */
  distance?: number;
}

/**
 * Build an edge map from the database for BFS pathfinding.
 */
async function buildEdgeMap(
  playerId: string,
): Promise<Map<number, SectorEdge[]>> {
  const player = await db("players").where({ id: playerId }).first();
  const edgeQuery =
    player?.game_mode === "singleplayer"
      ? db("sector_edges")
          .join("sectors", "sector_edges.from_sector_id", "sectors.id")
          .where("sectors.owner_id", playerId)
          .select(
            "sector_edges.from_sector_id",
            "sector_edges.to_sector_id",
            "sector_edges.one_way",
          )
      : db("sector_edges").select("from_sector_id", "to_sector_id", "one_way");

  const edgeRows = await edgeQuery;
  const edgeMap = new Map<number, SectorEdge[]>();

  for (const row of edgeRows) {
    const from = row.from_sector_id;
    const to = row.to_sector_id;
    const fromList = edgeMap.get(from) || [];
    fromList.push({ from, to, oneWay: !!row.one_way });
    edgeMap.set(from, fromList);
    if (!row.one_way) {
      const toList = edgeMap.get(to) || [];
      if (!toList.some((e: SectorEdge) => e.to === from)) {
        toList.push({ from: to, to: from, oneWay: false });
        edgeMap.set(to, toList);
      }
    }
  }

  return edgeMap;
}

/**
 * Find the nearest sector matching a filter using BFS.
 */
function bfsNearest(
  edgeMap: Map<number, SectorEdge[]>,
  start: number,
  matchFn: (sectorId: number) => boolean,
  maxDepth: number = 200,
): { sectorId: number; distance: number; path: number[] } | null {
  if (matchFn(start)) return { sectorId: start, distance: 0, path: [start] };

  const visited = new Set<number>();
  const queue: Array<{ node: number; path: number[] }> = [
    { node: start, path: [start] },
  ];
  visited.add(start);

  while (queue.length > 0) {
    const { node, path } = queue.shift()!;
    if (path.length > maxDepth) continue;

    for (const edge of edgeMap.get(node) || []) {
      if (visited.has(edge.to)) continue;
      const newPath = [...path, edge.to];
      if (matchFn(edge.to)) {
        return {
          sectorId: edge.to,
          distance: newPath.length - 1,
          path: newPath,
        };
      }
      visited.add(edge.to);
      queue.push({ node: edge.to, path: newPath });
    }
  }
  return null;
}

/**
 * Pick N evenly-spaced waypoints along a BFS path.
 */
function pickWaypoints(path: number[], count: number): number[] {
  if (path.length <= 2) return path.slice(1);
  const waypoints: number[] = [];
  const step = Math.max(1, Math.floor((path.length - 1) / (count + 1)));
  for (let i = 1; i <= count && i * step < path.length; i++) {
    waypoints.push(path[i * step]);
  }
  // Always include the destination
  const dest = path[path.length - 1];
  if (!waypoints.includes(dest)) {
    waypoints.push(dest);
  }
  return waypoints.slice(0, count);
}

/**
 * Resolve dynamic targets for a mission phase based on player state.
 * Called when a mission is accepted or a phase advances.
 */
export async function resolveTargets(
  playerId: string,
  resolution: TargetResolution,
): Promise<ResolvedTargets> {
  const player = await db("players").where({ id: playerId }).first();
  if (!player) return {};

  const currentSectorId = player.current_sector_id;
  const universe = player.game_mode === "singleplayer" ? "sp" : "mp";

  switch (resolution.type) {
    case "nearest_starmall": {
      const malls = await db("sectors")
        .where({ has_star_mall: true, universe })
        .select("id");
      if (malls.length === 0) return {};

      const edgeMap = await buildEdgeMap(playerId);
      let best: { sectorId: number; distance: number } | null = null;
      for (const mall of malls) {
        const path = findShortestPath(edgeMap, currentSectorId, mall.id, 200);
        if (path && (!best || path.length - 1 < best.distance)) {
          best = { sectorId: mall.id, distance: path.length - 1 };
        }
      }

      if (!best) return {};
      const outpost = await db("outposts")
        .where({ sector_id: best.sectorId })
        .first();
      return {
        targetSectorId: best.sectorId,
        distance: best.distance,
        locationHint: outpost
          ? `${outpost.name} in Sector ${best.sectorId}`
          : `Starmall in Sector ${best.sectorId}`,
      };
    }

    case "nearest_outpost": {
      const outposts = await db("outposts")
        .join("sectors", "outposts.sector_id", "sectors.id")
        .where("sectors.universe", universe)
        .select("outposts.sector_id", "outposts.name");
      if (outposts.length === 0) return {};

      const edgeMap = await buildEdgeMap(playerId);
      const outpostSet = new Set(outposts.map((o: any) => o.sector_id));
      const result = bfsNearest(edgeMap, currentSectorId, (sid) =>
        outpostSet.has(sid),
      );
      if (!result) return {};

      const outpost = outposts.find(
        (o: any) => o.sector_id === result.sectorId,
      );
      return {
        targetSectorId: result.sectorId,
        distance: result.distance,
        locationHint: outpost
          ? `${outpost.name} in Sector ${result.sectorId}`
          : `Outpost in Sector ${result.sectorId}`,
      };
    }

    case "nearest_outpost_selling": {
      const commodity = resolution.params?.commodity;
      if (!commodity) return {};

      const modeCol = `${commodity}_mode`;
      const outposts = await db("outposts")
        .where(modeCol, "sell")
        .join("sectors", "outposts.sector_id", "sectors.id")
        .where("sectors.universe", universe)
        .select("outposts.sector_id", "outposts.name");
      if (outposts.length === 0) return {};

      const edgeMap = await buildEdgeMap(playerId);
      const outpostSet = new Set(outposts.map((o: any) => o.sector_id));
      const result = bfsNearest(edgeMap, currentSectorId, (sid) =>
        outpostSet.has(sid),
      );
      if (!result) return {};

      const outpost = outposts.find(
        (o: any) => o.sector_id === result.sectorId,
      );
      return {
        targetSectorId: result.sectorId,
        distance: result.distance,
        locationHint: outpost
          ? `${outpost.name} in Sector ${result.sectorId} (sells ${commodity})`
          : `Outpost in Sector ${result.sectorId}`,
      };
    }

    case "player_colony": {
      const planet = await db("planets")
        .where({ owner_id: playerId })
        .whereNotNull("sector_id")
        .first();
      if (!planet) return { locationHint: "Claim a planet first" };
      return {
        targetSectorId: planet.sector_id,
        locationHint: `Your colony on ${planet.name || "your planet"} in Sector ${planet.sector_id}`,
      };
    }

    case "npc_location": {
      // Spawn NPC at nearest outpost; actual sector stored in phase_progress
      const outposts = await db("outposts")
        .join("sectors", "outposts.sector_id", "sectors.id")
        .where("sectors.universe", universe)
        .where("outposts.sector_id", "!=", currentSectorId)
        .select("outposts.sector_id", "outposts.name");
      if (outposts.length === 0) return {};

      const edgeMap = await buildEdgeMap(playerId);
      const outpostSet = new Set(outposts.map((o: any) => o.sector_id));
      const result = bfsNearest(edgeMap, currentSectorId, (sid) =>
        outpostSet.has(sid),
      );
      if (!result) return {};

      const outpost = outposts.find(
        (o: any) => o.sector_id === result.sectorId,
      );
      const npcName = resolution.params?.npcId || "NPC";
      return {
        targetSectorId: result.sectorId,
        distance: result.distance,
        locationHint: outpost
          ? `${npcName} awaits at ${outpost.name} in Sector ${result.sectorId}`
          : `${npcName} awaits in Sector ${result.sectorId}`,
      };
    }

    case "explored_frontier": {
      const explored: number[] = JSON.parse(player.explored_sectors || "[]");
      if (explored.length === 0) return {};

      const edgeMap = await buildEdgeMap(playerId);
      // Frontier = explored sector with at least one unexplored neighbor
      const frontier: number[] = [];
      for (const sid of explored) {
        const neighbors = edgeMap.get(sid) || [];
        if (neighbors.some((e) => !explored.includes(e.to))) {
          frontier.push(sid);
        }
      }
      if (frontier.length === 0) return {};

      const pick = frontier[Math.floor(Math.random() * frontier.length)];
      return {
        targetSectorId: pick,
        locationHint: `Frontier Sector ${pick}`,
      };
    }

    case "specific_type": {
      const sectorType = resolution.params?.sectorType;
      if (!sectorType) return {};

      const sectors = await db("sectors")
        .where({ type: sectorType, universe })
        .select("id");
      if (sectors.length === 0) return {};

      const edgeMap = await buildEdgeMap(playerId);
      const sectorSet = new Set(sectors.map((s: any) => s.id));
      const result = bfsNearest(edgeMap, currentSectorId, (sid) =>
        sectorSet.has(sid),
      );
      if (!result) return {};

      return {
        targetSectorId: result.sectorId,
        distance: result.distance,
        locationHint: `Sector ${result.sectorId} (${sectorType})`,
      };
    }

    case "waypoints": {
      const count = resolution.params?.count || 3;
      // Pick random explored sectors as waypoints
      const explored: number[] = JSON.parse(player.explored_sectors || "[]");
      const edgeMap = await buildEdgeMap(playerId);

      // BFS outward from player, collecting sectors
      const visited: number[] = [];
      const queue = [currentSectorId];
      const seen = new Set([currentSectorId]);
      while (queue.length > 0 && visited.length < count * 3) {
        const node = queue.shift()!;
        visited.push(node);
        for (const edge of edgeMap.get(node) || []) {
          if (!seen.has(edge.to)) {
            seen.add(edge.to);
            queue.push(edge.to);
          }
        }
      }

      // Pick evenly spaced
      const waypoints = pickWaypoints(visited, count);
      return {
        targetSectorIds: waypoints,
        locationHint: waypoints.map((s) => `Sector ${s}`).join(", "),
      };
    }

    case "galaxy_center": {
      const core = await db("sectors")
        .where({ type: "core", universe })
        .first();
      if (!core) return {};

      const edgeMap = await buildEdgeMap(playerId);
      const path = findShortestPath(edgeMap, currentSectorId, core.id, 500);
      return {
        targetSectorId: core.id,
        distance: path ? path.length - 1 : undefined,
        locationHint: `Galaxy Core — Sector ${core.id}`,
      };
    }

    case "galaxy_center_waypoints": {
      const count = resolution.params?.count || 4;
      const core = await db("sectors")
        .where({ type: "core", universe })
        .first();
      if (!core) return {};

      const edgeMap = await buildEdgeMap(playerId);
      const path = findShortestPath(edgeMap, currentSectorId, core.id, 500);
      if (!path) return {};

      const waypoints = pickWaypoints(path, count);
      return {
        targetSectorIds: waypoints,
        locationHint: waypoints.map((s) => `Sector ${s}`).join(" → "),
        distance: path.length - 1,
      };
    }

    default:
      return {};
  }
}

/**
 * Rebuild objectives_detail text with resolved sector numbers.
 * Takes the phase description template and replaces placeholders with real data.
 */
export function enrichDescription(
  description: string,
  resolved: ResolvedTargets,
): string {
  let enriched = description;
  if (resolved.targetSectorId) {
    enriched += ` — Sector ${resolved.targetSectorId}`;
    if (resolved.distance) {
      enriched += ` (${resolved.distance} sectors away)`;
    }
  }
  if (resolved.locationHint && !enriched.includes(resolved.locationHint)) {
    enriched += `. ${resolved.locationHint}`;
  }
  return enriched;
}
