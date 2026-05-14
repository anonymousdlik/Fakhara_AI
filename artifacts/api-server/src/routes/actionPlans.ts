import { Router } from "express";
import { db } from "@workspace/db";
import {
  actionPlans,
  actionItems,
  audits,
  businesses,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateActionPlan } from "../services/aiAgent";

const router = Router();

router.get("/businesses/:id/action-plan", async (req, res) => {
  try {
    const businessId = Number(req.params["id"]);

    const [plan] = await db
      .select()
      .from(actionPlans)
      .where(eq(actionPlans.businessId, businessId))
      .orderBy(desc(actionPlans.createdAt))
      .limit(1);

    if (!plan) return res.status(404).json({ error: "Belum ada rencana aksi" });

    const items = await db
      .select()
      .from(actionItems)
      .where(eq(actionItems.planId, plan.id));

    return res.json({
      ...plan,
      totalPotentialReduction: Number(plan.totalPotentialReduction),
      items: items.map((i) => ({
        ...i,
        estimatedReduction: Number(i.estimatedReduction),
        estimatedCostIdr: i.estimatedCostIdr
          ? Number(i.estimatedCostIdr)
          : undefined,
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: "Gagal mengambil rencana aksi", detail: String(err) });
  }
});

router.post("/businesses/:id/action-plan", async (req, res) => {
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

    const planAI = await generateActionPlan(
      {
        name: business.name,
        sector: business.sector,
        location: business.location,
        employeeCount: business.employeeCount,
        description: business.description,
      },
      {
        period: latestAudit.period,
        electricityKwh: Number(latestAudit.electricityKwh),
        fuelLiters: Number(latestAudit.fuelLiters),
        wasteKg: Number(latestAudit.wasteKg),
        supplyChainSpendIdr: latestAudit.supplyChainSpendIdr
          ? Number(latestAudit.supplyChainSpendIdr)
          : undefined,
        vehicleCount: latestAudit.vehicleCount ?? undefined,
        deliveriesPerMonth: latestAudit.deliveriesPerMonth ?? undefined,
      },
      {
        energyEmissions: Number(latestAudit.energyEmissions),
        transportEmissions: Number(latestAudit.transportEmissions),
        wasteEmissions: Number(latestAudit.wasteEmissions),
        supplyChainEmissions: Number(latestAudit.supplyChainEmissions),
        totalEmissions: Number(latestAudit.totalEmissions),
      },
    );

    const [plan] = await db
      .insert(actionPlans)
      .values({
        businessId,
        auditId: latestAudit.id,
        summary: planAI.summary,
        totalPotentialReduction: String(planAI.totalPotentialReduction),
      })
      .returning();

    const insertedItems = await db
      .insert(actionItems)
      .values(
        planAI.items.map((item) => ({
          planId: plan.id,
          title: item.title,
          description: item.description,
          category: item.category,
          priority: item.priority,
          estimatedReduction: String(item.estimatedReduction),
          estimatedCostIdr: item.estimatedCostIdr
            ? String(item.estimatedCostIdr)
            : undefined,
          reasoning: item.reasoning,
          status: "pending",
        })),
      )
      .returning();

    return res.status(201).json({
      ...plan,
      totalPotentialReduction: Number(plan.totalPotentialReduction),
      items: insertedItems.map((i) => ({
        ...i,
        estimatedReduction: Number(i.estimatedReduction),
        estimatedCostIdr: i.estimatedCostIdr
          ? Number(i.estimatedCostIdr)
          : undefined,
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: "Gagal membuat rencana aksi", detail: String(err) });
  }
});

router.patch("/businesses/:id/action-plan/items/:itemId", async (req, res) => {
  try {
    const itemId = Number(req.params["itemId"]);
    const { status } = req.body as { status: string };

    const [item] = await db
      .update(actionItems)
      .set({
        status,
        completedAt: status === "completed" ? new Date() : null,
      })
      .where(eq(actionItems.id, itemId))
      .returning();

    if (!item) return res.status(404).json({ error: "Item tidak ditemukan" });

    return res.json({
      ...item,
      estimatedReduction: Number(item.estimatedReduction),
      estimatedCostIdr: item.estimatedCostIdr
        ? Number(item.estimatedCostIdr)
        : undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: "Gagal mengupdate item", detail: String(err) });
  }
});

export default router;
