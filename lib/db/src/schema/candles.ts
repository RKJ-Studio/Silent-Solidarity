import { pgTable, serial, text, real, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const candlesTable = pgTable(
  "candles",
  {
    id: serial("id").primaryKey(),
    displayName: text("display_name"),
    message: text("message"),
    country: text("country"),
    state: text("state"),
    city: text("city"),
    latitudeRounded: real("latitude_rounded"),
    longitudeRounded: real("longitude_rounded"),
    ipAddress: text("ip_address"),
    isHidden: boolean("is_hidden").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("candles_country_idx").on(t.country),
    index("candles_state_idx").on(t.state),
    index("candles_city_idx").on(t.city),
    index("candles_created_at_idx").on(t.createdAt),
    index("candles_ip_idx").on(t.ipAddress),
    index("candles_lat_lng_idx").on(t.latitudeRounded, t.longitudeRounded),
  ]
);

export const insertCandleSchema = createInsertSchema(candlesTable).omit({
  id: true,
  isHidden: true,
  createdAt: true,
});

export const selectCandleSchema = createSelectSchema(candlesTable);

export type InsertCandle = z.infer<typeof insertCandleSchema>;
export type Candle = typeof candlesTable.$inferSelect;
