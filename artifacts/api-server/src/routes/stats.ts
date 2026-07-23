import { Router } from "express";
import { db } from "@workspace/db";
import { candlesTable } from "@workspace/db";
import { eq, count, sql, and, gte, desc } from "drizzle-orm";
import {
  GetCountryStatsQueryParams,
  GetStateStatsQueryParams,
  GetCityStatsQueryParams,
} from "@workspace/api-zod";

const router = Router();

// GET /api/stats
router.get("/stats", async (_req, res) => {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalResult,
    todayResult,
    weekResult,
    monthResult,
    countriesResult,
    statesResult,
    citiesResult,
  ] = await Promise.all([
    db.select({ cnt: count() }).from(candlesTable).where(eq(candlesTable.isHidden, false)),
    db.select({ cnt: count() }).from(candlesTable).where(and(eq(candlesTable.isHidden, false), gte(candlesTable.createdAt, todayStart))),
    db.select({ cnt: count() }).from(candlesTable).where(and(eq(candlesTable.isHidden, false), gte(candlesTable.createdAt, weekStart))),
    db.select({ cnt: count() }).from(candlesTable).where(and(eq(candlesTable.isHidden, false), gte(candlesTable.createdAt, monthStart))),
    db.execute(sql`SELECT COUNT(DISTINCT country) as cnt FROM candles WHERE is_hidden = false AND country IS NOT NULL`),
    db.execute(sql`SELECT COUNT(DISTINCT state) as cnt FROM candles WHERE is_hidden = false AND state IS NOT NULL`),
    db.execute(sql`SELECT COUNT(DISTINCT city) as cnt FROM candles WHERE is_hidden = false AND city IS NOT NULL`),
  ]);

  return res.json({
    totalCandles: totalResult[0]?.cnt ?? 0,
    totalCountries: Number(countriesResult.rows[0]?.cnt ?? 0),
    totalStates: Number(statesResult.rows[0]?.cnt ?? 0),
    totalCities: Number(citiesResult.rows[0]?.cnt ?? 0),
    todayCandles: todayResult[0]?.cnt ?? 0,
    weekCandles: weekResult[0]?.cnt ?? 0,
    monthCandles: monthResult[0]?.cnt ?? 0,
  });
});

// GET /api/stats/countries
router.get("/stats/countries", async (req, res) => {
  const parsed = GetCountryStatsQueryParams.safeParse(req.query);
  const limit = Math.min(parsed.data?.limit ?? 20, 100);

  const total = await db.select({ cnt: count() }).from(candlesTable).where(eq(candlesTable.isHidden, false));
  const totalCount = total[0]?.cnt ?? 1;

  const result = await db
    .select({
      name: candlesTable.country,
      count: count(),
    })
    .from(candlesTable)
    .where(and(eq(candlesTable.isHidden, false), sql`country IS NOT NULL`))
    .groupBy(candlesTable.country)
    .orderBy(desc(count()))
    .limit(limit);

  return res.json(
    result.map((r) => ({
      name: r.name ?? "Unknown",
      count: r.count,
      percentage: Number(((r.count / totalCount) * 100).toFixed(1)),
    }))
  );
});

// GET /api/stats/states
router.get("/stats/states", async (req, res) => {
  const parsed = GetStateStatsQueryParams.safeParse(req.query);
  const limit = Math.min(parsed.data?.limit ?? 20, 100);
  const country = parsed.data?.country;

  const conditions = [eq(candlesTable.isHidden, false), sql`state IS NOT NULL`];
  if (country) conditions.push(eq(candlesTable.country, country));

  const total = await db.select({ cnt: count() }).from(candlesTable).where(eq(candlesTable.isHidden, false));
  const totalCount = total[0]?.cnt ?? 1;

  const result = await db
    .select({
      name: candlesTable.state,
      count: count(),
    })
    .from(candlesTable)
    .where(and(...conditions))
    .groupBy(candlesTable.state)
    .orderBy(desc(count()))
    .limit(limit);

  return res.json(
    result.map((r) => ({
      name: r.name ?? "Unknown",
      count: r.count,
      percentage: Number(((r.count / totalCount) * 100).toFixed(1)),
    }))
  );
});

// GET /api/stats/cities
router.get("/stats/cities", async (req, res) => {
  const parsed = GetCityStatsQueryParams.safeParse(req.query);
  const limit = Math.min(parsed.data?.limit ?? 20, 100);
  const state = parsed.data?.state;

  const conditions = [eq(candlesTable.isHidden, false), sql`city IS NOT NULL`];
  if (state) conditions.push(eq(candlesTable.state, state));

  const total = await db.select({ cnt: count() }).from(candlesTable).where(eq(candlesTable.isHidden, false));
  const totalCount = total[0]?.cnt ?? 1;

  const result = await db
    .select({
      name: candlesTable.city,
      count: count(),
    })
    .from(candlesTable)
    .where(and(...conditions))
    .groupBy(candlesTable.city)
    .orderBy(desc(count()))
    .limit(limit);

  return res.json(
    result.map((r) => ({
      name: r.name ?? "Unknown",
      count: r.count,
      percentage: Number(((r.count / totalCount) * 100).toFixed(1)),
    }))
  );
});

export default router;
