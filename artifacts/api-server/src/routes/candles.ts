import { Router } from "express";
import { db } from "@workspace/db";
import { candlesTable, bannedIpsTable, rateLimitsTable, voiceVotesTable } from "@workspace/db";
import { eq, and, gte, lte, desc, count, sql, isNotNull, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { getModerationReason } from "../lib/profanity";
import { resolveCandleCoordinates } from "../lib/locationData";
import {
  GetCandlesQueryParams,
  CreateCandleBody,
  GetRecentCandlesQueryParams,
  GetCandleClustersQueryParams,
  GetCandleTimelineQueryParams,
} from "@workspace/api-zod";

const router = Router();

// Helper to get client IP
function getClientIp(req: any): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

// Rate limiting: 1 candle per IP per 24 hours (bypassed in development / localhost for testing)
async function checkRateLimit(ip: string): Promise<boolean> {
  if (
    process.env.NODE_ENV !== "production" ||
    process.env.DISABLE_RATE_LIMIT === "true" ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "::ffff:127.0.0.1" ||
    ip === "unknown"
  ) {
    return true;
  }

  const windowMs = 24 * 60 * 60 * 1000; // 24 hours
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);

  // Check if IP is banned
  const banned = await db
    .select()
    .from(bannedIpsTable)
    .where(eq(bannedIpsTable.ipAddress, ip))
    .limit(1);

  if (banned.length > 0) return false;

  // Check candles in window
  const recentCandles = await db
    .select({ cnt: count() })
    .from(candlesTable)
    .where(
      and(
        eq(candlesTable.ipAddress, ip),
        gte(candlesTable.createdAt, windowStart)
      )
    );

  return (recentCandles[0]?.cnt ?? 0) === 0;
}

// GET /api/candles
router.get("/candles", async (req, res) => {
  const parsed = GetCandlesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params" });
  }

  const { minLat, maxLat, minLng, maxLng, country, state, city, page = 1, limit = 500, fromDate, toDate } = parsed.data;

  const conditions = [eq(candlesTable.isHidden, false)];

  if (minLat !== undefined) conditions.push(gte(candlesTable.latitudeRounded, minLat));
  if (maxLat !== undefined) conditions.push(lte(candlesTable.latitudeRounded, maxLat));
  if (minLng !== undefined) conditions.push(gte(candlesTable.longitudeRounded, minLng));
  if (maxLng !== undefined) conditions.push(lte(candlesTable.longitudeRounded, maxLng));
  if (country) conditions.push(eq(candlesTable.country, country));
  if (state) conditions.push(eq(candlesTable.state, state));
  if (city) conditions.push(eq(candlesTable.city, city));
  if (fromDate) conditions.push(gte(candlesTable.createdAt, new Date(fromDate)));
  if (toDate) conditions.push(lte(candlesTable.createdAt, new Date(toDate)));

  const safeLimit = Math.min(limit, 2000);
  const offset = (page - 1) * safeLimit;

  // Do not expose precise coordinates in list endpoints to protect privacy.
  const [candles, totalResult] = await Promise.all([
    db
      .select({
        id: candlesTable.id,
        displayName: candlesTable.displayName,
        message: candlesTable.message,
        country: candlesTable.country,
        state: candlesTable.state,
        city: candlesTable.city,
        createdAt: candlesTable.createdAt,
        isHidden: candlesTable.isHidden,
      })
      .from(candlesTable)
      .where(and(...conditions))
      .orderBy(desc(candlesTable.createdAt))
      .limit(safeLimit)
      .offset(offset),
    db
      .select({ cnt: count() })
      .from(candlesTable)
      .where(and(...conditions)),
  ]);

  return res.json({
    candles,
    total: totalResult[0]?.cnt ?? 0,
    page,
    limit: safeLimit,
  });
});

