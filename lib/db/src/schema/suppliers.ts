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

export const supplierRecommendations = pgTable("supplier_recommendations", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  greenCertification: text("green_certification"),
  location: text("location").notNull(),
  estimatedEmissionReduction: numeric("estimated_emission_reduction", {
    precision: 12,
    scale: 4,
  }).notNull(),
  reasoning: text("reasoning").notNull(),
  website: text("website"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const insertSupplierSchema = createInsertSchema(
  supplierRecommendations,
).omit({
  id: true,
  createdAt: true,
});

export type SupplierRecommendation = typeof supplierRecommendations.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
