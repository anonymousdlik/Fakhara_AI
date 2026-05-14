import { Router } from "express";
import { db } from "@workspace/db";
import { audits, businesses } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  calculateCarbonFootprint,
  type CarbonInputs,
} from "../services/carbonCalculator";
import { generateAuditInsights } from "../services/aiAgent";

const router = Router();

router.get("/businesses/:id/audits", async (req, res) => {
  try {
    const businessId = Number(req.params["id"]);
    const rows = await db
      .select()
      .from(audits)
      .where(eq(audits.businessId, businessId))
      .orderBy(desc(audits.createdAt));

    res.json(
      rows.map((r) => ({
        ...r,
        totalEmissions: Number(r.totalEmissions),
        energyEmissions: Number(r.energyEmissions),
        transportEmissions: Number(r.transportEmissions),
        wasteEmissions: Number(r.wasteEmissions),
        supplyChainEmissions: Number(r.supplyChainEmissions),
        electricityKwh: Number(r.electricityKwh),
        fuelLiters: Number(r.fuelLiters),
        wasteKg: Number(r.wasteKg),
      })),
    );
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil audit", detail: String(err) });
  }
});

router.post("/businesses/:id/audits", async (req, res) => {
  try {
    const businessId = Number(req.params["id"]);

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId));
    if (!business) return res.status(404).json({ error: "Bisnis tidak ditemukan" });

    const {
      period,
      electricityKwh,
      fuelLiters,
      wasteKg,
      supplyChainSpendIdr,
      vehicleCount,
      deliveriesPerMonth,
    } = req.body as {
      period: string;
      electricityKwh: number;
      fuelLiters: number;
      wasteKg: number;
      supplyChainSpendIdr?: number;
      vehicleCount?: number;
      deliveriesPerMonth?: number;
    };

    const inputs: CarbonInputs = {
      electricityKwh,
      fuelLiters,
      wasteKg,
      supplyChainSpendIdr,
      vehicleCount,
      deliveriesPerMonth,
    };

    const breakdown = calculateCarbonFootprint(inputs);

    let aiInsights: string | undefined;
    try {
      aiInsights = await generateAuditInsights(
        {
          name: business.name,
          sector: business.sector,
          location: business.location,
          employeeCount: business.employeeCount,
          description: business.description,
        },
        {
          period,
          electricityKwh,
          fuelLiters,
          wasteKg,
          supplyChainSpendIdr,
          vehicleCount,
          deliveriesPerMonth,
        },
        breakdown,
      );
    } catch {
      aiInsights = undefined;
    }

    const [row] = await db
      .insert(audits)
      .values({
        businessId,
        period,
        electricityKwh: String(electricityKwh),
        fuelLiters: String(fuelLiters),
        wasteKg: String(wasteKg),
        supplyChainSpendIdr: supplyChainSpendIdr
          ? String(supplyChainSpendIdr)
          : undefined,
        vehicleCount,
        deliveriesPerMonth,
        energyEmissions: String(breakdown.energyEmissions),
        transportEmissions: String(breakdown.transportEmissions),
        wasteEmissions: String(breakdown.wasteEmissions),
        supplyChainEmissions: String(breakdown.supplyChainEmissions),
        totalEmissions: String(breakdown.totalEmissions),
        aiInsights,
      })
      .returning();

    return res.status(201).json({
      ...row,
      totalEmissions: Number(row.totalEmissions),
      energyEmissions: Number(row.energyEmissions),
      transportEmissions: Number(row.transportEmissions),
      wasteEmissions: Number(row.wasteEmissions),
      supplyChainEmissions: Number(row.supplyChainEmissions),
      electricityKwh: Number(row.electricityKwh),
      fuelLiters: Number(row.fuelLiters),
      wasteKg: Number(row.wasteKg),
    });
  } catch (err) {
    return res.status(500).json({ error: "Gagal membuat audit", detail: String(err) });
  }
});

router.get("/businesses/:id/audits/latest", async (req, res) => {
  try {
    const businessId = Number(req.params["id"]);

    const [row] = await db
      .select()
      .from(audits)
      .where(eq(audits.businessId, businessId))
      .orderBy(desc(audits.createdAt))
      .limit(1);

    if (!row) return res.status(404).json({ error: "Belum ada audit" });

    return res.json({
      ...row,
      totalEmissions: Number(row.totalEmissions),
      energyEmissions: Number(row.energyEmissions),
      transportEmissions: Number(row.transportEmissions),
      wasteEmissions: Number(row.wasteEmissions),
      supplyChainEmissions: Number(row.supplyChainEmissions),
      electricityKwh: Number(row.electricityKwh),
      fuelLiters: Number(row.fuelLiters),
      wasteKg: Number(row.wasteKg),
    });
  } catch (err) {
    return res.status(500).json({ error: "Gagal mengambil audit", detail: String(err) });
  }
});

export default router;
