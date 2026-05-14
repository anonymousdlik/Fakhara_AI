import { Router } from "express";
import { db } from "@workspace/db";
import { businesses, audits } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateGreenLendAnalysis, type GreenLendInput } from "../services/aiAgent";

const router = Router();

router.post("/businesses/:id/greenlend-analysis", async (req, res) => {
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

    if (!latestAudit) {
      return res.status(400).json({ error: "Lakukan audit karbon terlebih dahulu sebelum analisa GreenLend" });
    }

    const {
      hasRenewableEnergy,
      hasWasteRecycling,
      hasOrganicPractices,
      hasFairWages,
      womenCount,
      communityImpact,
      hasOnlinePlatform,
      monthlyTxCount,
      finalScore,
      sdgScore,
      loanEligible,
      maxLoanIdr,
      interestRate,
    } = req.body as Omit<GreenLendInput, "businessName" | "sector" | "location" | "employeeCount" | "description" | "totalEmissions" | "energyEmissions" | "transportEmissions" | "wasteEmissions">;

    const input: GreenLendInput = {
      businessName: business.name,
      sector: business.sector,
      location: business.location,
      employeeCount: business.employeeCount,
      description: business.description,
      totalEmissions: Number(latestAudit.totalEmissions),
      energyEmissions: Number(latestAudit.energyEmissions),
      transportEmissions: Number(latestAudit.transportEmissions),
      wasteEmissions: Number(latestAudit.wasteEmissions),
      hasRenewableEnergy: Boolean(hasRenewableEnergy),
      hasWasteRecycling: Boolean(hasWasteRecycling),
      hasOrganicPractices: Boolean(hasOrganicPractices),
      hasFairWages: Boolean(hasFairWages),
      womenCount: Number(womenCount) || 0,
      communityImpact: Number(communityImpact) || 5,
      hasOnlinePlatform: Boolean(hasOnlinePlatform),
      monthlyTxCount: Number(monthlyTxCount) || 0,
      finalScore: Number(finalScore) || 0,
      sdgScore: Number(sdgScore) || 0,
      loanEligible: Boolean(loanEligible),
      maxLoanIdr: Number(maxLoanIdr) || 0,
      interestRate: Number(interestRate) || 18,
    };

    const result = await generateGreenLendAnalysis(input);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: "Gagal menganalisa profil GreenLend" });
  }
});

export default router;
