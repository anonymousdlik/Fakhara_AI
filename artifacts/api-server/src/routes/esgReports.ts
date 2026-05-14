import { Router } from "express";
import { db } from "@workspace/db";
import {
  esgReports,
  businesses,
  audits,
  actionItems,
  actionPlans,
  progressRecords,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateEsgReport } from "../services/aiAgent";

const router = Router();

router.get("/businesses/:id/esg-report", async (req, res) => {
  try {
    const businessId = Number(req.params["id"]);

    const [report] = await db
      .select()
      .from(esgReports)
      .where(eq(esgReports.businessId, businessId))
      .orderBy(desc(esgReports.createdAt))
      .limit(1);

    if (!report) return res.status(404).json({ error: "Belum ada laporan ESG" });

    return res.json({
      ...report,
      totalEmissions: Number(report.totalEmissions),
      reductionFromBaseline: Number(report.reductionFromBaseline),
    });
  } catch (err) {
    return res.status(500).json({ error: "Gagal mengambil laporan ESG", detail: String(err) });
  }
});

router.post("/businesses/:id/esg-report", async (req, res) => {
  try {
    const businessId = Number(req.params["id"]);

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

    const allAudits = await db
      .select()
      .from(audits)
      .where(eq(audits.businessId, businessId))
      .orderBy(desc(audits.createdAt));

    const progressList = await db
      .select()
      .from(progressRecords)
      .where(eq(progressRecords.businessId, businessId));

    const avgReduction =
      progressList.length > 0
        ? progressList.reduce((s, p) => s + Number(p.reductionPercent), 0) /
          progressList.length
        : 0;

    const firstAudit = allAudits[allAudits.length - 1];
    const reductionFromBaseline =
      firstAudit && firstAudit.id !== latestAudit.id
        ? ((Number(firstAudit.totalEmissions) -
            Number(latestAudit.totalEmissions)) /
            Number(firstAudit.totalEmissions)) *
          100
        : avgReduction;

    const allActionItemsList = await db
      .select()
      .from(actionItems)
      .innerJoin(actionPlans, eq(actionItems.planId, actionPlans.id))
      .where(eq(actionPlans.businessId, businessId));

    const completedActions = allActionItemsList.filter(
      (i) => i.action_items.status === "completed",
    ).length;

    const reportAI = await generateEsgReport(
      {
        name: business.name,
        sector: business.sector,
        location: business.location,
        employeeCount: business.employeeCount,
        description: business.description,
      },
      {
        totalEmissions: Number(latestAudit.totalEmissions),
        reductionFromBaseline: Number(reductionFromBaseline.toFixed(1)),
        period: latestAudit.period,
        actionItemsCompleted: completedActions,
        actionItemsTotal: allActionItemsList.length,
      },
    );

    const [row] = await db
      .insert(esgReports)
      .values({
        businessId,
        period: reportAI.period,
        totalEmissions: String(Number(latestAudit.totalEmissions).toFixed(4)),
        reductionFromBaseline: String(reductionFromBaseline.toFixed(2)),
        environmentalScore: reportAI.environmentalScore,
        socialScore: reportAI.socialScore,
        governanceScore: reportAI.governanceScore,
        overallScore: reportAI.overallScore,
        executiveSummary: reportAI.executiveSummary,
        environmentalSection: reportAI.environmentalSection,
        socialSection: reportAI.socialSection,
        governanceSection: reportAI.governanceSection,
        recommendations: reportAI.recommendations,
      })
      .returning();

    return res.status(201).json({
      ...row,
      totalEmissions: Number(row.totalEmissions),
      reductionFromBaseline: Number(row.reductionFromBaseline),
    });
  } catch (err) {
    return res.status(500).json({ error: "Gagal membuat laporan ESG", detail: String(err) });
  }
});

export default router;
