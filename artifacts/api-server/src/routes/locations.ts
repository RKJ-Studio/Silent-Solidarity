import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { GetStatesQueryParams, GetCitiesQueryParams } from "@workspace/api-zod";
import { ALL_COUNTRIES, STATES_BY_COUNTRY } from "../lib/locationData";

const router = Router();

// GET /api/locations/countries
router.get("/locations/countries", async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT DISTINCT country 
      FROM candles 
      WHERE is_hidden = false AND country IS NOT NULL 
    `);
    const dbCountries = result.rows.map((r: any) => r.country as string);
    const countrySet = new Set([...ALL_COUNTRIES, ...dbCountries]);
    const countries = Array.from(countrySet).sort((a, b) => {
      if (a === "India") return -1;
      if (b === "India") return 1;
      return a.localeCompare(b);
    });
    return res.json(countries);
  } catch (e) {
    return res.json(ALL_COUNTRIES);
  }
});

// GET /api/locations/states
router.get("/locations/states", async (req, res) => {
  const parsed = GetStatesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "country is required" });
  }
  const { country } = parsed.data;

  // Only India gets state/UT selection; other countries just use country-level
  if (country !== "India") {
    return res.json([]);
  }

  const presetStates = STATES_BY_COUNTRY["India"] || [];

  try {
    const result = await db.execute(sql`
      SELECT DISTINCT state 
      FROM candles 
      WHERE is_hidden = false 
        AND country = ${country} 
        AND state IS NOT NULL 
    `);
    const dbStates = result.rows.map((r: any) => r.state as string);
    const stateSet = new Set([...presetStates, ...dbStates]);
    const states = Array.from(stateSet).sort((a, b) => a.localeCompare(b));
    return res.json(states);
  } catch (e) {
    return res.json(presetStates);
  }
});

// GET /api/locations/cities
router.get("/locations/cities", async (req, res) => {
  const parsed = GetCitiesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "state is required" });
  }
  const { state } = parsed.data;

  try {
    const result = await db.execute(sql`
      SELECT DISTINCT city 
      FROM candles 
      WHERE is_hidden = false 
        AND state = ${state} 
        AND city IS NOT NULL 
      ORDER BY city
    `);
    return res.json(result.rows.map((r: any) => r.city));
  } catch (e) {
    return res.json([]);
  }
});

export default router;
