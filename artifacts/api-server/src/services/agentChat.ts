import { openai } from "../lib/openaiClient";

type ChatCreateParams = Parameters<typeof openai.chat.completions.create>[0];
type ChatMessages = ChatCreateParams["messages"];
import { db } from "@workspace/db";
import {
  audits,
  actionItems,
  actionPlans,
  progressRecords,
  supplierRecommendations,
  businesses,
} from "@workspace/db/schema";
import { eq, desc, asc } from "drizzle-orm";

const MODEL = "gpt-4o";

export type AgentTrace = {
  tool: string;
  args: unknown;
  result: unknown;
};

const tools = [
  {
    type: "function" as const,
    function: {
      name: "get_audit_summary",
      description:
        "Ambil ringkasan audit karbon terbaru untuk bisnis ini, termasuk breakdown emisi per kategori (energi, transport, limbah, rantai pasok) dan total emisi.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_action_plan_progress",
      description:
        "Ambil status rencana aksi: jumlah item total, item selesai, item in-progress, item pending, dan estimasi total reduksi.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_progress_history",
      description:
        "Ambil riwayat progress emisi bulanan (sampai 12 bulan terakhir) — actual vs baseline dan persentase reduksi.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_green_suppliers",
      description:
        "Cari pemasok ramah lingkungan dari database rekomendasi bisnis ini. Filter opsional berdasarkan kategori (energi, transport, kemasan, dll).",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "kategori pemasok, mis. 'energi', 'kemasan', 'transport'",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "calculate_roi",
      description:
        "Hitung ROI dan payback period dari investasi keberlanjutan. Berguna saat user tanya 'apakah investasi X layak'.",
      parameters: {
        type: "object",
        properties: {
          investmentIdr: {
            type: "number",
            description: "biaya investasi awal dalam IDR",
          },
          monthlySavingsIdr: {
            type: "number",
            description: "estimasi penghematan biaya operasional per bulan dalam IDR",
          },
          monthlyCo2ReductionKg: {
            type: "number",
            description: "estimasi reduksi emisi CO2e per bulan dalam kg",
          },
          horizonYears: {
            type: "number",
            description: "horizon analisis dalam tahun (default 5)",
          },
        },
        required: ["investmentIdr", "monthlySavingsIdr"],
      },
    },
  },
];

async function execTool(
  name: string,
  args: Record<string, unknown>,
  businessId: number,
): Promise<unknown> {
  if (name === "get_audit_summary") {
    const [audit] = await db
      .select()
      .from(audits)
      .where(eq(audits.businessId, businessId))
      .orderBy(desc(audits.createdAt))
      .limit(1);
    if (!audit) return { error: "Belum ada audit" };
    return {
      period: audit.period,
      totalEmissions: Number(audit.totalEmissions),
      breakdown: {
        energi: Number(audit.energyEmissions),
        transport: Number(audit.transportEmissions),
        limbah: Number(audit.wasteEmissions),
        rantaiPasok: Number(audit.supplyChainEmissions),
      },
      inputs: {
        electricityKwh: Number(audit.electricityKwh),
        fuelLiters: Number(audit.fuelLiters),
        wasteKg: Number(audit.wasteKg),
      },
    };
  }
  if (name === "get_action_plan_progress") {
    const items = await db
      .select()
      .from(actionItems)
      .innerJoin(actionPlans, eq(actionItems.planId, actionPlans.id))
      .where(eq(actionPlans.businessId, businessId));
    if (items.length === 0) return { error: "Belum ada rencana aksi" };
    const counts = { completed: 0, in_progress: 0, pending: 0 };
    let totalReduction = 0;
    for (const r of items) {
      const s = r.action_items.status as keyof typeof counts;
      if (s in counts) counts[s] += 1;
      totalReduction += Number(r.action_items.estimatedReduction);
    }
    return {
      total: items.length,
      ...counts,
      totalEstimatedReductionTon: Number(totalReduction.toFixed(3)),
    };
  }
  if (name === "get_progress_history") {
    const rows = await db
      .select()
      .from(progressRecords)
      .where(eq(progressRecords.businessId, businessId))
      .orderBy(asc(progressRecords.month))
      .limit(12);
    return rows.map((r) => ({
      month: r.month,
      actual: Number(r.actualEmissions),
      baseline: Number(r.baselineEmissions),
      reductionPercent: Number(r.reductionPercent),
    }));
  }
  if (name === "search_green_suppliers") {
    const rows = await db
      .select()
      .from(supplierRecommendations)
      .where(eq(supplierRecommendations.businessId, businessId));
    const cat = (args["category"] as string | undefined)?.toLowerCase();
    const filtered = cat
      ? rows.filter(
          (r) =>
            r.category.toLowerCase().includes(cat) ||
            r.name.toLowerCase().includes(cat),
        )
      : rows;
    return filtered.slice(0, 6).map((r) => ({
      name: r.name,
      category: r.category,
      location: r.location,
      certification: r.greenCertification,
      estimatedEmissionReductionTon: Number(r.estimatedEmissionReduction),
      reasoning: r.reasoning,
    }));
  }
  if (name === "calculate_roi") {
    const investment = Number(args["investmentIdr"]) || 0;
    const monthlySavings = Number(args["monthlySavingsIdr"]) || 0;
    const monthlyCo2 = Number(args["monthlyCo2ReductionKg"]) || 0;
    const years = Number(args["horizonYears"]) || 5;
    const months = years * 12;
    const lifetimeSavings = monthlySavings * months;
    const lifetimeCo2Ton = (monthlyCo2 * months) / 1000;
    const paybackMonths =
      monthlySavings > 0 ? investment / monthlySavings : null;
    const roiPercent =
      investment > 0
        ? ((lifetimeSavings - investment) / investment) * 100
        : 0;
    return {
      investmentIdr: investment,
      monthlySavingsIdr: monthlySavings,
      horizonYears: years,
      paybackMonths: paybackMonths != null ? Number(paybackMonths.toFixed(1)) : null,
      lifetimeSavingsIdr: Math.round(lifetimeSavings),
      lifetimeCo2ReductionTon: Number(lifetimeCo2Ton.toFixed(3)),
      roiPercent: Number(roiPercent.toFixed(1)),
      verdict:
        paybackMonths == null
          ? "Tidak bisa dihitung — penghematan bulanan harus > 0"
          : paybackMonths <= 24
            ? "Sangat layak (payback < 2 tahun)"
            : paybackMonths <= 60
              ? "Layak dipertimbangkan (payback 2-5 tahun)"
              : "Payback panjang, evaluasi ulang asumsi",
    };
  }
  return { error: `Tool ${name} tidak dikenal` };
}

