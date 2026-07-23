import { pgTable, serial, integer, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

export const voiceVotesTable = pgTable(
  "voice_votes",
  {
    id: serial("id").primaryKey(),
    candleId: integer("candle_id").notNull(),
    deviceId: text("device_id").notNull(),
    vote: integer("vote").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("voice_votes_device_candle_idx").on(t.candleId, t.deviceId),
    index("voice_votes_candle_idx").on(t.candleId),
  ],
);
