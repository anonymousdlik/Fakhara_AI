import { Router } from "express";
import { db } from "@workspace/db";
import { progressRecords } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";

const router = Router();

router.get("/businesses/:id/progress", async (req, res) => {
  try {
    const businessId = Number(req.params["id"]);

    const rows = await db
      .select()
      .from(progressRecords)
      .where(eq(progressRecords.businessId, businessId))
      .orderBy(asc(progressRecords.month));

    res.json(
      rows.map((r) => ({
        ...r,
        actualEmissions: Number(r.actualEmissions),
        baselineEmissions: Number(r.baselineEmissions),
        reductionPercent: Number(r.reductionPercent),
      })),
    );
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil progress", detail: String(err) });
  }
});

router.post("/businesses/:id/progress", async (req, res) => {
  try {
    const businessId = Number(req.params["id"]);
    const { month, actualEmissions, baselineEmissions, notes } = req.body as {
      month: string;
      actualEmissions: number;
      baselineEmissions: number;
      notes?: string;
    };

    const reductionPercent =
      baselineEmissions > 0
        ? ((baselineEmissions - actualEmissions) / baselineEmissions) * 100
        : 0;

    const [row] = await db
      .insert(progressRecords)
      .values({
        businessId,
        month,
        actualEmissions: String(actualEmissions),
        baselineEmissions: String(baselineEmissions),
        reductionPercent: String(reductionPercent.toFixed(2)),
        notes,
      })
      .returning();

    return res.status(201).json({
      ...row,
      actualEmissions: Number(row.actualEmissions),
      baselineEmissions: Number(row.baselineEmissions),
      reductionPercent: Number(row.reductionPercent),
    });
  } catch (err) {
    return res.status(500).json({ error: "Gagal mencatat progress", detail: String(err) });
  }
});

export default router;
