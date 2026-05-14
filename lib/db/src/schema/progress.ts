import {
  pgTable,
  serial,
  integer,
  numeric,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { businesses } from "./businesses";

export const progressRecords = pgTable("progress_records", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  month: text("month").notNull(),
  actualEmissions: numeric("actual_emissions", {
    precision: 12,
    scale: 4,
  }).notNull(),
  baselineEmissions: numeric("baseline_emissions", {
    precision: 12,
    scale: 4,
  }).notNull(),
  reductionPercent: numeric("reduction_percent", {
    precision: 6,
    scale: 2,
  }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const insertProgressSchema = createInsertSchema(progressRecords).omit({
  id: true,
  createdAt: true,
});

export type ProgressRecord = typeof progressRecords.$inferSelect;
export type InsertProgress = z.infer<typeof insertProgressSchema>;
