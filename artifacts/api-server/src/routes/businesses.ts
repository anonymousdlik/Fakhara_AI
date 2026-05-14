import { Router } from "express";
import { db } from "@workspace/db";
import {
  businesses,
  audits,
  actionItems,
  actionPlans,
  progressRecords,
} from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

router.get("/businesses", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(businesses)
      .orderBy(desc(businesses.createdAt));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil data bisnis", detail: String(err) });
  }
});

router.post("/businesses", async (req, res) => {
  try {
    const { name, sector, location, employeeCount, description } = req.body as {
      name: string;
      sector: string;
      location: string;
      employeeCount: number;
      description?: string;
    };

    const [row] = await db
      .insert(businesses)
      .values({ name, sector, location, employeeCount, description })
      .returning();

    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: "Gagal membuat bisnis", detail: String(err) });
  }
});

router.get("/businesses/:id", async (req, res) => {
  try {
    const id = Number(req.params["id"]);

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, id));

    if (!business) {
      return res.status(404).json({ error: "Bisnis tidak ditemukan" });
    }

    const [latestAudit] = await db
      .select()
      .from(audits)
      .where(eq(audits.businessId, id))
      .orderBy(desc(audits.createdAt))
      .limit(1);

    const [previousAudit] = latestAudit
      ? await db
          .select()
          .from(audits)
          .where(and(eq(audits.businessId, id)))
          .orderBy(desc(audits.createdAt))
          .limit(1)
          .offset(1)
      : [];

    const allActionItems = latestAudit
      ? await db
          .select({ status: actionItems.status })
          .from(actionItems)
          .innerJoin(actionPlans, eq(actionItems.planId, actionPlans.id))
          .where(eq(actionPlans.businessId, id))
      : [];

    const completed = allActionItems.filter(
      (i) => i.status === "completed",
    ).length;

    let emissionsTrend: number | null = null;
    if (latestAudit && previousAudit) {
      const curr = Number(latestAudit.totalEmissions);
      const prev = Number(previousAudit.totalEmissions);
      emissionsTrend = prev > 0 ? ((curr - prev) / prev) * 100 : null;
    }

    return res.json({
      ...business,
      latestAuditId: latestAudit?.id ?? null,
      latestTotalEmissions: latestAudit
        ? Number(latestAudit.totalEmissions)
        : null,
      emissionsTrend,
      actionItemsCompleted: completed,
      actionItemsTotal: allActionItems.length,
    });
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil bisnis", detail: String(err) });
  }
});

router.put("/businesses/:id", async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const { name, sector, location, employeeCount, description } = req.body as {
      name: string;
      sector: string;
      location: string;
      employeeCount: number;
      description?: string;
    };

    const [row] = await db
      .update(businesses)
      .set({ name, sector, location, employeeCount, description, updatedAt: new Date() })
      .where(eq(businesses.id, id))
      .returning();

    if (!row) return res.status(404).json({ error: "Bisnis tidak ditemukan" });

    return res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengupdate bisnis", detail: String(err) });
  }
});

router.get("/dashboard/summary", async (_req, res) => {
  try {
    const allBusinesses = await db.select().from(businesses);
    const totalBusinesses = allBusinesses.length;

    const latestAuditsRaw = await Promise.all(
      allBusinesses.map((b) =>
        db
          .select({ totalEmissions: audits.totalEmissions })
          .from(audits)
          .where(eq(audits.businessId, b.id))
          .orderBy(desc(audits.createdAt))
          .limit(1),
      ),
    );

    const totalEmissions = latestAuditsRaw
      .flatMap((a) => a)
      .reduce((sum, a) => sum + Number(a.totalEmissions), 0);

    const allProgress = await db.select().from(progressRecords);
    const avgReduction =
      allProgress.length > 0
        ? allProgress.reduce((s, p) => s + Number(p.reductionPercent), 0) /
          allProgress.length
        : 0;

    const allActionItemsList = await db.select().from(actionItems);
    const completedActions = allActionItemsList.filter(
      (i) => i.status === "completed",
    ).length;

    res.json({
      totalBusinesses,
      totalEmissionsTonnes: Number(totalEmissions.toFixed(2)),
      avgReductionPercent: Number(avgReduction.toFixed(1)),
      completedActions,
      totalActions: allActionItemsList.length,
    });
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil ringkasan", detail: String(err) });
  }
});

export default router;
