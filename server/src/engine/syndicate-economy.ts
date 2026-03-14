import crypto from "crypto";
import db from "../db/connection";
import { GAME_CONFIG } from "../config/game";
import { calculateProductionWithFactoryBonus } from "./planets";
import { type RacePopulation } from "./happiness";
import { settleResourceDebit, settleResourceCredit } from "../chain/tx-queue";

// === Helper ===

export async function getMemberSyndicate(
  playerId: string,
): Promise<{ syndicateId: string; role: string }> {
  const membership = await db("syndicate_members")
    .where({ player_id: playerId })
    .first();
  if (!membership) throw new Error("You are not in a syndicate");
  return { syndicateId: membership.syndicate_id, role: membership.role };
}

// === Pool Management ===

export async function getPoolResources(syndicateId: string) {
  const resources = await db("syndicate_resource_pool")
    .join(
      "resource_definitions",
      "syndicate_resource_pool.resource_id",
      "resource_definitions.id",
    )
    .where({ "syndicate_resource_pool.syndicate_id": syndicateId })
    .where("syndicate_resource_pool.quantity", ">", 0)
    .select(
      "resource_definitions.id as resourceId",
      "resource_definitions.name",
      "syndicate_resource_pool.quantity",
      "resource_definitions.tier",
      "resource_definitions.category",
    );

  // Get permissions for all members
  const permissions = await db("syndicate_pool_permissions")
    .join("players", "syndicate_pool_permissions.player_id", "players.id")
    .where({ "syndicate_pool_permissions.syndicate_id": syndicateId })
    .select(
      "players.id as playerId",
      "players.username",
      "syndicate_pool_permissions.level",
    );

  return { resources, permissions };
}

export async function depositToPool(
  playerId: string,
  resourceId: string,
  quantity: number,
) {
  if (quantity <= 0) throw new Error("Quantity must be positive");

  const { syndicateId } = await getMemberSyndicate(playerId);

  // Check permission (deposit or higher)
  const perm = await db("syndicate_pool_permissions")
    .where({ syndicate_id: syndicateId, player_id: playerId })
    .first();
  const level = perm?.level || "none";
  if (level === "none")
    throw new Error("You do not have permission to deposit to the pool");

  // Check player has the resource
  const playerRes = await db("player_resources")
    .where({ player_id: playerId, resource_id: resourceId })
    .first();
  if (!playerRes || playerRes.quantity < quantity) {
    throw new Error(
      `Not enough resources (have ${playerRes?.quantity || 0}, need ${quantity})`,
    );
  }

  // Deduct from player
  await db("player_resources")
    .where({ player_id: playerId, resource_id: resourceId })
    .decrement("quantity", quantity);
  // Chain settlement: debit resource from player's MemberContract
  await settleResourceDebit(playerId, resourceId, quantity, "syndicate");

  // Add to pool
  const existing = await db("syndicate_resource_pool")
    .where({ syndicate_id: syndicateId, resource_id: resourceId })
    .first();
  if (existing) {
    await db("syndicate_resource_pool")
      .where({ syndicate_id: syndicateId, resource_id: resourceId })
      .increment("quantity", quantity);
  } else {
    await db("syndicate_resource_pool").insert({
      syndicate_id: syndicateId,
      resource_id: resourceId,
      quantity,
    });
  }

  // Log
  const resDef = await db("resource_definitions")
    .where({ id: resourceId })
    .first();
  await db("syndicate_pool_log").insert({
    id: crypto.randomUUID(),
    syndicate_id: syndicateId,
    player_id: playerId,
    action: "deposit",
    resource_id: resourceId,
    quantity,
    details: null,
    created_at: new Date().toISOString(),
  });

  return { deposited: quantity, resourceName: resDef?.name || resourceId };
}

