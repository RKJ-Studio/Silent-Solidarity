import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { candlesTable, bannedIpsTable } from "@workspace/db";
import { eq, count, desc, sql, and, gte } from "drizzle-orm";
import {
  AdminLoginBody,
  AdminGetCandlesQueryParams,
  AdminHideCandleParams,
  AdminHideCandleBody,
  AdminDeleteCandleParams,
  AdminBanIpBody,
} from "@workspace/api-zod";
import jwt from "jsonwebtoken";

const router = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "lightforchange_admin_2024";
const JWT_SECRET = process.env.SESSION_SECRET || "lightforchange_secret";

// Auth middleware
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = auth.slice(7);
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// POST /api/admin/login
router.post("/admin/login", async (req, res) => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request" });
  }

  if (parsed.data.password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid password" });
  }

  const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "24h" });
  return res.json({ token });
});

// GET /api/admin/candles
router.get("/admin/candles", requireAdmin, async (req, res) => {
  const parsed = AdminGetCandlesQueryParams.safeParse(req.query);
  const page = parsed.data?.page ?? 1;
  const limit = Math.min(parsed.data?.limit ?? 50, 200);
  const includeHidden = parsed.data?.includeHidden ?? true;
  const offset = (page - 1) * limit;

  const conditions = includeHidden ? [] : [eq(candlesTable.isHidden, false)];

  const [candles, totalResult] = await Promise.all([
    db
      .select()
      .from(candlesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(candlesTable.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ cnt: count() })
      .from(candlesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined),
  ]);

  return res.json({
    candles,
    total: totalResult[0]?.cnt ?? 0,
    page,
  });
});

// PATCH /api/admin/candles/:id/hide
router.patch("/admin/candles/:id/hide", requireAdmin, async (req, res) => {
  const paramsParsed = AdminHideCandleParams.safeParse(req.params);
  const bodyParsed = AdminHideCandleBody.safeParse(req.body);

  if (!paramsParsed.success || !bodyParsed.success) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const [updated] = await db
    .update(candlesTable)
    .set({ isHidden: bodyParsed.data.isHidden })
    .where(eq(candlesTable.id, paramsParsed.data.id))
    .returning();

  if (!updated) {
    return res.status(404).json({ error: "Candle not found" });
  }

  return res.json({
    id: updated.id,
    displayName: updated.displayName,
    message: updated.message,
    country: updated.country,
    state: updated.state,
    city: updated.city,
    latitudeRounded: updated.latitudeRounded,
    longitudeRounded: updated.longitudeRounded,
    createdAt: updated.createdAt,
    isHidden: updated.isHidden,
  });
});

// DELETE /api/admin/candles/:id
router.delete("/admin/candles/:id", requireAdmin, async (req, res) => {
  const paramsParsed = AdminDeleteCandleParams.safeParse(req.params);
  if (!paramsParsed.success) {
    return res.status(400).json({ error: "Invalid ID" });
  }

  await db
    .delete(candlesTable)
    .where(eq(candlesTable.id, paramsParsed.data.id));

  return res.status(204).send();
});

// POST /api/admin/ban-ip
router.post("/admin/ban-ip", requireAdmin, async (req, res) => {
  const parsed = AdminBanIpBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request" });
  }

  await db
    .insert(bannedIpsTable)
    .values({
      ipAddress: parsed.data.ipAddress,
      reason: parsed.data.reason,
    })
    .onConflictDoNothing();

  // Also hide all candles from this IP
  await db
    .update(candlesTable)
    .set({ isHidden: true })
    .where(eq(candlesTable.ipAddress, parsed.data.ipAddress));

  return res.json({ success: true });
});

// GET /api/admin/stats
router.get("/admin/stats", requireAdmin, async (_req, res) => {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalResult,
    hiddenResult,
    bannedResult,
    todayResult,
    weekResult,
    monthResult,
    countriesResult,
    statesResult,
    citiesResult,
  ] = await Promise.all([
    db.select({ cnt: count() }).from(candlesTable),
    db.select({ cnt: count() }).from(candlesTable).where(eq(candlesTable.isHidden, true)),
    db.select({ cnt: count() }).from(bannedIpsTable),
    db.select({ cnt: count() }).from(candlesTable).where(and(eq(candlesTable.isHidden, false), gte(candlesTable.createdAt, todayStart))),
    db.select({ cnt: count() }).from(candlesTable).where(and(eq(candlesTable.isHidden, false), gte(candlesTable.createdAt, weekStart))),
    db.select({ cnt: count() }).from(candlesTable).where(and(eq(candlesTable.isHidden, false), gte(candlesTable.createdAt, monthStart))),
    db.execute(sql`SELECT COUNT(DISTINCT country) as cnt FROM candles WHERE is_hidden = false AND country IS NOT NULL`),
    db.execute(sql`SELECT COUNT(DISTINCT state) as cnt FROM candles WHERE is_hidden = false AND state IS NOT NULL`),
    db.execute(sql`SELECT COUNT(DISTINCT city) as cnt FROM candles WHERE is_hidden = false AND city IS NOT NULL`),
  ]);

  return res.json({
    totalCandles: totalResult[0]?.cnt ?? 0,
    hiddenCandles: hiddenResult[0]?.cnt ?? 0,
    bannedIps: bannedResult[0]?.cnt ?? 0,
    todayCandles: todayResult[0]?.cnt ?? 0,
    weekCandles: weekResult[0]?.cnt ?? 0,
    monthCandles: monthResult[0]?.cnt ?? 0,
    totalCountries: Number(countriesResult.rows[0]?.cnt ?? 0),
    totalStates: Number(statesResult.rows[0]?.cnt ?? 0),
    totalCities: Number(citiesResult.rows[0]?.cnt ?? 0),
  });
});

export default router;