// POST /api/candles
router.post("/candles", async (req, res) => {
  const ip = getClientIp(req);

  const allowed = await checkRateLimit(ip);
  if (!allowed) {
    return res.status(429).json({
      error: "You have already lit a candle recently. Please wait 24 hours.",
    });
  }

  const parsed = CreateCandleBody.safeParse(req.body);
  if (!parsed.success) {
    const issueMsg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
    return res.status(400).json({ error: `Invalid request body: ${issueMsg}` });
  }

  const { displayName, message, country, state, city, latitude, longitude, acceptedTerms } = parsed.data;

  if (acceptedTerms !== true) {
    return res.status(400).json({ error: 'You must accept the Terms, safety rules, and disclaimer before submitting.' });
  }

  // Sanitize message
  const rawMsg = message ? message.trim() : "";
  const sanitizedMessage = rawMsg.length > 0
    ? rawMsg.replace(/<[^>]*>/g, "").slice(0, 150)
    : null;
  const rawName = displayName ? displayName.trim() : "";
  const sanitizedName = rawName.length > 0
    ? rawName.replace(/<[^>]*>/g, "").slice(0, 50)
    : null;

  // Enforce message length policy: if message provided, it must be between 10 and 150 characters
  if (sanitizedMessage && (sanitizedMessage.length < 10 || sanitizedMessage.length > 150)) {
    return res.status(400).json({ error: 'Message must be between 10 and 150 characters.' });
  }

  const moderationReason = getModerationReason(sanitizedMessage) || getModerationReason(sanitizedName);
  if (moderationReason) {
    return res.status(400).json({
      error: 'Your submission could not be accepted. Do not include abusive language, threats, private contact or identity details, links, or spam.',
    });
  }

  // Resolve coordinates: fallback to country/state center if lat/lng missing
  const { lat: latRounded, lng: lngRounded } = resolveCandleCoordinates(
    latitude,
    longitude,
    country,
    state
  );

  const [candle] = await db
    .insert(candlesTable)
    .values({
      displayName: sanitizedName,
      message: sanitizedMessage,
      country: country || null,
      state: state || null,
      city: city || null,
      latitudeRounded: latRounded,
      longitudeRounded: lngRounded,
      ipAddress: ip,
      // Automated checks above reject unsafe content; passing submissions publish immediately.
      isHidden: false,
    })
    .returning();

  // Do NOT return latitude/longitude in response to protect privacy.
  return res.status(201).json({
    id: candle.id,
    displayName: candle.displayName,
    message: candle.message,
    country: candle.country,
    state: candle.state,
    city: candle.city,
    createdAt: candle.createdAt,
    isHidden: candle.isHidden,
  });
});

// GET /api/candles/recent
router.get("/candles/recent", async (req, res) => {
  const parsed = GetRecentCandlesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params" });
  }

  const limit = Math.min(parsed.data?.limit ?? 20, 100);
  const sort = req.query.sort === "liked" ? "liked" : "recent";

  const candles = await db
    .select({
      id: candlesTable.id,
      displayName: candlesTable.displayName,
      message: candlesTable.message,
      country: candlesTable.country,
      state: candlesTable.state,
      city: candlesTable.city,
      createdAt: candlesTable.createdAt,
      isHidden: candlesTable.isHidden,
    })
    .from(candlesTable)
    .where(
      and(
        eq(candlesTable.isHidden, false),
        isNotNull(candlesTable.message)
      )
    )
    .orderBy(desc(candlesTable.createdAt))
    .limit(limit);

  const voteRows = candles.length
    ? await db.execute(sql`
      SELECT candle_id, 
        COALESCE(SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END), 0)::integer AS like_count,
        COALESCE(SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END), 0)::integer AS dislike_count
      FROM voice_votes
      WHERE candle_id IN (${sql.raw(candles.map((c) => c.id).join(", "))})
      GROUP BY candle_id
    `)
    : { rows: [] };

  const voteMap = new Map<number, { like_count: number; dislike_count: number }>();
  for (const row of voteRows.rows as any[]) {
    voteMap.set(Number(row.candle_id), {
      like_count: Number(row.like_count),
      dislike_count: Number(row.dislike_count),
    });
  }

  const candlesWithCounts = candles.map((candle) => ({
    ...candle,
    likeCount: voteMap.get(candle.id)?.like_count ?? 0,
    dislikeCount: voteMap.get(candle.id)?.dislike_count ?? 0,
  }));

  if (sort === "liked") {
    candlesWithCounts.sort((a, b) => {
      const scoreA = a.likeCount - a.dislikeCount;
      const scoreB = b.likeCount - b.dislikeCount;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return Number(new Date(b.createdAt)) - Number(new Date(a.createdAt));
    });
  }

  return res.json(candlesWithCounts);
});