export async function withdrawFromPool(
  playerId: string,
  resourceId: string,
  quantity: number,
) {
  if (quantity <= 0) throw new Error("Quantity must be positive");

  const { syndicateId } = await getMemberSyndicate(playerId);

  // Check permission (full or manager)
  const perm = await db("syndicate_pool_permissions")
    .where({ syndicate_id: syndicateId, player_id: playerId })
    .first();
  const level = perm?.level || "none";
  if (level !== "full" && level !== "manager") {
    throw new Error("You do not have permission to withdraw from the pool");
  }

  // Check pool has the resource
  const poolRes = await db("syndicate_resource_pool")
    .where({ syndicate_id: syndicateId, resource_id: resourceId })
    .first();
  if (!poolRes || poolRes.quantity < quantity) {
    throw new Error(
      `Not enough in pool (have ${poolRes?.quantity || 0}, need ${quantity})`,
    );
  }

  // Deduct from pool
  await db("syndicate_resource_pool")
    .where({ syndicate_id: syndicateId, resource_id: resourceId })
    .decrement("quantity", quantity);

  // Add to player
  const playerRes = await db("player_resources")
    .where({ player_id: playerId, resource_id: resourceId })
    .first();
  if (playerRes) {
    await db("player_resources")
      .where({ player_id: playerId, resource_id: resourceId })
      .increment("quantity", quantity);
  } else {
    await db("player_resources").insert({
      player_id: playerId,
      resource_id: resourceId,
      quantity,
    });
  }
  // Chain settlement: credit resource to player's MemberContract
  await settleResourceCredit(playerId, resourceId, quantity, "syndicate");

  // Log
  const resDef = await db("resource_definitions")
    .where({ id: resourceId })
    .first();
  await db("syndicate_pool_log").insert({
    id: crypto.randomUUID(),
    syndicate_id: syndicateId,
    player_id: playerId,
    action: "withdraw",
    resource_id: resourceId,
    quantity,
    details: null,
    created_at: new Date().toISOString(),
  });

  return { withdrawn: quantity, resourceName: resDef?.name || resourceId };
}

export async function setPoolPermission(
  setterId: string,
  targetPlayerId: string,
  level: string,
) {
  const validLevels = ["none", "deposit", "full", "manager"];
  if (!validLevels.includes(level)) {
    throw new Error(
      `Invalid permission level. Must be one of: ${validLevels.join(", ")}`,
    );
  }

  const { syndicateId, role } = await getMemberSyndicate(setterId);

  // Only leader, officer, or manager can set permissions
  if (role !== "leader" && role !== "officer") {
    const setterPerm = await db("syndicate_pool_permissions")
      .where({ syndicate_id: syndicateId, player_id: setterId })
      .first();
    if (setterPerm?.level !== "manager") {
      throw new Error(
        "Only leaders, officers, or pool managers can set permissions",
      );
    }
  }

  // Target must be in the syndicate
  const targetMember = await db("syndicate_members")
    .where({ syndicate_id: syndicateId, player_id: targetPlayerId })
    .first();
  if (!targetMember) throw new Error("Target player is not in your syndicate");

  // Upsert permission
  const existing = await db("syndicate_pool_permissions")
    .where({ syndicate_id: syndicateId, player_id: targetPlayerId })
    .first();
  if (existing) {
    await db("syndicate_pool_permissions")
      .where({ syndicate_id: syndicateId, player_id: targetPlayerId })
      .update({ level });
  } else {
    await db("syndicate_pool_permissions").insert({
      syndicate_id: syndicateId,
      player_id: targetPlayerId,
      level,
    });
  }

  const targetPlayer = await db("players")
    .where({ id: targetPlayerId })
    .first();
  return { playerName: targetPlayer?.username || targetPlayerId, level };
}

export async function getPoolLog(syndicateId: string, limit: number = 50) {
  return db("syndicate_pool_log")
    .join("players", "syndicate_pool_log.player_id", "players.id")
    .leftJoin(
      "resource_definitions",
      "syndicate_pool_log.resource_id",
      "resource_definitions.id",
    )
    .where({ "syndicate_pool_log.syndicate_id": syndicateId })
    .orderBy("syndicate_pool_log.created_at", "desc")
    .limit(limit)
    .select(
      "syndicate_pool_log.id",
      "players.username",
      "syndicate_pool_log.action",
      "resource_definitions.name as resourceName",
      "syndicate_pool_log.quantity",
      "syndicate_pool_log.details",
      "syndicate_pool_log.created_at as createdAt",
    );
}

// === Factory Management ===

