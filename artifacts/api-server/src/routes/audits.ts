import { Router } from "express";
import { db } from "@workspace/db";
import { audits, businesses, progressRecords } from "@workspace/db/schema";
import { eq, desc, and, asc } from "drizzle-orm";
import {
  calculateCarbonFootprint,
  type CarbonInputs,
} from "../services/carbonCalculator";
import {
  generateAuditInsights,
  generateClarifyingQuestions,
  type ClarifyingAnswer,
} from "../services/aiAgent";

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

router.post("/businesses/:id/audits/questions", async (req, res) => {
  try {
    const businessId = Number(req.params["id"]);

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId));
    if (!business) return res.status(404).json({ error: "Bisnis tidak ditemukan" });

    const { electricityKwh, fuelLiters, wasteKg } = req.body as {
      electricityKwh: number;
      fuelLiters: number;
      wasteKg: number;
    };

    const questions = await generateClarifyingQuestions(
      {
        name: business.name,
        sector: business.sector,
        location: business.location,
        employeeCount: business.employeeCount,
        description: business.description,
      },
      { electricityKwh, fuelLiters, wasteKg },
    );

    return res.json({ questions });
  } catch (err) {
    return res.status(500).json({ error: "Gagal menghasilkan pertanyaan", detail: String(err) });
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
      answers,
    } = req.body as {
      period: string;
      electricityKwh: number;
      fuelLiters: number;
      wasteKg: number;
      supplyChainSpendIdr?: number;
      vehicleCount?: number;
      deliveriesPerMonth?: number;
      answers?: ClarifyingAnswer[];
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
        answers,
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
        supplyChainSpendIdr: supplyChainSpendIdr != null
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

    try {
      const monthMatch = period.match(/(\d{4})[-/]?(\d{2})/);
      const now = new Date();
      const month = monthMatch
        ? `${monthMatch[1]}-${monthMatch[2]}`
        : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const [firstAudit] = await db
        .select()
        .from(audits)
        .where(eq(audits.businessId, businessId))
        .orderBy(asc(audits.createdAt))
        .limit(1);

      const baseline = firstAudit
        ? Number(firstAudit.totalEmissions)
        : breakdown.totalEmissions;
      const actual = breakdown.totalEmissions;
      const reductionPercent =
        baseline > 0 ? ((baseline - actual) / baseline) * 100 : 0;

      const [existing] = await db
        .select()
        .from(progressRecords)
        .where(
          and(
            eq(progressRecords.businessId, businessId),
            eq(progressRecords.month, month),
          ),
        );

      if (existing) {
        await db
          .update(progressRecords)
          .set({
            actualEmissions: String(actual.toFixed(4)),
            baselineEmissions: String(baseline.toFixed(4)),
            reductionPercent: String(reductionPercent.toFixed(2)),
            notes: `Otomatis dari audit periode ${period}`,
          })
          .where(eq(progressRecords.id, existing.id));
      } else {
        await db.insert(progressRecords).values({
          businessId,
          month,
          actualEmissions: String(actual.toFixed(4)),
          baselineEmissions: String(baseline.toFixed(4)),
          reductionPercent: String(reductionPercent.toFixed(2)),
          notes: `Otomatis dari audit periode ${period}`,
        });
      }
    } catch {
      // non-fatal: audit succeeded
    }

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
