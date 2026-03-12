/**
 * Social commands — talk, msg, hail, who, profile, contacts.
 * Handles NPC dialogue trees, player-to-player messaging,
 * and the contacts/hailing system for emergent social gameplay.
 */
import * as api from "../api";
import type { CommandHandler } from "./types";
import { resolveItem } from "./utils";
import { getActiveNpcId, setActiveNpcId } from "./registry";
import { buildNPCEncounterScene } from "../../config/scenes/npc-scene";

export const socialCommands: Record<string, CommandHandler> = {
  talk: (args, ctx) => {
    const npcs = (ctx.sector?.npcs ?? []) as any[];
    // If args is a number and we're in active dialogue, treat as choice
    if (args.length === 1 && !isNaN(parseInt(args[0])) && getActiveNpcId()) {
      const choiceIndex = parseInt(args[0]) - 1;
      api
        .talkToNPC(getActiveNpcId()!, choiceIndex)
        .then(({ data }) => {
          if (data.isEnd) {
            ctx.addLine(`${data.npcName}: "${data.text}"`, "info");
            ctx.addLine("[Conversation ended]", "system");
            setActiveNpcId(null);
          } else {
            ctx.addLine(
              `=== ${data.npcName}${data.npcTitle ? ` — ${data.npcTitle}` : ""} ===`,
              "system",
            );
            ctx.addLine(`  "${data.text}"`, "info");
            if (data.options) {
              data.options.forEach((opt: any, i: number) => {
                const lock = opt.locked ? ` [Requires: ${opt.lockReason}]` : "";
                ctx.addLine(
                  `  [${i + 1}] ${opt.label}${lock}`,
                  opt.locked ? "warning" : "info",
                );
              });
            }
            if (data.effects?.reputation) {
              ctx.addLine(
                `  (Reputation ${data.effects.reputation > 0 ? "+" : ""}${data.effects.reputation})`,
                "trade",
              );
            }
          }
        })
        .catch((err: any) => {
          ctx.addLine(err.response?.data?.error || "Talk failed", "error");
          setActiveNpcId(null);
        });
      return;
    }
    // No args + 1 NPC → auto-target
    let targetNpc: any = null;
    if (args.length === 0 && npcs.length === 1) {
      targetNpc = npcs[0];
    } else if (args.length === 0 && npcs.length > 1) {
      ctx.addLine("Multiple NPCs here. Specify who to talk to:", "info");
      npcs.forEach((n: any, i: number) => {
        ctx.addLine(
          `  [${i + 1}] ${n.name}${n.title ? ` — ${n.title}` : ""}${n.encountered ? "" : " [NEW]"}`,
          "info",
        );
      });
      ctx.setLastListing(npcs.map((n: any) => ({ id: n.id, label: n.name })));
      return;
    } else if (args.length === 0 && npcs.length === 0) {
      ctx.addLine("No NPCs in this sector", "error");
      return;
    } else {
      const items = npcs.map((n: any) => ({ id: n.id, name: n.name }));
      const result = resolveItem(args.join(" "), items, ctx);
      if (result === null) {
        ctx.addLine("NPC not found in sector", "error");
        return;
      }
      if (result === "ambiguous") return;
      targetNpc = npcs.find((n: any) => n.id === result.id);
    }
    if (!targetNpc) {
      ctx.addLine("NPC not found", "error");
      return;
    }
    // Check if first encounter — trigger cutscene
    if (!targetNpc.encountered) {
      ctx.enqueueScene?.(
        buildNPCEncounterScene({
          name: targetNpc.name,
          title: targetNpc.title,
          race: targetNpc.race,
          spriteConfig: targetNpc.spriteConfig,
          sceneHint: targetNpc.firstEncounter?.sceneHint,
        }),
      );
      api.markNPCEncountered(targetNpc.id).catch(() => {});
    }
    setActiveNpcId(targetNpc.id);
    api
      .talkToNPC(targetNpc.id)
      .then(({ data }) => {
        if (data.isEnd) {
          ctx.addLine(`${data.npcName}: "${data.text}"`, "info");
          setActiveNpcId(null);
        } else {
          ctx.addLine(
            `=== ${data.npcName}${data.npcTitle ? ` — ${data.npcTitle}` : ""} ===`,
            "system",
          );
          ctx.addLine(`  "${data.text}"`, "info");
          if (data.options) {
            data.options.forEach((opt: any, i: number) => {
              const lock = opt.locked ? ` [Requires: ${opt.lockReason}]` : "";
              ctx.addLine(
                `  [${i + 1}] ${opt.label}${lock}`,
                opt.locked ? "warning" : "info",
              );
            });
          }
        }
      })
      .catch((err: any) => {
        ctx.addLine(err.response?.data?.error || "Talk failed", "error");
        setActiveNpcId(null);
      });
  },

  contact: (args, ctx) => {
    if (args.length < 1) {
      ctx.addLine("Usage: contact <name or #>", "error");
      return;
    }
    const query = args.join(" ");
    api
      .getContacts()
      .then(({ data }) => {
        const items = data.contacts.map((c: any) => ({
          id: c.id,
          name: c.name,
        }));
        const result = resolveItem(query, items, ctx);
        if (result === null) {
          ctx.addLine(
            `No contact matching "${query}". Type "contacts" to see known NPCs.`,
            "error",
          );
          return;
        }
        if (result === "ambiguous") return;
        api
          .getNPCDetail(result.id)
          .then(({ data: detail }) => {
            const repLabel =
              detail.reputation < -20
                ? "Hostile"
                : detail.reputation < 20
                  ? "Neutral"
                  : detail.reputation < 50
                    ? "Friendly"
                    : "Trusted";
            ctx.addLine(
              `=== ${detail.name}${detail.title ? ` — ${detail.title}` : ""} ===`,
              "system",
            );
            if (detail.race)
              ctx.addLine(
                `  Race: ${detail.race.charAt(0).toUpperCase() + detail.race.slice(1)}`,
                "info",
              );
            if (detail.factionName)
              ctx.addLine(`  Faction: ${detail.factionName}`, "info");
            ctx.addLine(`  Sector: ${detail.sectorId}`, "info");
            ctx.addLine(
              `  Reputation: ${detail.reputation} (${repLabel})`,
              detail.reputation >= 20 ? "success" : "info",
            );
            if (detail.services?.length > 0)
              ctx.addLine(`  Services: ${detail.services.join(", ")}`, "info");
            if (detail.lastVisited)
              ctx.addLine(
                `  Last visited: ${new Date(detail.lastVisited).toLocaleString()}`,
                "info",
              );
          })
          .catch((err: any) =>
            ctx.addLine(err.response?.data?.error || "Detail failed", "error"),
          );
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Failed", "error"),
      );
  },

  contacts: (_args, ctx) => {
    api
      .getContacts()
      .then(({ data }) => {
        if (data.contacts.length === 0) {
          ctx.addLine("No NPC contacts yet. Explore to find NPCs.", "info");
          return;
        }
        ctx.addLine("=== NPC CONTACTS ===", "system");
        data.contacts.forEach((c: any, i: number) => {
          const factionStr = c.factionName ? ` [${c.factionName}]` : "";
          const repLabel =
            c.reputation < -20
              ? "Hostile"
              : c.reputation < 20
                ? "Neutral"
                : c.reputation < 50
                  ? "Friendly"
                  : "Trusted";
          ctx.addLine(
            `  [${i + 1}] ${c.name}${c.title ? ` — ${c.title}` : ""}${factionStr} | Sector ${c.sectorId} | Rep: ${c.reputation} (${repLabel})`,
            "info",
          );
        });
        ctx.setLastListing(
          data.contacts.map((c: any) => ({ id: c.id, label: c.name })),
        );
      })
      .catch((err: any) =>
        ctx.addLine(
          err.response?.data?.error || "Failed to fetch contacts",
          "error",
        ),
      );
  },

  cantinatalk: (_args, ctx) => {
    api
      .talkBartender()
      .then(({ data }) => {
        ctx.addLine("=== BARTENDER ===", "system");
        ctx.addLine(`"${data.dialogue}"`, "info");
        if (data.hasMission && data.mission) {
          const m = data.mission;
          const xpStr = m.rewardXp ? ` + ${m.rewardXp} XP` : "";
          ctx.addLine("", "info");
          ctx.addLine(
            `  Mission: ${m.title} [T${m.tier}] (${m.type})`,
            "trade",
          );
          ctx.addLine(`  ${m.description}`, "info");
          ctx.addLine(
            `  Reward: ${m.rewardCredits.toLocaleString()} cr${xpStr}`,
            "trade",
          );
          ctx.addLine(
            `Use "accept ${m.id.slice(0, 8)}" to take the job`,
            "info",
          );
          ctx.setLastListing([{ id: m.id, label: m.title }]);
        }
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Not at a star mall", "error"),
      );
  },

  chat: (args, ctx) => {
    if (args.length < 1) {
      ctx.addLine("Usage: chat <message>", "error");
      return;
    }
    const msg = args.join(" ");
    const name = ctx.player?.username || "You";
    ctx.addLine(`[${name}] ${msg}`, "info");
    ctx.emit("chat:sector", { message: msg });
  },

  mail: (args, ctx) => {
    const sub = args[0];
    if (sub === "read" && args[1]) {
      api
        .readMessage(args[1])
        .then(({ data }) => {
          ctx.addLine(`=== MESSAGE ===`, "system");
          ctx.addLine(
            `From: ${data.senderName} | To: ${data.recipientName}`,
            "info",
          );
          ctx.addLine(`Subject: ${data.subject}`, "info");
          ctx.addLine(`---`, "system");
          ctx.addLine(data.body, "info");
        })
        .catch((err: any) =>
          ctx.addLine(err.response?.data?.error || "Failed", "error"),
        );
    } else if (sub === "send" && args.length >= 4) {
      const recipient = args[1];
      const subject = args[2];
      const body = args.slice(3).join(" ");
      api
        .sendMessage(recipient, subject, body)
        .then(() => {
          ctx.addLine(`Message sent to ${recipient}`, "success");
        })
        .catch((err: any) =>
          ctx.addLine(err.response?.data?.error || "Send failed", "error"),
        );
    } else if (sub === "delete" && args[1]) {
      api
        .deleteMessage(args[1])
        .then(() => {
          ctx.addLine("Message deleted", "success");
        })
        .catch((err: any) =>
          ctx.addLine(err.response?.data?.error || "Delete failed", "error"),
        );
    } else if (sub === "sent") {
      api
        .getSentMessages()
        .then(({ data }) => {
          if (data.messages.length === 0) {
            ctx.addLine("No sent messages", "info");
            return;
          }
          ctx.addLine("=== SENT MAIL ===", "system");
          for (const m of data.messages) {
            ctx.addLine(
              `  [${m.id.slice(0, 8)}] To: ${m.recipientName} - ${m.subject}`,
              "info",
            );
          }
        })
        .catch((err: any) =>
          ctx.addLine(err.response?.data?.error || "Failed", "error"),
        );
    } else {
      // Default: show inbox
      api
        .getInbox()
        .then(({ data }) => {
          if (data.messages.length === 0) {
            ctx.addLine("Inbox empty", "info");
            return;
          }
          ctx.addLine("=== INBOX ===", "system");
          for (const m of data.messages) {
            const unread = m.read ? "" : " [NEW]";
            ctx.addLine(
              `  [${m.id.slice(0, 8)}] ${m.senderName.padEnd(16)} ${m.subject}${unread}`,
              m.read ? "info" : "warning",
            );
          }
          ctx.addLine(
            'Use "mail read <id>" to read, "mail send <to> <subject> <body>" to send',
            "info",
          );
        })
        .catch((err: any) =>
          ctx.addLine(err.response?.data?.error || "Failed", "error"),
        );
    }
  },

  leaderboard: (args, ctx) => {
    const category = args[0] || "";
    if (category) {
      api
        .getLeaderboard(category)
        .then(({ data }) => {
          ctx.addLine(
            `=== LEADERBOARD: ${data.category.toUpperCase()} ===`,
            "system",
          );
          for (const entry of data.entries) {
            ctx.addLine(
              `  #${String(entry.rank).padStart(2)}  ${entry.player_name.padEnd(20)} ${String(entry.score).padStart(10)}`,
              "info",
            );
          }
        })
        .catch((err: any) =>
          ctx.addLine(err.response?.data?.error || "Failed", "error"),
        );
    } else {
      api
        .getLeaderboardOverview()
        .then(({ data }) => {
          ctx.addLine("=== LEADERBOARDS ===", "system");
          for (const [cat, entries] of Object.entries(data.leaderboards) as [
            string,
            any[],
          ][]) {
            ctx.addLine(`--- ${cat.toUpperCase()} ---`, "system");
            for (const e of entries) {
              ctx.addLine(
                `  #${String(e.rank).padStart(2)}  ${e.player_name.padEnd(20)} ${String(e.score).padStart(10)}`,
                "info",
              );
            }
          }
          ctx.addLine('Use "leaderboard <category>" for full rankings', "info");
          ctx.addLine(
            "Categories: credits, planets, combat, explored, trade, syndicate, level",
            "info",
          );
        })
        .catch((err: any) =>
          ctx.addLine(err.response?.data?.error || "Failed", "error"),
        );
    }
  },
};