export async function designateFactory(playerId: string, planetId: string) {
  const { syndicateId, role } = await getMemberSyndicate(playerId);
  if (role !== "leader" && role !== "officer") {
    throw new Error("Only leaders and officers can designate factory planets");
  }

  // Check planet ownership
  const planet = await db("planets").where({ id: planetId }).first();
  if (!planet) throw new Error("Planet not found");
  if (planet.owner_id !== playerId)
    throw new Error("You do not own this planet");
  if (planet.upgrade_level < GAME_CONFIG.SYNDICATE_FACTORY_MIN_LEVEL) {
    throw new Error(
      `Planet must be level ${GAME_CONFIG.SYNDICATE_FACTORY_MIN_LEVEL} or higher`,
    );
  }
  if (planet.is_syndicate_factory)
    throw new Error("This planet is already a factory");

  // Check max factories
  const factoryCount = await db("planets")
    .where({ factory_syndicate_id: syndicateId, is_syndicate_factory: true })
    .count("id as count")
    .first();
  if (Number(factoryCount?.count || 0) >= GAME_CONFIG.SYNDICATE_MAX_FACTORIES) {
    throw new Error(
      `Syndicate already has the maximum number of factories (${GAME_CONFIG.SYNDICATE_MAX_FACTORIES})`,
    );
  }

  // Check treasury
  const syndicate = await db("syndicates").where({ id: syndicateId }).first();
  if (
    !syndicate ||
    Number(syndicate.treasury) < GAME_CONFIG.SYNDICATE_FACTORY_COST
  ) {
    throw new Error(
      `Not enough in treasury (need ${GAME_CONFIG.SYNDICATE_FACTORY_COST.toLocaleString()} credits)`,
    );
  }

  // Deduct from treasury
  await db("syndicates")
    .where({ id: syndicateId })
    .decrement("treasury", GAME_CONFIG.SYNDICATE_FACTORY_COST);

  // Set factory flags
  await db("planets").where({ id: planetId }).update({
    is_syndicate_factory: true,
    factory_syndicate_id: syndicateId,
  });

  return { planetName: planet.name, cost: GAME_CONFIG.SYNDICATE_FACTORY_COST };
}

export async function revokeFactory(playerId: string) {
  const { syndicateId, role } = await getMemberSyndicate(playerId);
  if (role !== "leader") {
    throw new Error(
      "Only the syndicate leader can revoke a factory designation",
    );
  }

  const factory = await db("planets")
    .where({ factory_syndicate_id: syndicateId, is_syndicate_factory: true })
    .first();
  if (!factory) throw new Error("No factory planet found");

  await db("planets").where({ id: factory.id }).update({
    is_syndicate_factory: false,
    factory_syndicate_id: null,
  });

  // Clear whitelist
  await db("syndicate_factory_whitelist")
    .where({ planet_id: factory.id })
    .del();

  return { planetName: factory.name };
}

export async function getFactoryStatus(syndicateId: string) {
  const factory = await db("planets")
    .where({ factory_syndicate_id: syndicateId, is_syndicate_factory: true })
    .first();

  if (!factory) return { hasFactory: false };

  const owner = await db("players").where({ id: factory.owner_id }).first();

  // Load race populations for factory
  let racePopulations: RacePopulation[] = [];
  try {
    racePopulations = await db("planet_colonists")
      .where({ planet_id: factory.id })
      .select("race", "count");
  } catch {
    /* table may not exist yet */
  }
  if (racePopulations.length === 0) {
    racePopulations = [{ race: "unknown", count: factory.colonists }];
  }

  const production = calculateProductionWithFactoryBonus(
    factory.planet_class,
    racePopulations,
    factory.happiness || 50,
    true,
  );

  return {
    hasFactory: true,
    planet: {
      id: factory.id,
      name: factory.name,
      planetClass: factory.planet_class,
      upgradeLevel: factory.upgrade_level,
      colonists: factory.colonists,
      ownerName: owner?.username || "Unknown",
      production,
    },
  };
}

