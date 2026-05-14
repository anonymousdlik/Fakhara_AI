import { openai } from "../lib/openaiClient";
import type { CarbonBreakdown } from "./carbonCalculator";

const MODEL = "gpt-4o";

function safeJsonParse<T>(content: string, errorMsg: string): T {
  try {
    return JSON.parse(content) as T;
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as T;
    }
    throw new Error(`${errorMsg}: ${content.slice(0, 200)}`);
  }
}

export interface ClarifyingQuestion {
  id: string;
  question: string;
  hint: string;
}

export interface ClarifyingAnswer {
  questionId: string;
  question: string;
  answer: string;
}

interface Business {
  name: string;
  sector: string;
  location: string;
  employeeCount: number;
  description?: string | null;
}

interface AuditData {
  period: string;
  electricityKwh: number;
  fuelLiters: number;
  wasteKg: number;
  supplyChainSpendIdr?: number;
  vehicleCount?: number;
  deliveriesPerMonth?: number;
}

export interface ActionItemAI {
  title: string;
  description: string;
  category: "energi" | "transportasi" | "sampah" | "supply_chain";
  priority: "quick_win" | "medium_term" | "long_term";
  estimatedReduction: number;
  estimatedCostIdr?: number;
  reasoning: string;
}

export interface ActionPlanAI {
  summary: string;
  totalPotentialReduction: number;
  items: ActionItemAI[];
}

export interface SupplierAI {
  name: string;
  category: "energi" | "bahan_baku" | "packaging" | "logistik";
  description: string;
  greenCertification?: string;
  location: string;
  estimatedEmissionReduction: number;
  reasoning: string;
  website?: string;
}

export interface EsgReportAI {
  period: string;
  environmentalScore: number;
  socialScore: number;
  governanceScore: number;
  overallScore: number;
  executiveSummary: string;
  environmentalSection: string;
  socialSection: string;
  governanceSection: string;
  recommendations: string;
  reductionFromBaseline: number;
}

export interface ReceiptExtractionResult {
  electricityKwh?: number;
  fuelLiters?: number;
  wasteKg?: number;
  supplyChainSpendIdr?: number;
  period?: string;
  receiptType: "listrik" | "bensin" | "sampah" | "belanja" | "tidak_jelas";
  confidence: "tinggi" | "sedang" | "rendah";
  notes: string;
}