export async function runAgentChat(
  businessId: number,
  userMessage: string,
  history: { role: "user" | "assistant"; content: string }[],
): Promise<{ reply: string; trace: AgentTrace[] }> {
  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId));
  if (!business) throw new Error("Bisnis tidak ditemukan");

  const systemPrompt = `Kamu adalah Asisten AI Fakhara — agen keberlanjutan untuk UMKM Indonesia "${business.name}" (${business.sector}, ${business.location}).

Kamu PUNYA AKSES KE TOOLS untuk mengambil data nyata dari database bisnis ini. WAJIB pakai tools sebelum menjawab pertanyaan tentang:
- emisi/audit → panggil get_audit_summary
- rencana aksi/progress → get_action_plan_progress
- tren bulanan → get_progress_history
- pemasok/supplier → search_green_suppliers
- ROI/investasi/payback → calculate_roi

Jawab dalam Bahasa Indonesia yang ringkas (maks 4-5 kalimat per jawaban). Sertakan angka konkret dari tool. Jangan mengarang data.`;

  const messages: ChatMessages = [
    { role: "system", content: systemPrompt },
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: userMessage },
  ];

  const trace: AgentTrace[] = [];
  const MAX_ITERATIONS = 5;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await openai.chat.completions.create({
      model: MODEL,
      max_completion_tokens: 1500,
      messages,
      tools,
      tool_choice: "auto",
    });

    const msg = response.choices[0]?.message;
    if (!msg) throw new Error("Tidak ada respons dari AI");

    const rawToolCalls = msg.tool_calls;
    const fnToolCalls = (rawToolCalls ?? []).filter(
      (tc): tc is { id: string; type: "function"; function: { name: string; arguments: string } } =>
        (tc as { type?: string }).type === "function" &&
        typeof (tc as { function?: { name?: string } }).function?.name === "string",
    );

    if (fnToolCalls.length === 0) {
      return { reply: msg.content ?? "", trace };
    }

    messages.push({
      role: "assistant",
      content: msg.content ?? "",
      tool_calls: fnToolCalls.map((tc) => ({
        id: tc.id,
        type: "function",
        function: { name: tc.function.name, arguments: tc.function.arguments },
      })),
    });

    for (const tc of fnToolCalls) {
      let parsedArgs: Record<string, unknown> = {};
      try {
        parsedArgs = JSON.parse(tc.function.arguments) as Record<string, unknown>;
      } catch {
        parsedArgs = {};
      }
      const result = await execTool(tc.function.name, parsedArgs, businessId);
      trace.push({ tool: tc.function.name, args: parsedArgs, result });
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      });
    }
  }

  return {
    reply: "Maaf, saya butuh terlalu banyak langkah untuk menjawab. Coba pertanyaan lebih spesifik.",
    trace,
  };
}