export async function processFactoryProduction(planet: any) {
  if (!planet.factory_syndicate_id || !planet.owner_id || planet.colonists <= 0)
    return;

  // Load race populations for factory
  let racePopulations: RacePopulation[] = [];
  try {
    racePopulations = await db("planet_colonists")
      .where({ planet_id: planet.id })
      .select("race", "count");
  } catch {
    /* table may not exist yet */
  }
  if (racePopulations.length === 0) {
    racePopulations = [{ race: "unknown", count: planet.colonists }];
  }

  const production = calculateProductionWithFactoryBonus(
    planet.planet_class,
    racePopulations,
    planet.happiness || 50,
    true,
  );

  // Deposit base commodities to pool as resources
  const commodities = [
    { resourceId: "cyrillium", amount: production.cyrillium },
    { resourceId: "tech", amount: production.tech },
  ];

  for (const commodity of commodities) {
    if (commodity.amount <= 0) continue;
    const existing = await db("syndicate_resource_pool")
      .where({
        syndicate_id: planet.factory_syndicate_id,
        resource_id: commodity.resourceId,
      })
      .first();
    if (existing) {
      await db("syndicate_resource_pool")
        .where({
          syndicate_id: planet.factory_syndicate_id,
          resource_id: commodity.resourceId,
        })
        .increment("quantity", commodity.amount);
    } else {
      await db("syndicate_resource_pool").insert({
        syndicate_id: planet.factory_syndicate_id,
        resource_id: commodity.resourceId,
        quantity: commodity.amount,
      });
    }
  }

  // Log the production
  const totalProduced = production.cyrillium + production.tech;
  if (totalProduced > 0) {
    await db("syndicate_pool_log").insert({
      id: crypto.randomUUID(),
      syndicate_id: planet.factory_syndicate_id,
      player_id: planet.owner_id,
      action: "factory_production",
      resource_id: null,
      quantity: totalProduced,
      details: JSON.stringify({
        cyrillium: production.cyrillium,
        tech: production.tech,
      }),
      created_at: new Date().toISOString(),
    });
  }
}

// === Mega-Projects ===

export async function startProject(
  playerId: string,
  projectTypeId: string,
  targetSectorId?: number,
) {
  const { syndicateId, role } = await getMemberSyndicate(playerId);
  if (role !== "leader") {
    throw new Error("Only the syndicate leader can start mega-projects");
  }

  // Check definition exists
  const definition = await db("mega_project_definitions")
    .where({ id: projectTypeId })
    .first();
  if (!definition) throw new Error("Unknown project type");

  // Check min members
  const memberCount = await db("syndicate_members")
    .where({ syndicate_id: syndicateId })
    .count("player_id as count")
    .first();
  if (Number(memberCount?.count || 0) < definition.min_syndicate_members) {
    throw new Error(
      `Need at least ${definition.min_syndicate_members} members to start this project`,
    );
  }

  // Check active project limit
  const activeCount = await db("syndicate_projects")
    .where({ syndicate_id: syndicateId })
    .whereIn("status", ["in_progress", "building"])
    .count("id as count")
    .first();
  if (
    Number(activeCount?.count || 0) >= GAME_CONFIG.SYNDICATE_MAX_ACTIVE_PROJECTS
  ) {
    throw new Error(
      `Cannot have more than ${GAME_CONFIG.SYNDICATE_MAX_ACTIVE_PROJECTS} active projects`,
    );
  }

  const projectId = crypto.randomUUID();
  await db("syndicate_projects").insert({
    id: projectId,
    syndicate_id: syndicateId,
    project_type: projectTypeId,
    target_sector_id: targetSectorId || null,
    credits_contributed: 0,
    resources_contributed: "{}",
    status: "in_progress",
    started_at: new Date().toISOString(),
  });

  const requirements = JSON.parse(definition.resource_requirements);
  return {
    projectId,
    projectName: definition.name,
    creditsCost: definition.credits_cost,
    resourceRequirements: requirements,
    buildTimeHours: definition.build_time_hours,
  };
}