export async function extractReceiptData(
  imageBase64: string,
  mimeType: string,
): Promise<ReceiptExtractionResult> {
  const dataUrl = `data:${mimeType};base64,${imageBase64}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 600,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Kamu adalah AI yang ahli membaca foto struk/nota Indonesia (struk listrik PLN, nota SPBU/Pertamina, kuitansi sampah, atau tagihan supplier). Ekstrak data numerik utama dan kembalikan dalam JSON.

Aturan:
- Hanya isi field yang BENAR-BENAR terlihat di gambar.
- electricityKwh: pemakaian kWh dari struk PLN (bukan tagihan rupiah).
- fuelLiters: jumlah liter bensin/solar dari nota SPBU.
- wasteKg: jumlah kg sampah dari kuitansi sampah.
- supplyChainSpendIdr: total belanja supplier dalam Rupiah.
- period: jika ada bulan/tahun di struk, format "YYYY-MM".
- Jika tidak yakin, set confidence ke "rendah" dan jelaskan di notes.
- receiptType: identifikasi jenis struk.`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Tolong baca foto struk berikut dan ekstrak datanya. Format JSON:
{
  "receiptType": "listrik" | "bensin" | "sampah" | "belanja" | "tidak_jelas",
  "confidence": "tinggi" | "sedang" | "rendah",
  "electricityKwh": number atau null,
  "fuelLiters": number atau null,
  "wasteKg": number atau null,
  "supplyChainSpendIdr": number atau null,
  "period": "YYYY-MM" atau null,
  "notes": "penjelasan singkat apa yang kamu lihat di struk dalam Bahasa Indonesia"
}`,
          },
          {
            type: "image_url",
            image_url: { url: dataUrl },
          },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return {
      receiptType: "tidak_jelas",
      confidence: "rendah",
      notes: "AI tidak memberikan jawaban.",
    };
  }

  const parsed = safeJsonParse<Record<string, unknown>>(
    content,
    "Gagal mem-parse hasil OCR",
  );

  const num = (v: unknown): number | undefined => {
    if (v === null || v === undefined || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  const str = (v: unknown): string | undefined => {
    if (typeof v !== "string" || !v.trim()) return undefined;
    return v.trim();
  };

  return {
    electricityKwh: num(parsed["electricityKwh"]),
    fuelLiters: num(parsed["fuelLiters"]),
    wasteKg: num(parsed["wasteKg"]),
    supplyChainSpendIdr: num(parsed["supplyChainSpendIdr"]),
    period: str(parsed["period"]),
    receiptType:
      (str(parsed["receiptType"]) as ReceiptExtractionResult["receiptType"]) ??
      "tidak_jelas",
    confidence:
      (str(parsed["confidence"]) as ReceiptExtractionResult["confidence"]) ??
      "rendah",
    notes: str(parsed["notes"]) ?? "",
  };
}

export async function generateClarifyingQuestions(
  business: Business,
  initialData: Pick<AuditData, "electricityKwh" | "fuelLiters" | "wasteKg">,
): Promise<ClarifyingQuestion[]> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 600,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Kamu adalah agen AI audit karbon untuk UMKM Indonesia. Berdasarkan data awal bisnis, hasilkan 3 pertanyaan klarifikasi yang paling relevan untuk memperdalam analisis emisi karbon. Respon dalam JSON.`,
      },
      {
        role: "user",
        content: `Bisnis: ${business.name} (sektor: ${business.sector})
Lokasi: ${business.location}, ${business.employeeCount} karyawan
${business.description ? `Deskripsi: ${business.description}` : ""}

Data awal yang sudah ada:
- Listrik: ${initialData.electricityKwh} kWh/bulan
- Bahan bakar: ${initialData.fuelLiters} liter/bulan
- Sampah: ${initialData.wasteKg} kg/bulan

Hasilkan tepat 3 pertanyaan klarifikasi yang akan membantu memperdalam analisis dan rekomendasi pengurangan emisi. Pilih pertanyaan yang paling relevan untuk sektor ${business.sector}.

Format JSON:
{
  "questions": [
    {
      "id": "q1",
      "question": "pertanyaan dalam Bahasa Indonesia",
      "hint": "contoh jawaban atau panduan singkat"
    }
  ]
}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return [];

  const parsed = safeJsonParse<{ questions: ClarifyingQuestion[] }>(content, "Gagal mem-parse pertanyaan AI");
  return parsed.questions.slice(0, 3);
}

export async function generateAuditInsights(
  business: Business,
  audit: AuditData,
  breakdown: CarbonBreakdown,
  clarifyingAnswers?: ClarifyingAnswer[],
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 600,
    messages: [
      {
        role: "system",
        content: `Kamu adalah agen AI ahli keberlanjutan lingkungan yang membantu UMKM Indonesia mengurangi jejak karbon mereka. Berikan insight yang jelas, actionable, dan berempati dalam Bahasa Indonesia.`,
      },
      {
        role: "user",
        content: `Analisis jejak karbon untuk bisnis berikut:

Bisnis: ${business.name} (${business.sector})
Lokasi: ${business.location}
Jumlah Karyawan: ${business.employeeCount}
Periode: ${audit.period}

Data Emisi:
- Listrik: ${audit.electricityKwh} kWh → ${breakdown.energyEmissions} ton CO2e
- Bahan Bakar: ${audit.fuelLiters} liter → ${breakdown.transportEmissions} ton CO2e
- Sampah: ${audit.wasteKg} kg → ${breakdown.wasteEmissions} ton CO2e
- Rantai Pasok: ${breakdown.supplyChainEmissions} ton CO2e
- TOTAL: ${breakdown.totalEmissions} ton CO2e/tahun
${clarifyingAnswers && clarifyingAnswers.length > 0 ? `
Informasi tambahan dari agen (pertanyaan klarifikasi):
${clarifyingAnswers.map((a) => `- ${a.question}: ${a.answer}`).join("\n")}
` : ""}
Berikan insight singkat (3-4 paragraf) tentang:
1. Penilaian keseluruhan jejak karbon ini
2. Area emisi terbesar dan konteksnya untuk UMKM sektor ${business.sector}
3. Potensi pengurangan yang paling realistis
4. Motivasi dan langkah pertama yang dapat segera dilakukan`,
      },
    ],
  });

  return (
    response.choices[0]?.message?.content ??
    "Tidak dapat menghasilkan insight saat ini."
  );
}

export async function generateActionPlan(
  business: Business,
  audit: AuditData,
  breakdown: CarbonBreakdown,
): Promise<ActionPlanAI> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 2000,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Kamu adalah agen AI pakar keberlanjutan untuk UMKM Indonesia. Buat rencana aksi pengurangan karbon yang realistis, terjangkau, dan terurut prioritasnya. Respon dalam JSON.`,
      },
      {
        role: "user",
        content: `Buat rencana aksi pengurangan karbon untuk:

Bisnis: ${business.name} (${business.sector})
Lokasi: ${business.location}, ${business.employeeCount} karyawan
Periode audit: ${audit.period}

Emisi saat ini:
- Energi: ${breakdown.energyEmissions} ton CO2e (listrik ${audit.electricityKwh} kWh)
- Transportasi: ${breakdown.transportEmissions} ton CO2e (BBM ${audit.fuelLiters} liter)
- Sampah: ${breakdown.wasteEmissions} ton CO2e (${audit.wasteKg} kg)
- Rantai Pasok: ${breakdown.supplyChainEmissions} ton CO2e
- Total: ${breakdown.totalEmissions} ton CO2e

Buat 6-8 aksi prioritas. Format JSON:
{
  "summary": "ringkasan rencana dalam 2 paragraf",
  "totalPotentialReduction": <angka ton CO2e yang bisa dikurangi>,
  "items": [
    {
      "title": "judul aksi",
      "description": "deskripsi detail langkah-langkah implementasi",
      "category": "energi|transportasi|sampah|supply_chain",
      "priority": "quick_win|medium_term|long_term",
      "estimatedReduction": <ton CO2e>,
      "estimatedCostIdr": <biaya implementasi dalam IDR>,
      "reasoning": "penjelasan mengapa aksi ini direkomendasikan berdasarkan data audit"
    }
  ]
}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Gagal menghasilkan rencana aksi");

  return safeJsonParse<ActionPlanAI>(content, "Gagal mem-parse rencana aksi AI");
}

export interface GreenLendInput {
  businessName: string;
  sector: string;
  location: string;
  employeeCount: number;
  description?: string | null;
  totalEmissions: number;
  energyEmissions: number;
  transportEmissions: number;
  wasteEmissions: number;
  hasRenewableEnergy: boolean;
  hasWasteRecycling: boolean;
  hasOrganicPractices: boolean;
  hasFairWages: boolean;
  womenCount: number;
  communityImpact: number;
  hasOnlinePlatform: boolean;
  monthlyTxCount: number;
  finalScore: number;
  sdgScore: number;
  loanEligible: boolean;
  maxLoanIdr: number;
  interestRate: number;
}

export interface GreenLendAnalysisResult {
  strengths: string[];
  gaps: { issue: string; impact: string; action: string }[];
  quickWins: string[];
  scoreBreakdown: string;
  timeToImprove: string;
  motivationalNote: string;
}

export async function generateGreenLendAnalysis(
  input: GreenLendInput,
): Promise<GreenLendAnalysisResult> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 1500,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Kamu adalah konsultan keuangan mikro dan keberlanjutan yang membantu UMKM Indonesia meningkatkan akses modal melalui skor SDG/ESG platform GreenLend. GreenLend menggunakan formula: Skor Akhir = (Tradisional×20%) + (Data Alternatif×50%) + (SDG×30%). UMKM dengan skor ≥50 layak dapat pinjaman, ≥80 sampai Rp50jt dengan bunga 12%. Berikan analisa yang konkret, actionable, dan memotivasi dalam Bahasa Indonesia.`,
      },
      {
        role: "user",
        content: `Analisa profil UMKM berikut untuk kelayakan GreenLend:

Bisnis: ${input.businessName} (${input.sector}, ${input.location})
Karyawan: ${input.employeeCount} orang
Deskripsi: ${input.description ?? "-"}

Data karbon audit Fakhara AI:
- Total emisi: ${input.totalEmissions.toFixed(3)} ton CO₂e/tahun
- Emisi energi: ${input.energyEmissions.toFixed(3)} ton
- Emisi transportasi: ${input.transportEmissions.toFixed(3)} ton
- Emisi sampah: ${input.wasteEmissions.toFixed(3)} ton

Faktor hijau:
- Energi terbarukan: ${input.hasRenewableEnergy ? "YA" : "TIDAK"}
- Daur ulang sampah: ${input.hasWasteRecycling ? "YA" : "TIDAK"}
- Praktik organik: ${input.hasOrganicPractices ? "YA" : "TIDAK"}
- Upah layak: ${input.hasFairWages ? "YA" : "TIDAK"}
- Karyawan wanita: ${input.womenCount} orang
- Dampak komunitas (skala 1-10): ${input.communityImpact}
- Punya toko online (Tokopedia/Shopee/dll): ${input.hasOnlinePlatform ? "YA" : "TIDAK"}
- Estimasi transaksi digital/bulan: ${input.monthlyTxCount}

Simulasi skor saat ini:
- Skor Akhir GreenLend: ${input.finalScore.toFixed(1)}/100
- Skor SDG: ${input.sdgScore.toFixed(1)}/70
- Layak pinjaman: ${input.loanEligible ? `YA, maks Rp ${input.maxLoanIdr.toLocaleString("id-ID")} bunga ${input.interestRate}%` : "BELUM (skor <50)"}

Hasilkan analisa JSON dengan format persis:
{
  "strengths": ["kekuatan1", "kekuatan2", "kekuatan3"],
  "gaps": [
    {
      "issue": "masalah konkret",
      "impact": "dampak ke skor: +X poin jika diperbaiki",
      "action": "langkah konkret yang bisa dilakukan bulan ini"
    }
  ],
  "quickWins": ["aksi cepat 1", "aksi cepat 2", "aksi cepat 3"],
  "scoreBreakdown": "penjelasan singkat mengapa skor segini dan apa yang dominan",
  "timeToImprove": "estimasi waktu realistis untuk mencapai skor 70+ dengan usaha konsisten",
  "motivationalNote": "1-2 kalimat motivasi personal untuk UMKM ini"
}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return {
      strengths: ["Bisnis Anda sudah terdaftar dan melakukan audit karbon"],
      gaps: [],
      quickWins: ["Mulai dengan audit karbon rutin setiap bulan"],
      scoreBreakdown: "Skor dihitung berdasarkan data audit dan profil bisnis.",
      timeToImprove: "3-6 bulan dengan upaya konsisten",
      motivationalNote: "Setiap langkah kecil menuju keberlanjutan adalah investasi masa depan.",
    };
  }

  return safeJsonParse<GreenLendAnalysisResult>(content, "Gagal mem-parse analisa GreenLend");
}

export async function generateSupplierRecommendations(
  business: Business,
  breakdown: CarbonBreakdown,
): Promise<SupplierAI[]> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 1500,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Kamu adalah agen AI pakar rantai pasok hijau untuk UMKM Indonesia. Rekomendasikan pemasok/mitra ramah lingkungan yang realistis dan tersedia di Indonesia.`,
      },
      {
        role: "user",
        content: `Rekomendasikan pemasok hijau untuk:

Bisnis: ${business.name} (${business.sector})
Lokasi: ${business.location}

Profil emisi:
- Energi: ${breakdown.energyEmissions} ton CO2e
- Transportasi: ${breakdown.transportEmissions} ton CO2e
- Sampah: ${breakdown.wasteEmissions} ton CO2e
- Rantai Pasok: ${breakdown.supplyChainEmissions} ton CO2e

Buat 4-5 rekomendasi pemasok hijau yang relevan untuk sektor ${business.sector}. Format JSON:
{
  "suppliers": [
    {
      "name": "nama pemasok",
      "category": "energi|bahan_baku|packaging|logistik",
      "description": "deskripsi pemasok dan produk/layanan mereka",
      "greenCertification": "sertifikasi ramah lingkungan jika ada",
      "location": "kota/provinsi di Indonesia",
      "estimatedEmissionReduction": <estimasi pengurangan CO2e dalam ton>,
      "reasoning": "alasan mengapa pemasok ini cocok untuk bisnis ini",
      "website": "url website jika ada atau null"
    }
  ]
}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Gagal menghasilkan rekomendasi pemasok");

  const parsed = safeJsonParse<{ suppliers: SupplierAI[] }>(content, "Gagal mem-parse rekomendasi pemasok AI");
  return parsed.suppliers;
}

export async function generateEsgReport(
  business: Business,
  auditData: {
    totalEmissions: number;
    reductionFromBaseline: number;
    period: string;
    actionItemsCompleted: number;
    actionItemsTotal: number;
  },
): Promise<EsgReportAI> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 6000,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Kamu adalah konsultan ESG profesional untuk UMKM Indonesia. Tulis laporan singkat, padat, jujur, dan memotivasi dalam Bahasa Indonesia. Hindari pengulangan, fokus pada insight aktual.`,
      },
      {
        role: "user",
        content: `Buat laporan ESG untuk:

Bisnis: ${business.name} (${business.sector})
Lokasi: ${business.location}, ${business.employeeCount} karyawan
Periode: ${auditData.period}

Data keberlanjutan:
- Total emisi: ${auditData.totalEmissions} ton CO2e
- Pengurangan dari baseline: ${auditData.reductionFromBaseline}%
- Progress rencana aksi: ${auditData.actionItemsCompleted}/${auditData.actionItemsTotal} item selesai

Format JSON (setiap section MAKSIMAL 2 paragraf pendek, total respons WAJIB di bawah 4000 token):
{
  "period": "${auditData.period}",
  "environmentalScore": <skor 0-100>,
  "socialScore": <skor 0-100>,
  "governanceScore": <skor 0-100>,
  "overallScore": <rata-rata 0-100>,
  "reductionFromBaseline": ${auditData.reductionFromBaseline},
  "executiveSummary": "ringkasan eksekutif 1-2 paragraf",
  "environmentalSection": "analisis lingkungan 2 paragraf maks",
  "socialSection": "dampak sosial 1-2 paragraf",
  "governanceSection": "tata kelola 1-2 paragraf",
  "recommendations": "rekomendasi strategis 1-2 paragraf"
}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Gagal menghasilkan laporan ESG");

  return safeJsonParse<EsgReportAI>(content, "Gagal mem-parse laporan ESG AI");
}
