import { openai } from "@workspace/integrations-openai-ai-server";
import type { CarbonBreakdown } from "./carbonCalculator";

const MODEL = "gpt-4o";

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

  const parsed = JSON.parse(content) as { questions: ClarifyingQuestion[] };
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

  return JSON.parse(content) as ActionPlanAI;
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

  const parsed = JSON.parse(content) as { suppliers: SupplierAI[] };
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
    max_completion_tokens: 3000,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Kamu adalah konsultan ESG profesional yang membantu UMKM Indonesia membuat laporan keberlanjutan. Tulis laporan yang informatif, jujur, dan memotivasi dalam Bahasa Indonesia.`,
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

Buat laporan ESG komprehensif. Format JSON:
{
  "period": "${auditData.period}",
  "environmentalScore": <skor 0-100>,
  "socialScore": <skor 0-100>,
  "governanceScore": <skor 0-100>,
  "overallScore": <rata-rata 0-100>,
  "reductionFromBaseline": ${auditData.reductionFromBaseline},
  "executiveSummary": "ringkasan eksekutif 2-3 paragraf",
  "environmentalSection": "section E: analisis lingkungan detail 3-4 paragraf",
  "socialSection": "section S: dampak sosial untuk karyawan dan komunitas 2-3 paragraf",
  "governanceSection": "section G: tata kelola dan transparansi 2-3 paragraf",
  "recommendations": "rekomendasi strategis untuk tahun depan 2-3 paragraf"
}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Gagal menghasilkan laporan ESG");

  return JSON.parse(content) as EsgReportAI;
}