export async function contributeToProject(
  playerId: string,
  projectId: string,
  resourceId: string | null,
  quantity: number,
  fromPool: boolean = false,
) {
  if (quantity <= 0) throw new Error("Quantity must be positive");

  const { syndicateId } = await getMemberSyndicate(playerId);

  const project = await db("syndicate_projects")
    .where({ id: projectId, syndicate_id: syndicateId })
    .first();
  if (!project) throw new Error("Project not found");
  if (project.status !== "in_progress")
    throw new Error("Project is not accepting contributions");

  const definition = await db("mega_project_definitions")
    .where({ id: project.project_type })
    .first();
  if (!definition) throw new Error("Project definition not found");

  if (resourceId === null) {
    // Credits contribution
    if (fromPool) throw new Error("Cannot contribute credits from pool");

    const player = await db("players").where({ id: playerId }).first();
    if (!player || Number(player.credits) < quantity) {
      throw new Error(`Not enough credits (have ${player?.credits || 0})`);
    }

    // Check how much is still needed
    const remaining = definition.credits_cost - project.credits_contributed;
    const actual = Math.min(quantity, remaining);
    if (actual <= 0) throw new Error("Credits requirement already met");

    await db("players").where({ id: playerId }).decrement("credits", actual);
    await settleResourceDebit(playerId, "credits", actual, "syndicate");
    await db("syndicate_projects")
      .where({ id: projectId })
      .increment("credits_contributed", actual);

    // Log contribution
    await db("syndicate_project_contributions").insert({
      id: crypto.randomUUID(),
      project_id: projectId,
      player_id: playerId,
      resource_id: null,
      quantity: actual,
      source: "personal",
      contributed_at: new Date().toISOString(),
    });

    // Check if fully funded
    await checkProjectFullyFunded(projectId);

    return { contributed: actual, type: "credits" };
  } else {
    // Resource contribution
    const requirements = JSON.parse(definition.resource_requirements) as {
      resourceId: string;
      quantity: number;
    }[];
    const req = requirements.find((r) => r.resourceId === resourceId);
    if (!req) throw new Error("This resource is not required for this project");

    const contributed = JSON.parse(project.resources_contributed) as Record<
      string,
      number
    >;
    const alreadyContributed = contributed[resourceId] || 0;
    const remaining = req.quantity - alreadyContributed;
    const actual = Math.min(quantity, remaining);
    if (actual <= 0)
      throw new Error("This resource requirement is already met");

    if (fromPool) {
      // Check pool permission
      const perm = await db("syndicate_pool_permissions")
        .where({ syndicate_id: syndicateId, player_id: playerId })
        .first();
      const permLevel = perm?.level || "none";
      if (permLevel !== "full" && permLevel !== "manager") {
        throw new Error(
          "You need full or manager pool access to contribute from pool",
        );
      }

      const poolRes = await db("syndicate_resource_pool")
        .where({ syndicate_id: syndicateId, resource_id: resourceId })
        .first();
      if (!poolRes || poolRes.quantity < actual) {
        throw new Error(`Not enough in pool (have ${poolRes?.quantity || 0})`);
      }
      await db("syndicate_resource_pool")
        .where({ syndicate_id: syndicateId, resource_id: resourceId })
        .decrement("quantity", actual);
    } else {
      const playerRes = await db("player_resources")
        .where({ player_id: playerId, resource_id: resourceId })
        .first();
      if (!playerRes || playerRes.quantity < actual) {
        throw new Error(
          `Not enough resources (have ${playerRes?.quantity || 0})`,
        );
      }
      await db("player_resources")
        .where({ player_id: playerId, resource_id: resourceId })
        .decrement("quantity", actual);
      // Chain settlement: debit resource from personal contribution
      await settleResourceDebit(playerId, resourceId!, actual, "syndicate");
    }

    // Update project contributions
    contributed[resourceId] = alreadyContributed + actual;
    await db("syndicate_projects")
      .where({ id: projectId })
      .update({ resources_contributed: JSON.stringify(contributed) });

    // Log contribution
    await db("syndicate_project_contributions").insert({
      id: crypto.randomUUID(),
      project_id: projectId,
      player_id: playerId,
      resource_id: resourceId,
      quantity: actual,
      source: fromPool ? "pool" : "personal",
      contributed_at: new Date().toISOString(),
    });

    const resDef = await db("resource_definitions")
      .where({ id: resourceId })
      .first();

    // Check if fully funded
    await checkProjectFullyFunded(projectId);

    return {
      contributed: actual,
      type: "resource",
      resourceName: resDef?.name || resourceId,
    };
  }
}

async function checkProjectFullyFunded(projectId: string) {
  const project = await db("syndicate_projects")
    .where({ id: projectId })
    .first();
  if (!project || project.status !== "in_progress") return;

  const definition = await db("mega_project_definitions")
    .where({ id: project.project_type })
    .first();
  if (!definition) return;

  // Check credits
  if (project.credits_contributed < definition.credits_cost) return;

  // Check resources
  const requirements = JSON.parse(definition.resource_requirements) as {
    resourceId: string;
    quantity: number;
  }[];
  const contributed = JSON.parse(project.resources_contributed) as Record<
    string,
    number
  >;

  for (const req of requirements) {
    if ((contributed[req.resourceId] || 0) < req.quantity) return;
  }

  // All requirements met — start building
  await db("syndicate_projects").where({ id: projectId }).update({
    status: "building",
    build_started_at: new Date().toISOString(),
  });
}

