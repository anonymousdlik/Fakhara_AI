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
import { audits } from "./audits";

export const actionPlans = pgTable("action_plans", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  auditId: integer("audit_id")
    .notNull()
    .references(() => audits.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(),
  totalPotentialReduction: numeric("total_potential_reduction", {
    precision: 12,
    scale: 4,
  }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const actionItems = pgTable("action_items", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id")
    .notNull()
    .references(() => actionPlans.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  priority: text("priority").notNull(),
  estimatedReduction: numeric("estimated_reduction", {
    precision: 12,
    scale: 4,
  }).notNull(),
  estimatedCostIdr: numeric("estimated_cost_idr", { precision: 18, scale: 2 }),
  reasoning: text("reasoning").notNull(),
  status: text("status").notNull().default("pending"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertActionPlanSchema = createInsertSchema(actionPlans).omit({
  id: true,
  createdAt: true,
});

export const insertActionItemSchema = createInsertSchema(actionItems).omit({
  id: true,
});

export type ActionPlan = typeof actionPlans.$inferSelect;
export type ActionItem = typeof actionItems.$inferSelect;
export type InsertActionPlan = z.infer<typeof insertActionPlanSchema>;
export type InsertActionItem = z.infer<typeof insertActionItemSchema>;
