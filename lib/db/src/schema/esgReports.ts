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

export const esgReports = pgTable("esg_reports", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  period: text("period").notNull(),
  totalEmissions: numeric("total_emissions", {
    precision: 12,
    scale: 4,
  }).notNull(),
  reductionFromBaseline: numeric("reduction_from_baseline", {
    precision: 6,
    scale: 2,
  }).notNull(),
  environmentalScore: integer("environmental_score").notNull(),
  socialScore: integer("social_score").notNull(),
  governanceScore: integer("governance_score").notNull(),
  overallScore: integer("overall_score").notNull(),
  executiveSummary: text("executive_summary").notNull(),
  environmentalSection: text("environmental_section").notNull(),
  socialSection: text("social_section").notNull(),
  governanceSection: text("governance_section").notNull(),
  recommendations: text("recommendations").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const insertEsgReportSchema = createInsertSchema(esgReports).omit({
  id: true,
  createdAt: true,
});

export type EsgReport = typeof esgReports.$inferSelect;
export type InsertEsgReport = z.infer<typeof insertEsgReportSchema>;
