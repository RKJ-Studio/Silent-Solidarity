import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bannedIpsTable = pgTable("banned_ips", {
  id: serial("id").primaryKey(),
  ipAddress: text("ip_address").notNull().unique(),
  reason: text("reason"),
  bannedAt: timestamp("banned_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBannedIpSchema = createInsertSchema(bannedIpsTable).omit({
  id: true,
  bannedAt: true,
});

export type InsertBannedIp = z.infer<typeof insertBannedIpSchema>;
export type BannedIp = typeof bannedIpsTable.$inferSelect;
