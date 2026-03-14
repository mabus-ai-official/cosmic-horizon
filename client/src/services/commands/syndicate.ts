/**
 * Syndicate commands — syndicatepool, syndicate, syndicate-create, syndicate-invite, etc.
 * Manages player guilds (syndicates) including shared resource pools,
 * membership, invitations, and cooperative economy features.
 */
import * as api from "../api";
import type { CommandHandler } from "./types";
import { resolveItem, getTimeAgo } from "./utils";

export const syndicateCommands: Record<string, CommandHandler> = {
  syndicatepool: (_args, ctx) => {
    api
      .getSyndicatePool()
      .then(({ data }) => {
        ctx.addLine("=== SYNDICATE RESOURCE POOL ===", "system");
        if (data.resources.length === 0) {
          ctx.addLine("  Pool is empty", "info");
        } else {
          for (const r of data.resources) {
            ctx.addLine(`  ${r.name.padEnd(25)} x${r.quantity}`, "trade");
          }
        }
        if (data.permissions.length > 0) {
          ctx.addLine("", "info");
          ctx.addLine("Pool Access:", "system");
          for (const p of data.permissions) {
            ctx.addLine(`  ${p.username.padEnd(20)} ${p.level}`, "info");
          }
        }
      })
      .catch((err: any) =>
        ctx.addLine(
          err.response?.data?.error || "Failed to fetch pool",
          "error",
        ),
      );
  },

  syndicatedeposit: (args, ctx) => {
    if (args.length < 2) {
      ctx.addLine("Usage: sd <resource> <quantity>", "error");
      return;
    }
    const qty = parseInt(args[args.length - 1]);
    if (isNaN(qty)) {
      ctx.addLine("Quantity must be a number", "error");
      return;
    }
    const resName = args.slice(0, -1).join("_").toLowerCase();
    api
      .depositToPool(resName, qty)
      .then(({ data }) => {
        ctx.addLine(
          `Deposited ${data.deposited} ${data.resourceName} to pool`,
          "success",
        );
        ctx.refreshStatus();
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Deposit failed", "error"),
      );
  },

  syndicatewithdraw: (args, ctx) => {
    if (args.length < 2) {
      ctx.addLine("Usage: sw <resource> <quantity>", "error");
      return;
    }
    const qty = parseInt(args[args.length - 1]);
    if (isNaN(qty)) {
      ctx.addLine("Quantity must be a number", "error");
      return;
    }
    const resName = args.slice(0, -1).join("_").toLowerCase();
    api
      .withdrawFromPool(resName, qty)
      .then(({ data }) => {
        ctx.addLine(
          `Withdrew ${data.withdrawn} ${data.resourceName} from pool`,
          "success",
        );
        ctx.refreshStatus();
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Withdraw failed", "error"),
      );
  },

  syndicate: (args, ctx) => {
    const sub = (args[0] || "").toLowerCase();

    if (!sub) {
      ctx.addLine("Syndicate economy subcommands:", "system");
      ctx.addLine(
        "  syndicate pool                View pool resources",
        "info",
      );
      ctx.addLine(
        "  syndicate deposit <res> <qty> Deposit to pool (alias: sd)",
        "info",
      );
      ctx.addLine(
        "  syndicate withdraw <res> <qty> Withdraw from pool (alias: sw)",
        "info",
      );
      ctx.addLine(
        "  syndicate pool-access <player> <level>  Set pool permission",
        "info",
      );
      ctx.addLine(
        "  syndicate pool-log            View pool transaction log",
        "info",
      );
      ctx.addLine(
        "  syndicate factory             View factory status",
        "info",
      );
      ctx.addLine(
        "  syndicate factory <planet>    Designate factory planet",
        "info",
      );
      ctx.addLine(
        "  syndicate projects            View active projects",
        "info",
      );
      ctx.addLine(
        "  syndicate start <type> [sector]  Start mega-project",
        "info",
      );
      ctx.addLine(
        "  syndicate contribute <res> <qty> [pool]  Contribute to project",
        "info",
      );
      ctx.addLine(
        "  syndicate project <#>         View project detail",
        "info",
      );
      ctx.addLine(
        "  syndicate structures          View syndicate structures",
        "info",
      );
      return;
    }

    switch (sub) {
      case "pool": {
        api
          .getSyndicatePool()
          .then(({ data }) => {
            ctx.addLine("=== SYNDICATE RESOURCE POOL ===", "system");
            if (data.resources.length === 0) {
              ctx.addLine("  Pool is empty", "info");
            } else {
              for (const r of data.resources) {
                ctx.addLine(`  ${r.name.padEnd(25)} x${r.quantity}`, "trade");
              }
            }
            if (data.permissions.length > 0) {
              ctx.addLine("", "info");
              ctx.addLine("Pool Access:", "system");
              for (const p of data.permissions) {
                ctx.addLine(`  ${p.username.padEnd(20)} ${p.level}`, "info");
              }
            }
          })
          .catch((err: any) =>
            ctx.addLine(
              err.response?.data?.error || "Failed to fetch pool",
              "error",
            ),
          );
        break;
      }

      case "deposit": {
        const subArgs = args.slice(1);
        if (subArgs.length < 2) {
          ctx.addLine(
            "Usage: syndicate deposit <resource> <quantity>",
            "error",
          );
          break;
        }
        const qty = parseInt(subArgs[subArgs.length - 1]);
        if (isNaN(qty)) {
          ctx.addLine("Quantity must be a number", "error");
          break;
        }
        const resName = subArgs.slice(0, -1).join("_").toLowerCase();
        api
          .depositToPool(resName, qty)
          .then(({ data }) => {
            ctx.addLine(
              `Deposited ${data.deposited} ${data.resourceName} to pool`,
              "success",
            );
            ctx.refreshStatus();
          })
          .catch((err: any) =>
            ctx.addLine(err.response?.data?.error || "Deposit failed", "error"),
          );
        break;
      }

      case "withdraw": {
        const subArgs = args.slice(1);
        if (subArgs.length < 2) {
          ctx.addLine(
            "Usage: syndicate withdraw <resource> <quantity>",
            "error",
          );
          break;
        }
        const qty = parseInt(subArgs[subArgs.length - 1]);
        if (isNaN(qty)) {
          ctx.addLine("Quantity must be a number", "error");
          break;
        }
        const resName = subArgs.slice(0, -1).join("_").toLowerCase();
        api
          .withdrawFromPool(resName, qty)
          .then(({ data }) => {
            ctx.addLine(
              `Withdrew ${data.withdrawn} ${data.resourceName} from pool`,
              "success",
            );
            ctx.refreshStatus();
          })
          .catch((err: any) =>
            ctx.addLine(
              err.response?.data?.error || "Withdraw failed",
              "error",
            ),
          );
        break;
      }

      case "pool-access": {
        const subArgs = args.slice(1);
        if (subArgs.length < 2) {
          ctx.addLine(
            "Usage: syndicate pool-access <player_name> <level>",
            "error",
          );
          ctx.addLine("  Levels: none, deposit, full, manager", "info");
          break;
        }
        const playerName = subArgs[0];
        const level = subArgs[1].toLowerCase();
        // Try sector players first, then syndicate members
        const sectorPlayer = ctx.sector?.players?.find(
          (p: any) => p.username.toLowerCase() === playerName.toLowerCase(),
        );
        if (sectorPlayer) {
          api
            .setPoolPermission(sectorPlayer.id, level)
            .then(({ data }) => {
              ctx.addLine(
                `Set ${data.playerName}'s pool access to: ${data.level}`,
                "success",
              );
            })
            .catch((err: any) =>
              ctx.addLine(
                err.response?.data?.error || "Failed to set permission",
                "error",
              ),
            );
        } else {
          // Look up via syndicate member list
          api
            .getSyndicate()
            .then(({ data }) => {
              const member = data.members?.find(
                (m: any) =>
                  m.username.toLowerCase() === playerName.toLowerCase(),
              );
              if (!member) {
                ctx.addLine(
                  `Player "${playerName}" not found in your syndicate`,
                  "error",
                );
                return;
              }
              return api.setPoolPermission(member.playerId || member.id, level);
            })
            .then((result: any) => {
              if (result?.data) {
                ctx.addLine(
                  `Set ${result.data.playerName}'s pool access to: ${result.data.level}`,
                  "success",
                );
              }
            })
            .catch((err: any) =>
              ctx.addLine(
                err.response?.data?.error || "Failed to set permission",
                "error",
              ),
            );
        }
        break;
      }

      case "pool-log": {
        api
          .getPoolLog(20)
          .then(({ data }) => {
            if (data.log.length === 0) {
              ctx.addLine("No pool transactions yet", "info");
              return;
            }
            ctx.addLine("=== POOL TRANSACTION LOG ===", "system");
            for (const entry of data.log) {
              const timeAgo = getTimeAgo(entry.createdAt);
              if (entry.action === "factory_production") {
                ctx.addLine(
                  `  ${entry.username.padEnd(16)} factory production   +${entry.quantity} total  (${timeAgo})`,
                  "trade",
                );
              } else {
                const resLabel = entry.resourceName || "credits";
                ctx.addLine(
                  `  ${entry.username.padEnd(16)} ${entry.action.padEnd(20)} ${resLabel} x${entry.quantity}  (${timeAgo})`,
                  "info",
                );
              }
            }
          })
          .catch((err: any) =>
            ctx.addLine(
              err.response?.data?.error || "Failed to fetch log",
              "error",
            ),
          );
        break;
      }

      case "factory": {
        const subArgs = args.slice(1);
        if (subArgs.length > 0) {
          // Designate factory planet
          const planetQuery = subArgs.join(" ");
          const planets = (ctx.sector?.planets ?? []).map((p: any) => ({
            id: p.id,
            name: p.name,
          }));
          const result = resolveItem(planetQuery, planets, ctx);
          if (result === null) {
            ctx.addLine("Planet not found in sector", "error");
            break;
          }
          if (result === "ambiguous") break;
          api
            .designateFactory(result.id)
            .then(({ data }) => {
              ctx.addLine(
                `Designated ${data.planetName} as syndicate factory!`,
                "success",
              );
              ctx.addLine(
                `Cost: ${data.cost.toLocaleString()} credits from treasury`,
                "trade",
              );
              ctx.refreshSector();
            })
            .catch((err: any) =>
              ctx.addLine(
                err.response?.data?.error || "Designation failed",
                "error",
              ),
            );
        } else {
          // View factory status
          api
            .getSyndicateFactory()
            .then(({ data }) => {
              if (!data.hasFactory) {
                ctx.addLine("No syndicate factory designated", "info");
                ctx.addLine(
                  'Use "syndicate factory <planet>" to designate one',
                  "info",
                );
                return;
              }
              ctx.addLine("=== SYNDICATE FACTORY ===", "system");
              const p = data.planet;
              ctx.addLine(
                `  ${p.name} [${p.planetClass}] Lv.${p.upgradeLevel}`,
                "info",
              );
              ctx.addLine(
                `  Owner: ${p.ownerName} | Colonists: ${p.colonists.toLocaleString()}`,
                "info",
              );
              ctx.addLine(
                `  Boosted Production/tick: Cyr=${p.production.cyrillium} Food=${p.production.food} Tech=${p.production.tech}`,
                "trade",
              );
            })
            .catch((err: any) =>
              ctx.addLine(
                err.response?.data?.error || "Failed to fetch factory",
                "error",
              ),
            );
        }
        break;
      }

      case "revoke-factory": {
        api
          .revokeFactory()
          .then(({ data }) => {
            ctx.addLine(
              `Factory designation revoked from ${data.planetName}`,
              "warning",
            );
          })
          .catch((err: any) =>
            ctx.addLine(err.response?.data?.error || "Revoke failed", "error"),
          );
        break;
      }

      case "projects": {
        api
          .getSyndicateProjects()
          .then(({ data }) => {
            if (data.projects.length === 0) {
              ctx.addLine("No syndicate projects", "info");
              ctx.addLine(
                'Use "syndicate start <type>" to begin a mega-project',
                "info",
              );
              return;
            }
            ctx.addLine("=== SYNDICATE PROJECTS ===", "system");
            data.projects.forEach((p: any, i: number) => {
              const statusLabel =
                p.status === "building"
                  ? "BUILDING"
                  : p.status === "completed"
                    ? "COMPLETE"
                    : `${p.creditsPercent}% cr / ${p.resourcesPercent}% res`;
              ctx.addLine(
                `  [${i + 1}] ${p.projectName.padEnd(25)} ${statusLabel}`,
                p.status === "completed" ? "success" : "info",
              );
            });
            ctx.setLastListing(
              data.projects.map((p: any) => ({
                id: p.id,
                label: p.projectName,
              })),
            );
          })
          .catch((err: any) =>
            ctx.addLine(
              err.response?.data?.error || "Failed to fetch projects",
              "error",
            ),
          );
        break;
      }

      case "start": {
        const subArgs = args.slice(1);
        if (subArgs.length < 1) {
          // Show available project types
          api
            .getMegaProjectDefinitions()
            .then(({ data }) => {
              ctx.addLine("=== MEGA-PROJECT TYPES ===", "system");
              for (const d of data.definitions) {
                ctx.addLine(`  ${d.id.padEnd(25)} ${d.name}`, "info");
                ctx.addLine(
                  `    Cost: ${d.creditsCost.toLocaleString()} cr | Build: ${d.buildTimeHours}h | Min members: ${d.minSyndicateMembers}`,
                  "trade",
                );
                for (const req of d.resourceRequirements) {
                  ctx.addLine(
                    `    - ${req.resourceId} x${req.quantity}`,
                    "info",
                  );
                }
              }
              ctx.addLine("", "info");
              ctx.addLine(
                "Usage: syndicate start <type_id> [target_sector_id]",
                "info",
              );
            })
            .catch((err: any) =>
              ctx.addLine(
                err.response?.data?.error || "Failed to fetch definitions",
                "error",
              ),
            );
          break;
        }
        const typeId = subArgs[0].toLowerCase();
        const sectorId = subArgs[1] ? parseInt(subArgs[1]) : undefined;
        api
          .startMegaProject(typeId, sectorId)
          .then(({ data }) => {
            ctx.addLine(
              `Started mega-project: ${data.projectName}!`,
              "success",
            );
            ctx.addLine(
              `Credits needed: ${data.creditsCost.toLocaleString()}`,
              "trade",
            );
            ctx.addLine("Resource requirements:", "info");
            for (const req of data.resourceRequirements) {
              ctx.addLine(`  ${req.resourceId} x${req.quantity}`, "info");
            }
            ctx.addLine(
              `Build time: ${data.buildTimeHours} hours (after fully funded)`,
              "info",
            );
          })
          .catch((err: any) =>
            ctx.addLine(
              err.response?.data?.error || "Failed to start project",
              "error",
            ),
          );
        break;
      }

      case "contribute": {
        const subArgs = args.slice(1);
        if (subArgs.length < 2) {
          ctx.addLine(
            "Usage: syndicate contribute <resource|credits> <quantity> [pool]",
            "error",
          );
          ctx.addLine(
            '  Use "credits" as resource to contribute credits',
            "info",
          );
          ctx.addLine(
            '  Add "pool" at end to contribute from syndicate pool',
            "info",
          );
          break;
        }

        // Auto-select project if only one active
        const listing = ctx.getLastListing();
        let projectId: string | null = null;

        if (listing && listing.length > 0) {
          // Use first project from last listing
          projectId = listing[0].id;
        }

        if (!projectId) {
          // Fetch projects to find active one
          api
            .getSyndicateProjects()
            .then(({ data }) => {
              const active = data.projects.filter(
                (p: any) => p.status === "in_progress",
              );
              if (active.length === 0) {
                ctx.addLine("No active projects to contribute to", "error");
                return;
              }
              if (active.length > 1) {
                ctx.addLine(
                  'Multiple active projects. Use "syndicate projects" first to select one.',
                  "warning",
                );
                return;
              }
              doContribute(active[0].id, subArgs);
            })
            .catch((err: any) =>
              ctx.addLine(err.response?.data?.error || "Failed", "error"),
            );
        } else {
          doContribute(projectId, subArgs);
        }

        function doContribute(pId: string, cArgs: string[]) {
          const fromPool = cArgs[cArgs.length - 1]?.toLowerCase() === "pool";
          const effectiveArgs = fromPool ? cArgs.slice(0, -1) : cArgs;
          const qty = parseInt(effectiveArgs[effectiveArgs.length - 1]);
          if (isNaN(qty)) {
            ctx.addLine("Quantity must be a number", "error");
            return;
          }
          const resInput = effectiveArgs.slice(0, -1).join("_").toLowerCase();
          const resourceId = resInput === "credits" ? null : resInput;

          api
            .contributeToProject(pId, resourceId, qty, fromPool)
            .then(({ data }) => {
              const label =
                data.type === "credits" ? "credits" : data.resourceName;
              ctx.addLine(
                `Contributed ${data.contributed} ${label} to project`,
                "success",
              );
            })
            .catch((err: any) =>
              ctx.addLine(
                err.response?.data?.error || "Contribution failed",
                "error",
              ),
            );
        }
        break;
      }

      case "project": {
        const subArgs = args.slice(1);
        if (subArgs.length < 1) {
          ctx.addLine(
            "Usage: syndicate project <# from projects list>",
            "error",
          );
          break;
        }
        const num = parseInt(subArgs[0]);
        const listing = ctx.getLastListing();
        if (isNaN(num) || !listing || num < 1 || num > listing.length) {
          ctx.addLine(
            'Use "syndicate projects" first, then "syndicate project <#>"',
            "error",
          );
          break;
        }
        const projectId = listing[num - 1].id;
        api
          .getProjectDetail(projectId)
          .then(({ data }) => {
            ctx.addLine(`=== ${data.projectName} ===`, "system");
            ctx.addLine(
              `Status: ${data.status}`,
              data.status === "completed" ? "success" : "info",
            );
            if (data.description) ctx.addLine(data.description, "info");
            ctx.addLine("", "info");
            ctx.addLine(
              `Credits: ${data.creditsContributed.toLocaleString()} / ${data.creditsRequired.toLocaleString()}`,
              "trade",
            );
            ctx.addLine("Resources:", "info");
            for (const r of data.resourceProgress) {
              const pct =
                r.required > 0
                  ? Math.floor((r.contributed / r.required) * 100)
                  : 100;
              const bar = `[${"#".repeat(Math.floor(pct / 10))}${".".repeat(10 - Math.floor(pct / 10))}]`;
              ctx.addLine(
                `  ${r.resourceName.padEnd(22)} ${r.contributed}/${r.required} ${bar} ${pct}%`,
                r.contributed >= r.required ? "success" : "info",
              );
            }
            if (data.buildProgress) {
              ctx.addLine("", "info");
              ctx.addLine(
                `Build Progress: ${data.buildProgress.hoursElapsed}h / ${data.buildProgress.hoursTotal}h`,
                "warning",
              );
              ctx.addLine(
                `Completes at: ${new Date(data.buildProgress.completesAt).toLocaleString()}`,
                "info",
              );
            }
            if (data.contributions.length > 0) {
              ctx.addLine("", "info");
              ctx.addLine("Recent Contributions:", "system");
              for (const c of data.contributions.slice(0, 10)) {
                const label = c.resourceName || "credits";
                const src = c.source === "pool" ? " (pool)" : "";
                ctx.addLine(
                  `  ${c.username.padEnd(16)} ${label} x${c.quantity}${src}`,
                  "info",
                );
              }
            }
          })
          .catch((err: any) =>
            ctx.addLine(
              err.response?.data?.error || "Failed to fetch project",
              "error",
            ),
          );
        break;
      }

      case "cancel": {
        const subArgs = args.slice(1);
        if (subArgs.length < 1) {
          ctx.addLine(
            "Usage: syndicate cancel <# from projects list>",
            "error",
          );
          break;
        }
        const num = parseInt(subArgs[0]);
        const listing = ctx.getLastListing();
        if (isNaN(num) || !listing || num < 1 || num > listing.length) {
          ctx.addLine(
            'Use "syndicate projects" first, then "syndicate cancel <#>"',
            "error",
          );
          break;
        }
        const projectId = listing[num - 1].id;
        api
          .cancelProject(projectId)
          .then(({ data }) => {
            ctx.addLine(
              "Project cancelled. Resources refunded to pool.",
              "warning",
            );
            if (data.refundedCredits > 0) {
              ctx.addLine(
                `  Credits returned to treasury: ${data.refundedCredits.toLocaleString()}`,
                "trade",
              );
            }
          })
          .catch((err: any) =>
            ctx.addLine(err.response?.data?.error || "Cancel failed", "error"),
          );
        break;
      }

      case "structures": {
        api
          .getSyndicateStructures()
          .then(({ data }) => {
            if (data.structures.length === 0) {
              ctx.addLine("No syndicate structures", "info");
              return;
            }
            ctx.addLine("=== SYNDICATE STRUCTURES ===", "system");
            for (const s of data.structures) {
              const loc = s.sectorId ? ` Sector ${s.sectorId}` : "";
              const hp = `HP: ${s.health}/100`;
              const status = s.active ? "ACTIVE" : "INACTIVE";
              ctx.addLine(
                `  ${(s.name || s.structureType).padEnd(25)} ${hp}  ${status}${loc}`,
                s.active ? "success" : "warning",
              );
            }
          })
          .catch((err: any) =>
            ctx.addLine(
              err.response?.data?.error || "Failed to fetch structures",
              "error",
            ),
          );
        break;
      }

      default:
        ctx.addLine(
          `Unknown syndicate subcommand: ${sub}. Type "syndicate" for help.`,
          "error",
        );
    }
  },
};