export async function checkAndCompleteProjects() {
  const now = new Date();
  const buildingProjects = await db("syndicate_projects")
    .where({ status: "building" })
    .whereNotNull("build_started_at");

  for (const project of buildingProjects) {
    const definition = await db("mega_project_definitions")
      .where({ id: project.project_type })
      .first();
    if (!definition) continue;

    const buildStarted = new Date(project.build_started_at);
    const buildEnd = new Date(
      buildStarted.getTime() + definition.build_time_hours * 60 * 60 * 1000,
    );

    if (now >= buildEnd) {
      // Create structure
      await db("syndicate_structures").insert({
        id: crypto.randomUUID(),
        syndicate_id: project.syndicate_id,
        structure_type: definition.structure_type,
        name: definition.name,
        sector_id: project.target_sector_id,
        data: JSON.stringify({ projectId: project.id }),
        health: 100,
        active: true,
        created_at: now.toISOString(),
      });

      // Complete project
      await db("syndicate_projects").where({ id: project.id }).update({
        status: "completed",
        completed_at: now.toISOString(),
      });
    }
  }
}

export async function getProjectDetail(projectId: string) {
  const project = await db("syndicate_projects")
    .where({ id: projectId })
    .first();
  if (!project) throw new Error("Project not found");

  const definition = await db("mega_project_definitions")
    .where({ id: project.project_type })
    .first();
  if (!definition) throw new Error("Project definition not found");

  const contributions = await db("syndicate_project_contributions")
    .join("players", "syndicate_project_contributions.player_id", "players.id")
    .leftJoin(
      "resource_definitions",
      "syndicate_project_contributions.resource_id",
      "resource_definitions.id",
    )
    .where({ project_id: projectId })
    .orderBy("syndicate_project_contributions.contributed_at", "desc")
    .select(
      "players.username",
      "resource_definitions.name as resourceName",
      "syndicate_project_contributions.resource_id as resourceId",
      "syndicate_project_contributions.quantity",
      "syndicate_project_contributions.source",
      "syndicate_project_contributions.contributed_at as contributedAt",
    );

  const requirements = JSON.parse(definition.resource_requirements) as {
    resourceId: string;
    quantity: number;
  }[];
  const contributed = JSON.parse(project.resources_contributed) as Record<
    string,
    number
  >;

  // Build progress info
  const resourceProgress = [];
  for (const req of requirements) {
    const resDef = await db("resource_definitions")
      .where({ id: req.resourceId })
      .first();
    resourceProgress.push({
      resourceId: req.resourceId,
      resourceName: resDef?.name || req.resourceId,
      required: req.quantity,
      contributed: contributed[req.resourceId] || 0,
    });
  }

  let buildProgress = null;
  if (project.status === "building" && project.build_started_at) {
    const buildStarted = new Date(project.build_started_at);
    const buildEnd = new Date(
      buildStarted.getTime() + definition.build_time_hours * 60 * 60 * 1000,
    );
    const elapsed =
      (new Date().getTime() - buildStarted.getTime()) / (1000 * 60 * 60);
    buildProgress = {
      hoursElapsed: Math.floor(elapsed),
      hoursTotal: definition.build_time_hours,
      completesAt: buildEnd.toISOString(),
    };
  }

  return {
    id: project.id,
    projectName: definition.name,
    description: definition.description,
    status: project.status,
    creditsRequired: definition.credits_cost,
    creditsContributed: project.credits_contributed,
    resourceProgress,
    buildProgress,
    contributions,
    startedAt: project.started_at,
    completedAt: project.completed_at,
  };
}

