import { Router } from "express";
import { db } from "@workspace/db";
import {
  supplierRecommendations,
  businesses,
  audits,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateSupplierRecommendations } from "../services/aiAgent";

const router = Router();

router.get("/businesses/:id/suppliers", async (req, res) => {
  try {
    const businessId = Number(req.params["id"]);

    const existing = await db
      .select()
      .from(supplierRecommendations)
      .where(eq(supplierRecommendations.businessId, businessId))
      .orderBy(desc(supplierRecommendations.createdAt));

    if (existing.length > 0) {
      return res.json(
        existing.map((s) => ({
          ...s,
          estimatedEmissionReduction: Number(s.estimatedEmissionReduction),
        })),
      );
    }

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId));
    if (!business) return res.status(404).json({ error: "Bisnis tidak ditemukan" });

    const [latestAudit] = await db
      .select()
      .from(audits)
      .where(eq(audits.businessId, businessId))
      .orderBy(desc(audits.createdAt))
      .limit(1);

    if (!latestAudit)
      return res.status(400).json({ error: "Lakukan audit terlebih dahulu" });

    const suppliersAI = await generateSupplierRecommendations(
      {
        name: business.name,
        sector: business.sector,
        location: business.location,
        employeeCount: business.employeeCount,
        description: business.description,
      },
      {
        energyEmissions: Number(latestAudit.energyEmissions),
        transportEmissions: Number(latestAudit.transportEmissions),
        wasteEmissions: Number(latestAudit.wasteEmissions),
        supplyChainEmissions: Number(latestAudit.supplyChainEmissions),
        totalEmissions: Number(latestAudit.totalEmissions),
      },
    );

    const inserted = await db
      .insert(supplierRecommendations)
      .values(
        suppliersAI.map((s) => ({
          businessId,
          name: s.name,
          category: s.category,
          description: s.description,
          greenCertification: s.greenCertification,
          location: s.location,
          estimatedEmissionReduction: String(s.estimatedEmissionReduction),
          reasoning: s.reasoning,
          website: s.website,
        })),
      )
      .returning();

    return res.json(
      inserted.map((s) => ({
        ...s,
        estimatedEmissionReduction: Number(s.estimatedEmissionReduction),
      })),
    );
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil rekomendasi pemasok", detail: String(err) });
  }
});

export default router;
