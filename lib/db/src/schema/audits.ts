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

export const audits = pgTable("audits", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  period: text("period").notNull(),
  electricityKwh: numeric("electricity_kwh", {
    precision: 12,
    scale: 2,
  }).notNull(),
  fuelLiters: numeric("fuel_liters", { precision: 12, scale: 2 }).notNull(),
  wasteKg: numeric("waste_kg", { precision: 12, scale: 2 }).notNull(),
  supplyChainSpendIdr: numeric("supply_chain_spend_idr", {
    precision: 18,
    scale: 2,
  }),
  vehicleCount: integer("vehicle_count"),
  deliveriesPerMonth: integer("deliveries_per_month"),
  energyEmissions: numeric("energy_emissions", {
    precision: 12,
    scale: 4,
  }).notNull(),
  transportEmissions: numeric("transport_emissions", {
    precision: 12,
    scale: 4,
  }).notNull(),
  wasteEmissions: numeric("waste_emissions", {
    precision: 12,
    scale: 4,
  }).notNull(),
  supplyChainEmissions: numeric("supply_chain_emissions", {
    precision: 12,
    scale: 4,
  }).notNull(),
  totalEmissions: numeric("total_emissions", {
    precision: 12,
    scale: 4,
  }).notNull(),
  aiInsights: text("ai_insights"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const insertAuditSchema = createInsertSchema(audits).omit({
  id: true,
  createdAt: true,
});

export type Audit = typeof audits.$inferSelect;
export type InsertAudit = z.infer<typeof insertAuditSchema>;