const VoteCandleBody = z.object({
  deviceId: z.string().min(1),
  vote: z.union([z.literal(1), z.literal(0), z.literal(-1)]),
});

// POST /api/candles/:id/vote
router.post("/candles/:id/vote", async (req, res) => {
  const candleId = Number(req.params.id);
  if (!Number.isInteger(candleId) || candleId <= 0) {
    return res.status(400).json({ error: "Invalid candle id" });
  }

  const parsed = VoteCandleBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const { deviceId, vote } = parsed.data;

  const [existing] = await db
    .select({ id: voiceVotesTable.id, vote: voiceVotesTable.vote })
    .from(voiceVotesTable)
    .where(and(eq(voiceVotesTable.candleId, candleId), eq(voiceVotesTable.deviceId, deviceId)))
    .limit(1);

  if (vote === 0) {
    if (existing) {
      await db.delete(voiceVotesTable).where(eq(voiceVotesTable.id, existing.id));
    }
  } else {
    if (existing) {
      if (existing.vote !== vote) {
        await db
          .update(voiceVotesTable)
          .set({ vote })
          .where(eq(voiceVotesTable.id, existing.id));
      }
    } else {
      await db.insert(voiceVotesTable).values({ candleId, deviceId, vote });
    }
  }

  const voteCounts = await db.execute(sql`
    SELECT candle_id,
      COALESCE(SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END), 0)::integer AS like_count,
      COALESCE(SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END), 0)::integer AS dislike_count
    FROM voice_votes
    WHERE candle_id = ${candleId}
    GROUP BY candle_id
  `);

  const row = (voteCounts.rows as any[])[0] ?? { like_count: 0, dislike_count: 0 };

  return res.json({
    likeCount: Number(row.like_count),
    dislikeCount: Number(row.dislike_count),
  });
});