export async function cancelProject(playerId: string, projectId: string) {
  const { syndicateId, role } = await getMemberSyndicate(playerId);
  if (role !== "leader") {
    throw new Error("Only the syndicate leader can cancel projects");
  }

  const project = await db("syndicate_projects")
    .where({ id: projectId, syndicate_id: syndicateId })
    .first();
  if (!project) throw new Error("Project not found");
  if (project.status === "completed")
    throw new Error("Cannot cancel a completed project");

  // Refund contributed resources to pool (not personal)
  const contributed = JSON.parse(project.resources_contributed) as Record<
    string,
    number
  >;
  for (const [resourceId, qty] of Object.entries(contributed)) {
    if (qty <= 0) continue;
    const existing = await db("syndicate_resource_pool")
      .where({ syndicate_id: syndicateId, resource_id: resourceId })
      .first();
    if (existing) {
      await db("syndicate_resource_pool")
        .where({ syndicate_id: syndicateId, resource_id: resourceId })
        .increment("quantity", qty);
    } else {
      await db("syndicate_resource_pool").insert({
        syndicate_id: syndicateId,
        resource_id: resourceId,
        quantity: qty,
      });
    }
  }

  // Refund credits to treasury
  if (project.credits_contributed > 0) {
    await db("syndicates")
      .where({ id: syndicateId })
      .increment("treasury", project.credits_contributed);
  }

  await db("syndicate_projects").where({ id: projectId }).update({
    status: "cancelled",
  });

  return {
    refundedResources: contributed,
    refundedCredits: project.credits_contributed,
  };
}

export async function getProjectDefinitions() {
  const definitions = await db("mega_project_definitions").select("*");
  return definitions.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    creditsCost: d.credits_cost,
    buildTimeHours: d.build_time_hours,
    structureType: d.structure_type,
    resourceRequirements: JSON.parse(d.resource_requirements),
    minSyndicateMembers: d.min_syndicate_members,
  }));
}

export async function getSyndicateProjects(syndicateId: string) {
  const projects = await db("syndicate_projects")
    .join(
      "mega_project_definitions",
      "syndicate_projects.project_type",
      "mega_project_definitions.id",
    )
    .where({ "syndicate_projects.syndicate_id": syndicateId })
    .orderBy("syndicate_projects.started_at", "desc")
    .select(
      "syndicate_projects.id",
      "mega_project_definitions.name as projectName",
      "mega_project_definitions.credits_cost as creditsRequired",
      "syndicate_projects.credits_contributed as creditsContributed",
      "mega_project_definitions.resource_requirements as resourceRequirements",
      "syndicate_projects.resources_contributed as resourcesContributed",
      "syndicate_projects.status",
      "syndicate_projects.started_at as startedAt",
      "syndicate_projects.build_started_at as buildStartedAt",
      "syndicate_projects.completed_at as completedAt",
      "mega_project_definitions.build_time_hours as buildTimeHours",
    );

  return projects.map((p) => {
    const requirements = JSON.parse(p.resourceRequirements) as {
      resourceId: string;
      quantity: number;
    }[];
    const contributed = JSON.parse(p.resourcesContributed) as Record<
      string,
      number
    >;
    const totalRequired = requirements.reduce((sum, r) => sum + r.quantity, 0);
    const totalContributed = requirements.reduce(
      (sum, r) => sum + (contributed[r.resourceId] || 0),
      0,
    );
    const creditsPercent =
      p.creditsRequired > 0
        ? Math.floor((p.creditsContributed / p.creditsRequired) * 100)
        : 100;
    const resourcesPercent =
      totalRequired > 0
        ? Math.floor((totalContributed / totalRequired) * 100)
        : 100;

    return {
      id: p.id,
      projectName: p.projectName,
      status: p.status,
      creditsPercent,
      resourcesPercent,
      startedAt: p.startedAt,
      buildStartedAt: p.buildStartedAt,
      completedAt: p.completedAt,
      buildTimeHours: p.buildTimeHours,
    };
  });
}

// === Structures ===

export async function getSyndicateStructures(syndicateId: string) {
  return db("syndicate_structures")
    .where({ syndicate_id: syndicateId })
    .orderBy("created_at", "desc")
    .select(
      "id",
      "structure_type as structureType",
      "name",
      "sector_id as sectorId",
      "health",
      "active",
      "created_at as createdAt",
    );
}

export async function getStructuresInSector(sectorId: number) {
  return db("syndicate_structures")
    .where({ sector_id: sectorId, active: true })
    .select(
      "id",
      "syndicate_id as syndicateId",
      "structure_type as structureType",
      "name",
      "health",
    );
}
