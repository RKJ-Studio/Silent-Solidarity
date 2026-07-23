import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const rateLimitsTable = pgTable("rate_limits", {
  id: serial("id").primaryKey(),
  ipAddress: text("ip_address").notNull().unique(),
  count: integer("count").notNull().default(1),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
  lastRequest: timestamp("last_request", { withTimezone: true }).notNull().defaultNow(),
});