// GET /api/candles/clusters
router.get("/candles/clusters", async (req, res) => {
  const parsed = GetCandleClustersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "zoom is required" });
  }

  const { zoom, minLat, maxLat, minLng, maxLng } = parsed.data;

  const conditions = [
    eq(candlesTable.isHidden, false),
    isNotNull(candlesTable.latitudeRounded),
    isNotNull(candlesTable.longitudeRounded),
  ];

  if (minLat !== undefined) conditions.push(gte(candlesTable.latitudeRounded, minLat));
  if (maxLat !== undefined) conditions.push(lte(candlesTable.latitudeRounded, maxLat));
  if (minLng !== undefined) conditions.push(gte(candlesTable.longitudeRounded, minLng));
  if (maxLng !== undefined) conditions.push(lte(candlesTable.longitudeRounded, maxLng));

  // Show count bubbles only at a distant world view. At India-level zoom and
  // closer, return individual candles so visitors see candle pins, not numbers.
  if (zoom < 3) {
    const gridSize = 10; // 10-degree grid
    const clusters = await db.execute(sql`
      SELECT 
        ROUND(latitude_rounded / ${gridSize}) * ${gridSize} as lat,
        ROUND(longitude_rounded / ${gridSize}) * ${gridSize} as lng,
        COUNT(*) as count,
        true as is_cluster,
        NULL::integer as candle_id,
        NULL::text as display_name,
        NULL::text as message,
        NULL::text as city,
        NULL::text as state,
        NULL::text as country,
        NULL::text as created_at
      FROM candles
      WHERE is_hidden = false
        AND latitude_rounded IS NOT NULL
        AND longitude_rounded IS NOT NULL
      GROUP BY 1, 2
      HAVING COUNT(*) > 0
      LIMIT 500
    `);
    return res.json(clusters.rows.map((r: any) => ({
      lat: Number(r.lat),
      lng: Number(r.lng),
      count: Number(r.count),
      isCluster: true,
    })));
  } else if (zoom < 4) {
    const gridSize = 2;
    const clusters = await db.execute(sql`
      SELECT 
        ROUND(latitude_rounded / ${gridSize}) * ${gridSize} as lat,
        ROUND(longitude_rounded / ${gridSize}) * ${gridSize} as lng,
        COUNT(*) as count,
        CASE WHEN COUNT(*) > 1 THEN true ELSE false END as is_cluster,
        CASE WHEN COUNT(*) = 1 THEN MIN(id) ELSE NULL END as candle_id,
        CASE WHEN COUNT(*) = 1 THEN MIN(display_name) ELSE NULL END as display_name,
        CASE WHEN COUNT(*) = 1 THEN MIN(message) ELSE NULL END as message,
        CASE WHEN COUNT(*) = 1 THEN MIN(city) ELSE NULL END as city,
        CASE WHEN COUNT(*) = 1 THEN MIN(state) ELSE NULL END as state,
        CASE WHEN COUNT(*) = 1 THEN MIN(country) ELSE NULL END as country,
        CASE WHEN COUNT(*) = 1 THEN MIN(created_at)::text ELSE NULL END as created_at
      FROM candles
      WHERE is_hidden = false
        AND latitude_rounded IS NOT NULL
        AND longitude_rounded IS NOT NULL
        ${minLat !== undefined ? sql`AND latitude_rounded >= ${minLat}` : sql``}
        ${maxLat !== undefined ? sql`AND latitude_rounded <= ${maxLat}` : sql``}
        ${minLng !== undefined ? sql`AND longitude_rounded >= ${minLng}` : sql``}
        ${maxLng !== undefined ? sql`AND longitude_rounded <= ${maxLng}` : sql``}
      GROUP BY 1, 2
      LIMIT 1000
    `);
    return res.json(clusters.rows.map((r: any) => ({
      lat: Number(r.lat),
      lng: Number(r.lng),
      count: Number(r.count),
      isCluster: r.is_cluster,
      candleId: r.candle_id ? Number(r.candle_id) : null,
      displayName: r.display_name,
      message: r.message,
      city: r.city,
      state: r.state,
      country: r.country,
      createdAt: r.created_at,
    })));
  } else {
    // Individual candles
    const candles = await db
      .select({
        id: candlesTable.id,
        latitudeRounded: candlesTable.latitudeRounded,
        longitudeRounded: candlesTable.longitudeRounded,
        displayName: candlesTable.displayName,
        message: candlesTable.message,
        city: candlesTable.city,
        state: candlesTable.state,
        country: candlesTable.country,
        createdAt: candlesTable.createdAt,
      })
      .from(candlesTable)
      .where(and(...conditions))
      .limit(2000);

    return res.json(candles.map((c) => ({
      lat: c.latitudeRounded,
      lng: c.longitudeRounded,
      count: 1,
      isCluster: false,
      candleId: c.id,
      displayName: c.displayName,
      message: c.message,
      city: c.city,
      state: c.state,
      country: c.country,
      createdAt: c.createdAt?.toISOString(),
    })));
  }
});

// GET /api/candles/timeline
router.get("/candles/timeline", async (req, res) => {
  const parsed = GetCandleTimelineQueryParams.safeParse(req.query);
  const days = parsed.data?.days ?? 30;
  const safeDays = Math.min(days, 365);

  const result = await db.execute(sql`
    WITH date_series AS (
      SELECT generate_series(
        CURRENT_DATE - INTERVAL '${sql.raw(String(safeDays))} days',
        CURRENT_DATE,
        INTERVAL '1 day'
      )::date as date
    ),
    daily_counts AS (
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM candles
      WHERE is_hidden = false
        AND created_at >= CURRENT_DATE - INTERVAL '${sql.raw(String(safeDays))} days'
      GROUP BY DATE(created_at)
    )
    SELECT 
      ds.date::text as date,
      COALESCE(dc.count, 0)::integer as count,
      SUM(COALESCE(dc.count, 0)) OVER (ORDER BY ds.date)::integer as cumulative
    FROM date_series ds
    LEFT JOIN daily_counts dc ON ds.date = dc.date
    ORDER BY ds.date
  `);

  return res.json(result.rows);
});

export default router;
