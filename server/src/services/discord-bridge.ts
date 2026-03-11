import { Client, GatewayIntentBits, type TextChannel } from "discord.js";
import type { Server as SocketIOServer } from "socket.io";

let discordClient: Client | null = null;
let bridgeChannelId: string | null = null;
let webhookUrl: string | null = null;
let ioRef: SocketIOServer | null = null;

// Track messages we sent via webhook to avoid echo loops
const recentWebhookMessages = new Set<string>();

export async function startDiscordBridge(io: SocketIOServer): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN;
  bridgeChannelId = process.env.DISCORD_CHANNEL_ID || null;
  webhookUrl = process.env.DISCORD_WEBHOOK_URL || null;
  ioRef = io;

  if (!token || !bridgeChannelId) {
    console.log(
      "Discord bridge: DISCORD_BOT_TOKEN or DISCORD_CHANNEL_ID not set, skipping",
    );
    return;
  }

  discordClient = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  discordClient.once("ready", () => {
    console.log(`Discord bridge: logged in as ${discordClient!.user?.tag}`);
  });

  // Discord → Game: forward messages from the bridge channel as galaxy chat
  discordClient.on("messageCreate", (message) => {
    // Ignore bot messages (our own webhook + other bots)
    if (message.author.bot) return;
    // Only listen to the bridge channel
    if (message.channel.id !== bridgeChannelId) return;
    // Skip empty messages
    const text = message.content.trim();
    if (!text) return;

    // Emit as galaxy chat to all connected game clients
    io.emit("chat:galaxy", {
      senderId: `discord:${message.author.id}`,
      senderName: message.author.displayName || message.author.username,
      message: text.slice(0, 500),
      timestamp: Date.now(),
      fromDiscord: true,
    });
  });

  try {
    await discordClient.login(token);
  } catch (err) {
    console.error("Discord bridge: failed to login", err);
    discordClient = null;
  }
}

// Game → Discord: forward a galaxy chat message to the Discord channel
export async function forwardToDiscord(
  senderName: string,
  message: string,
): Promise<void> {
  if (!webhookUrl) {
    // Fallback: send as bot message if no webhook
    if (!discordClient || !bridgeChannelId) return;
    try {
      const channel = discordClient.channels.cache.get(
        bridgeChannelId,
      ) as TextChannel;
      if (channel) {
        await channel.send(`**[${senderName}]** ${message}`);
      }
    } catch (err) {
      console.error("Discord bridge: failed to send message", err);
    }
    return;
  }

  // Use webhook for nicer formatting (custom username per player)
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: `${senderName} (Cosmic Horizon)`,
        content: message,
      }),
    });
  } catch (err) {
    console.error("Discord bridge: webhook failed", err);
  }
}

export function stopDiscordBridge(): void {
  if (discordClient) {
    discordClient.destroy();
    discordClient = null;
    console.log("Discord bridge: disconnected");
  }
}
