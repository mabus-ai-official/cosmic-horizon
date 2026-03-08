import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import db from "../db/connection";

const router = Router();

// GET /api/trade-history — recent trades + P&L summary
router.get("/", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId;

    const commodity = req.query.commodity as string | undefined;
    const direction = req.query.direction as string | undefined;
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Number(req.query.offset) || 0;

    // Build trades query with outpost join
    let tradesQuery = db("trade_logs")
      .join("outposts", "trade_logs.outpost_id", "outposts.id")
      .where("trade_logs.player_id", playerId)
      .select(
        "trade_logs.id",
        "trade_logs.commodity",
        "trade_logs.quantity",
        "trade_logs.price_per_unit",
        "trade_logs.total_price",
        "trade_logs.direction",
        "trade_logs.created_at",
        "trade_logs.outpost_id",
        "outposts.name as outpost_name",
      )
      .orderBy("trade_logs.created_at", "desc")
      .limit(limit)
      .offset(offset);

    if (commodity && ["cyrillium", "food", "tech"].includes(commodity)) {
      tradesQuery = tradesQuery.where("trade_logs.commodity", commodity);
    }
    if (direction && ["buy", "sell"].includes(direction)) {
      tradesQuery = tradesQuery.where("trade_logs.direction", direction);
    }

    const trades = await tradesQuery;

    // Build P&L summary from ALL trades (not just the paginated subset)
    const allTrades = await db("trade_logs")
      .where("trade_logs.player_id", playerId)
      .select(
        "commodity",
        "direction",
        "quantity",
        "price_per_unit",
        "total_price",
      );

    const commodities = ["cyrillium", "food", "tech"];
    const byCommodity: Record<
      string,
      {
        totalBought: number;
        totalSold: number;
        avgBuyPrice: number;
        avgSellPrice: number;
        netProfit: number;
      }
    > = {};

    let totalSpent = 0;
    let totalEarned = 0;

    for (const c of commodities) {
      const buys = allTrades.filter(
        (t) => t.commodity === c && t.direction === "buy",
      );
      const sells = allTrades.filter(
        (t) => t.commodity === c && t.direction === "sell",
      );

      const totalBought = buys.reduce((s, t) => s + Number(t.quantity), 0);
      const totalSold = sells.reduce((s, t) => s + Number(t.quantity), 0);
      const totalBuySpend = buys.reduce((s, t) => s + Number(t.total_price), 0);
      const totalSellRevenue = sells.reduce(
        (s, t) => s + Number(t.total_price),
        0,
      );

      byCommodity[c] = {
        totalBought,
        totalSold,
        avgBuyPrice:
          totalBought > 0 ? Math.round(totalBuySpend / totalBought) : 0,
        avgSellPrice:
          totalSold > 0 ? Math.round(totalSellRevenue / totalSold) : 0,
        netProfit: totalSellRevenue - totalBuySpend,
      };

      totalSpent += totalBuySpend;
      totalEarned += totalSellRevenue;
    }

    res.json({
      trades: trades.map((t) => ({
        id: t.id,
        commodity: t.commodity,
        quantity: t.quantity,
        pricePerUnit: t.price_per_unit,
        totalPrice: Number(t.total_price),
        direction: t.direction,
        createdAt: t.created_at,
        outpostId: t.outpost_id,
        outpostName: t.outpost_name,
      })),
      summary: {
        byCommodity,
        overall: {
          totalSpent,
          totalEarned,
          netProfit: totalEarned - totalSpent,
        },
      },
    });
  } catch (err) {
    console.error("Trade history error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
