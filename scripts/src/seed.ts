import { db, pool } from "@workspace/db";
import {
  businesses,
  audits,
  actionPlans,
  actionItems,
  supplierRecommendations,
  progressRecords,
  esgReports,
} from "@workspace/db/schema";

interface CarbonInputs {
  electricityKwh: number;
  fuelLiters: number;
  wasteKg: number;
  supplyChainSpendIdr?: number;
  vehicleCount?: number;
  deliveriesPerMonth?: number;
}

interface CarbonBreakdown {
  energyEmissions: number;
  transportEmissions: number;
  wasteEmissions: number;
  supplyChainEmissions: number;
  totalEmissions: number;
}

const PLN_EMISSION_FACTOR = 0.000760;
const PETROL_EMISSION_FACTOR = 0.002370;
const WASTE_EMISSION_FACTOR = 0.000486;
const SUPPLY_CHAIN_FACTOR_PER_MILLION_IDR = 0.0015;
const DELIVERY_EMISSION_KG = 2.5;

function calculateCarbonFootprint(inputs: CarbonInputs): CarbonBreakdown {
  const energyEmissions = inputs.electricityKwh * PLN_EMISSION_FACTOR;
  const fuelEmissions = inputs.fuelLiters * PETROL_EMISSION_FACTOR;
  const deliveryEmissions = inputs.deliveriesPerMonth
    ? (inputs.deliveriesPerMonth * DELIVERY_EMISSION_KG) / 1000
    : 0;
  const transportEmissions = fuelEmissions + deliveryEmissions;
  const wasteEmissions = inputs.wasteKg * WASTE_EMISSION_FACTOR;
  const supplyChainEmissions = inputs.supplyChainSpendIdr
    ? (inputs.supplyChainSpendIdr / 1_000_000) * SUPPLY_CHAIN_FACTOR_PER_MILLION_IDR
    : 0;
  const totalEmissions =
    energyEmissions + transportEmissions + wasteEmissions + supplyChainEmissions;
  return {
    energyEmissions: Number(energyEmissions.toFixed(4)),
    transportEmissions: Number(transportEmissions.toFixed(4)),
    wasteEmissions: Number(wasteEmissions.toFixed(4)),
    supplyChainEmissions: Number(supplyChainEmissions.toFixed(4)),
    totalEmissions: Number(totalEmissions.toFixed(4)),
  };
}

async function seed() {
  if (process.env.NODE_ENV === "production") {
    console.error(
      "❌ Refusing to seed: NODE_ENV=production. " +
        "This script deletes all businesses. Set NODE_ENV to development or staging to proceed.",
    );
    process.exit(1);
  }

  console.log("🌱 Starting seed...");
  console.warn(
    "⚠️  WARNING: This will delete all existing businesses and their related data.",
  );

  const demoBusinesses = [
    {
      name: "Batik Nusantara Indah",
      sector: "Tekstil & Kerajinan",
      location: "Yogyakarta, Indonesia",
      employeeCount: 45,
      description:
        "Usaha batik tulis dan cap tradisional Yogyakarta yang memproduksi kain batik premium untuk pasar lokal dan ekspor. Menggunakan pewarna alam dan sintetis dengan proses canting manual.",
    },
    {
      name: "Warung Makan Sari Rasa",
      sector: "Makanan & Minuman",
      location: "Surabaya, Indonesia",
      employeeCount: 12,
      description:
        "Warung makan masakan Jawa yang melayani ratusan pelanggan setiap hari. Menyediakan catering untuk acara pernikahan dan perusahaan di sekitar Surabaya.",
    },
    {
      name: "PT Logam Maju Bersama",
      sector: "Manufaktur",
      location: "Bekasi, Indonesia",
      employeeCount: 110,
      description:
        "Pabrik pengolahan logam dan fabrikasi komponen industri skala menengah. Memproduksi spare part otomotif dan peralatan industri untuk kebutuhan dalam negeri.",
    },
  ] as const;

  const batikAuditInputs = {
    electricityKwh: 8_200,
    fuelLiters: 420,
    wasteKg: 1_850,
    supplyChainSpendIdr: 180_000_000,
    vehicleCount: 3,
    deliveriesPerMonth: 60,
  };

  const warungAuditInputs = {
    electricityKwh: 2_100,
    fuelLiters: 160,
    wasteKg: 3_200,
    supplyChainSpendIdr: 45_000_000,
    vehicleCount: 1,
    deliveriesPerMonth: 30,
  };

  const pabrikAuditInputs = {
    electricityKwh: 42_000,
    fuelLiters: 2_800,
    wasteKg: 12_400,
    supplyChainSpendIdr: 1_200_000_000,
    vehicleCount: 12,
    deliveriesPerMonth: 280,
  };

  const auditInputs = [batikAuditInputs, warungAuditInputs, pabrikAuditInputs];

  console.log("  ↳ Clearing existing demo data...");
  await db.delete(businesses);

  console.log("  ↳ Inserting businesses...");
  const insertedBusinesses = await db
    .insert(businesses)
    .values(demoBusinesses.map((b) => ({ ...b })))
    .returning();

  for (let i = 0; i < insertedBusinesses.length; i++) {
    const business = insertedBusinesses[i];
    const inputs = auditInputs[i];
    const emissions = calculateCarbonFootprint(inputs);

    console.log(`  ↳ Seeding data for: ${business.name}`);

    const [audit] = await db
      .insert(audits)
      .values({
        businessId: business.id,
        period: "2025-Q4",
        electricityKwh: String(inputs.electricityKwh),
        fuelLiters: String(inputs.fuelLiters),
        wasteKg: String(inputs.wasteKg),
        supplyChainSpendIdr: String(inputs.supplyChainSpendIdr ?? 0),
        vehicleCount: inputs.vehicleCount ?? 0,
        deliveriesPerMonth: inputs.deliveriesPerMonth ?? 0,
        energyEmissions: String(emissions.energyEmissions),
        transportEmissions: String(emissions.transportEmissions),
        wasteEmissions: String(emissions.wasteEmissions),
        supplyChainEmissions: String(emissions.supplyChainEmissions),
        totalEmissions: String(emissions.totalEmissions),
        aiInsights: buildAiInsights(business.name, business.sector, emissions),
      })
      .returning();

    const [plan] = await db
      .insert(actionPlans)
      .values({
        businessId: business.id,
        auditId: audit.id,
        summary: buildPlanSummary(business.name, business.sector, emissions),
        totalPotentialReduction: String(
          (emissions.totalEmissions * 0.32).toFixed(4),
        ),
      })
      .returning();

    await db
      .insert(actionItems)
      .values(buildActionItems(plan.id, business.sector, emissions));

    await db
      .insert(supplierRecommendations)
      .values(buildSuppliers(business.id, business.sector));

    await db
      .insert(progressRecords)
      .values(buildProgress(business.id, emissions.totalEmissions));

    await db.insert(esgReports).values({
      businessId: business.id,
      period: "2025",
      totalEmissions: String(emissions.totalEmissions),
      reductionFromBaseline: String(
        i === 0 ? "8.40" : i === 1 ? "5.20" : "3.80",
      ),
      environmentalScore: i === 0 ? 72 : i === 1 ? 65 : 58,
      socialScore: i === 0 ? 78 : i === 1 ? 70 : 74,
      governanceScore: i === 0 ? 74 : i === 1 ? 68 : 71,
      overallScore: i === 0 ? 75 : i === 1 ? 68 : 67,
      executiveSummary: buildExecutiveSummary(
        business.name,
        business.sector,
        emissions,
        i,
      ),
      environmentalSection: buildEnvironmentalSection(
        business.sector,
        emissions,
      ),
      socialSection: buildSocialSection(business.name, business.employeeCount, i),
      governanceSection: buildGovernanceSection(business.sector),
      recommendations: buildRecommendations(business.sector, emissions),
    });
  }

  console.log("✅ Seed complete!");
  await pool.end();
}

function buildAiInsights(
  name: string,
  sector: string,
  emissions: ReturnType<typeof calculateCarbonFootprint>,
): string {
  const dominantSource =
    emissions.energyEmissions > emissions.transportEmissions &&
    emissions.energyEmissions > emissions.wasteEmissions
      ? "konsumsi energi listrik"
      : emissions.transportEmissions > emissions.wasteEmissions
        ? "transportasi dan pengiriman"
        : "pengelolaan limbah";

  return `Analisis AI untuk ${name} (${sector}):

Berdasarkan data operasional Q4 2025, total emisi karbon bisnis ini sebesar ${emissions.totalEmissions.toFixed(2)} ton CO₂e. Sumber emisi dominan berasal dari ${dominantSource} yang menyumbang porsi terbesar dalam jejak karbon keseluruhan.

**Temuan Kunci:**
• Emisi energi: ${emissions.energyEmissions.toFixed(2)} ton CO₂e — ${((emissions.energyEmissions / emissions.totalEmissions) * 100).toFixed(1)}% dari total
• Emisi transportasi: ${emissions.transportEmissions.toFixed(2)} ton CO₂e — ${((emissions.transportEmissions / emissions.totalEmissions) * 100).toFixed(1)}% dari total
• Emisi limbah: ${emissions.wasteEmissions.toFixed(2)} ton CO₂e — ${((emissions.wasteEmissions / emissions.totalEmissions) * 100).toFixed(1)}% dari total
• Emisi rantai pasok: ${emissions.supplyChainEmissions.toFixed(2)} ton CO₂e — ${((emissions.supplyChainEmissions / emissions.totalEmissions) * 100).toFixed(1)}% dari total

**Peluang Reduksi:**
Dengan mengoptimalkan penggunaan energi melalui peralatan hemat daya dan mempertimbangkan transisi sebagian ke energi terbarukan, bisnis ini berpotensi mengurangi emisi hingga 30–35% dalam 12–18 bulan ke depan. Pengelolaan limbah yang lebih baik melalui program daur ulang juga dapat memberikan kontribusi signifikan.

**Benchmark Sektoral:**
Dibandingkan rata-rata UMKM sejenis di Indonesia, intensitas emisi bisnis ini masih dalam batas wajar namun memiliki ruang perbaikan yang cukup besar, khususnya di area ${dominantSource}.`;
}

function buildPlanSummary(
  name: string,
  sector: string,
  emissions: ReturnType<typeof calculateCarbonFootprint>,
): string {
  return `Rencana aksi reduksi emisi komprehensif untuk ${name} di sektor ${sector}. Berdasarkan audit Q4 2025 dengan total emisi ${emissions.totalEmissions.toFixed(2)} ton CO₂e, rencana ini menargetkan pengurangan emisi sebesar 32% dalam 18 bulan melalui efisiensi energi, optimasi transportasi, dan perbaikan pengelolaan limbah. Implementasi bertahap disesuaikan dengan kapasitas finansial UMKM.`;
}

function buildActionItems(
  planId: number,
  sector: string,
  emissions: ReturnType<typeof calculateCarbonFootprint>,
) {
  const baseItems = [
    {
      planId,
      title: "Penggantian Lampu ke LED",
      description:
        "Ganti seluruh lampu konvensional dengan lampu LED hemat energi di area produksi, gudang, dan kantor. Lampu LED mengkonsumsi 60–75% lebih sedikit energi dibanding lampu pijar atau neon.",
      category: "Energi",
      priority: "high",
      estimatedReduction: String((emissions.energyEmissions * 0.15).toFixed(4)),
      estimatedCostIdr: "12000000",
      reasoning:
        "Penggantian lampu LED adalah investasi dengan payback period tercepat (6–12 bulan) dan tidak memerlukan perubahan infrastruktur besar. Cocok sebagai langkah pertama transisi hijau.",
      status: "pending",
    },
    {
      planId,
      title: "Pemasangan Panel Surya Atap",
      description:
        "Instalasi panel surya on-grid kapasitas 10–20 kWp di atap gedung produksi untuk memenuhi 30–40% kebutuhan listrik dari energi terbarukan.",
      category: "Energi Terbarukan",
      priority: "medium",
      estimatedReduction: String((emissions.energyEmissions * 0.35).toFixed(4)),
      estimatedCostIdr: "85000000",
      reasoning:
        "Solar panel memberikan reduksi emisi terbesar jangka panjang dengan insentif pajak dari pemerintah Indonesia. ROI diperkirakan 4–6 tahun dengan penghematan tagihan listrik 30–40%.",
      status: "pending",
    },
    {
      planId,
      title: "Optimasi Rute Pengiriman",
      description:
        "Implementasi sistem perencanaan rute pengiriman digital untuk menggabungkan pengiriman, mengurangi jarak tempuh, dan menjadwalkan ulang pengiriman agar lebih efisien.",
      category: "Transportasi",
      priority: "high",
      estimatedReduction: String(
        (emissions.transportEmissions * 0.25).toFixed(4),
      ),
      estimatedCostIdr: "3500000",
      reasoning:
        "Optimasi rute dapat mengurangi konsumsi bahan bakar 20–30% tanpa investasi besar. Aplikasi navigasi pintar dapat diimplementasikan dengan biaya minimal.",
      status: "in_progress",
    },
    {
      planId,
      title: "Program Pemilahan dan Daur Ulang Limbah",
      description:
        "Terapkan sistem pemilahan limbah organik dan anorganik di titik sumber produksi. Jalin kemitraan dengan pengepul daur ulang lokal untuk limbah kertas, plastik, dan logam.",
      category: "Limbah",
      priority: "medium",
      estimatedReduction: String((emissions.wasteEmissions * 0.4).toFixed(4)),
      estimatedCostIdr: "5000000",
      reasoning:
        "Program daur ulang mengurangi volume limbah ke TPA yang menghasilkan gas metana. Beberapa jenis limbah dapat dijual ke pengepul, menciptakan pendapatan tambahan.",
      status: "pending",
    },
    {
      planId,
      title: "Audit & Pemeliharaan Peralatan Berkala",
      description:
        "Jadwalkan pemeliharaan rutin 3 bulanan untuk semua peralatan produksi dan sistem HVAC. Peralatan yang terpelihara baik beroperasi 15–25% lebih efisien.",
      category: "Efisiensi Operasional",
      priority: "low",
      estimatedReduction: String((emissions.energyEmissions * 0.1).toFixed(4)),
      estimatedCostIdr: "8000000",
      reasoning:
        "Peralatan yang tidak terpelihara sering memboroskan energi secara tidak terdeteksi. Pemeliharaan preventif lebih hemat dari perbaikan darurat dan memperpanjang umur aset.",
      status: "pending",
    },
  ];

  if (sector === "Makanan & Minuman") {
    baseItems[3].title = "Komposting Limbah Organik Dapur";
    baseItems[3].description =
      "Olah sisa bahan makanan dan limbah dapur menjadi kompos menggunakan komposter aerobik. Kompos dapat digunakan untuk kebun sayur di sekitar usaha atau dijual ke petani lokal.";
    baseItems[3].reasoning =
      "Warung makan menghasilkan limbah organik dalam jumlah besar. Komposting mengurangi emisi metana dari pembusukan di TPA sekaligus menghasilkan nilai tambah dari limbah.";
  }

  if (sector === "Manufaktur") {
    baseItems[4].title = "Sistem Monitoring Energi Real-time";
    baseItems[4].description =
      "Pasang smart meter dan sistem SCADA sederhana untuk memantau konsumsi energi per mesin secara real-time. Data ini memungkinkan identifikasi pemborosan energi dan optimasi jadwal produksi.";
    baseItems[4].reasoning =
      "Pabrik sering tidak mengetahui mesin mana yang paling boros energi. Monitoring real-time memungkinkan pengambilan keputusan berbasis data dan penghematan energi 10–20%.";
    baseItems[4].estimatedCostIdr = "35000000";
  }

  return baseItems;
}

function buildSuppliers(businessId: number, sector: string) {
  const suppliersBySector: Record<
    string,
    Array<{
      businessId: number;
      name: string;
      category: string;
      description: string;
      greenCertification: string;
      location: string;
      estimatedEmissionReduction: string;
      reasoning: string;
      website: string;
    }>
  > = {
    "Tekstil & Kerajinan": [
      {
        businessId,
        name: "Alam Warna Nusantara",
        category: "Pewarna Alam",
        description:
          "Pemasok pewarna tekstil berbasis bahan alami (indigo, kulit pohon, tanaman tropis) bersertifikat organik. Menggantikan pewarna sintetis berbahan kimia berbahaya.",
        greenCertification: "SNI Organik, OEKO-TEX Standard 100",
        location: "Solo, Jawa Tengah",
        estimatedEmissionReduction: "1.2000",
        reasoning:
          "Pewarna alam menghasilkan 60% lebih sedikit limbah B3 dan mendukung klaim ramah lingkungan yang meningkatkan nilai jual batik premium di pasar ekspor.",
        website: "https://alamwarna.co.id",
      },
      {
        businessId,
        name: "Koperasi Kapas Hijau Jawa",
        category: "Bahan Baku Kain",
        description:
          "Koperasi petani kapas organik bersertifikat dari Jawa Tengah. Menyediakan benang dan kain katun premium tanpa pestisida sintetis.",
        greenCertification: "GOTS (Global Organic Textile Standard)",
        location: "Demak, Jawa Tengah",
        estimatedEmissionReduction: "0.8500",
        reasoning:
          "Kapas organik mengurangi dampak lingkungan rantai pasok secara signifikan. Pembelian langsung dari koperasi juga mendukung petani lokal.",
        website: "https://kapashijau.id",
      },
      {
        businessId,
        name: "EcoWax Indonesia",
        category: "Malam Batik Ramah Lingkungan",
        description:
          "Produsen malam batik dari campuran lilin lebah dan minyak nabati yang dapat terurai secara alami. Alternatif hijau untuk malam parafin berbasis petroleum.",
        greenCertification: "Ecolabel Indonesia",
        location: "Yogyakarta, DIY",
        estimatedEmissionReduction: "0.5000",
        reasoning:
          "Malam nabati mengurangi emisi VOC selama proses pelorodan dan tidak menghasilkan limbah B3 yang membutuhkan penanganan khusus.",
        website: "https://ecowax.id",
      },
    ],
    "Makanan & Minuman": [
      {
        businessId,
        name: "Pasar Tani Organik Surabaya",
        category: "Bahan Baku Organik",
        description:
          "Jaringan petani organik terverifikasi yang memasok sayuran, rempah, dan bahan segar langsung ke warung makan dengan radius pengiriman < 50 km.",
        greenCertification: "Sertifikat Organik LSPO",
        location: "Mojokerto, Jawa Timur",
        estimatedEmissionReduction: "0.3500",
        reasoning:
          "Sourcing lokal mengurangi emisi transportasi rantai pasok hingga 70%. Produk organik juga menjadi daya tarik bagi konsumen yang sadar kesehatan.",
        website: "https://pasartanisurabaya.id",
      },
      {
        businessId,
        name: "GasCool LPG Terkonversi",
        category: "Energi Memasak",
        description:
          "Layanan konversi kompor LPG ke kompor induksi listrik dengan paket cicilan terjangkau, termasuk instalasi dan garansi 2 tahun.",
        greenCertification: "SNI Kompor Induksi",
        location: "Surabaya, Jawa Timur",
        estimatedEmissionReduction: "0.6000",
        reasoning:
          "Kompor induksi 90% lebih efisien dari kompor gas dan menghilangkan emisi pembakaran langsung di area dapur, meningkatkan kualitas udara dalam ruangan.",
        website: "https://gascool.id",
      },
      {
        businessId,
        name: "BioPack Kemasan Alami",
        category: "Kemasan Ramah Lingkungan",
        description:
          "Produsen kemasan makanan berbahan bambu, daun pisang press, dan bioplastik PLA. Menggantikan styrofoam dan plastik konvensional.",
        greenCertification: "OK Compost, TÜV Austria",
        location: "Malang, Jawa Timur",
        estimatedEmissionReduction: "0.2800",
        reasoning:
          "Kemasan biodegradable mengurangi limbah plastik yang berakhir di TPA. Sesuai regulasi pengurangan plastik sekali pakai yang semakin ketat di Indonesia.",
        website: "https://biopack.id",
      },
    ],
    Manufaktur: [
      {
        businessId,
        name: "PT Baja Hijau Nusantara",
        category: "Material Daur Ulang",
        description:
          "Pemasok baja dan logam reklamasi (scrap metal) berkualitas tinggi yang telah melalui proses sorting dan pemurnian standar industri.",
        greenCertification: "ISO 14001:2015, Green Building Council Indonesia",
        location: "Cikarang, Jawa Barat",
        estimatedEmissionReduction: "8.5000",
        reasoning:
          "Baja daur ulang membutuhkan 74% lebih sedikit energi untuk produksi dibanding baja baru. Mengurangi emisi Scope 3 rantai pasok secara signifikan.",
        website: "https://bajahijau.co.id",
      },
      {
        businessId,
        name: "SolarIndo Industrial",
        category: "Energi Surya Industri",
        description:
          "Penyedia solusi energi surya skala industri termasuk panel, inverter, sistem monitoring, dan layanan O&M untuk pabrik dan gudang.",
        greenCertification: "IEC 61215, ESDM Approved Installer",
        location: "Bekasi, Jawa Barat",
        estimatedEmissionReduction: "12.3000",
        reasoning:
          "Pabrik dengan konsumsi listrik tinggi mendapat manfaat terbesar dari solar. Dengan atap pabrik yang luas, kapasitas 50–100 kWp memungkinkan dan memberikan ROI 4–5 tahun.",
        website: "https://solarindo.industrial.id",
      },
      {
        businessId,
        name: "EcoLogis Express",
        category: "Logistik Ramah Lingkungan",
        description:
          "Perusahaan logistik yang mengoperasikan armada kendaraan CNG dan hybrid untuk pengiriman industri dengan sistem tracking dan optimasi rute berbasis AI.",
        greenCertification: "ISO 14064, Carbon Neutral Logistics",
        location: "Jakarta Timur, DKI Jakarta",
        estimatedEmissionReduction: "4.2000",
        reasoning:
          "Mengalihkan pengiriman ke armada CNG/hybrid dapat mengurangi emisi transportasi 40–60%. Terintegrasi dengan sistem ERP untuk efisiensi total rantai pasok.",
        website: "https://ecologis.co.id",
      },
    ],
  };

  return (
    suppliersBySector[sector] ?? suppliersBySector["Tekstil & Kerajinan"]
  );
}

function buildProgress(businessId: number, baselineEmissions: number) {
  const months = ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02"];
  const reductionFactors = [0.0, 0.03, 0.055, 0.08, 0.105];

  return months.map((month, idx) => {
    const reductionFactor = reductionFactors[idx];
    const actual = baselineEmissions * (1 - reductionFactor);
    const reductionPercent = reductionFactor * 100;

    const notesByIdx = [
      "Data baseline awal sebelum implementasi rencana aksi.",
      "Mulai penggantian lampu LED di area produksi utama (30% selesai).",
      "Penggantian lampu LED selesai 100%. Mulai optimasi rute pengiriman.",
      "Optimasi rute pengiriman berhasil mengurangi konsumsi BBM 18%.",
      "Program pemilahan limbah mulai berjalan. Monitoring konsumsi energi aktif.",
    ];

    return {
      businessId,
      month,
      actualEmissions: String(actual.toFixed(4)),
      baselineEmissions: String(baselineEmissions.toFixed(4)),
      reductionPercent: String(reductionPercent.toFixed(2)),
      notes: notesByIdx[idx],
    };
  });
}

function buildExecutiveSummary(
  name: string,
  sector: string,
  emissions: ReturnType<typeof calculateCarbonFootprint>,
  idx: number,
): string {
  const scores = [
    { env: 72, soc: 78, gov: 74, overall: 75 },
    { env: 65, soc: 70, gov: 68, overall: 68 },
    { env: 58, soc: 74, gov: 71, overall: 67 },
  ];
  const s = scores[idx];

  return `Laporan ESG Tahunan 2025 — ${name}

${name} telah menyelesaikan audit keberlanjutan komprehensif pertamanya untuk tahun fiskal 2025. Laporan ini merangkum kinerja lingkungan, sosial, dan tata kelola (ESG) perusahaan sebagai bagian dari komitmen terhadap praktik bisnis berkelanjutan.

Total jejak karbon perusahaan pada periode 2025 tercatat sebesar ${emissions.totalEmissions.toFixed(2)} ton CO₂e, yang menempatkan kami dalam kategori menengah untuk UMKM sektor ${sector} di Indonesia. Skor ESG keseluruhan kami mencapai ${s.overall}/100, mencerminkan fondasi yang baik dengan ruang perbaikan yang teridentifikasi jelas.

Inisiatif hijau yang telah dijalankan sepanjang 2025 berhasil menugurangi emisi sebesar ${idx === 0 ? "8,4" : idx === 1 ? "5,2" : "3,8"}% dibandingkan baseline, melampaui target awal kami sebesar ${idx === 0 ? "6" : idx === 1 ? "4" : "3"}%. Pencapaian ini didorong oleh efisiensi energi dan optimasi operasional yang berjalan lebih cepat dari rencana.

Ke depan, ${name} berkomitmen untuk meningkatkan skor ESG menjadi di atas 80 pada 2027 melalui implementasi rencana aksi yang telah disusun bersama konsultan AI Fakhara.`;
}

function buildEnvironmentalSection(
  sector: string,
  emissions: ReturnType<typeof calculateCarbonFootprint>,
): string {
  return `**Kinerja Lingkungan**

Total emisi GRK: ${emissions.totalEmissions.toFixed(2)} ton CO₂e
• Lingkup 1 (Langsung): ${emissions.transportEmissions.toFixed(2)} ton CO₂e (bahan bakar kendaraan)
• Lingkup 2 (Tidak Langsung): ${emissions.energyEmissions.toFixed(2)} ton CO₂e (listrik PLN)
• Lingkup 3 (Rantai Nilai): ${(emissions.wasteEmissions + emissions.supplyChainEmissions).toFixed(2)} ton CO₂e (limbah & rantai pasok)

**Pengelolaan Energi:**
Konsumsi energi listrik menjadi kontributor terbesar emisi (${((emissions.energyEmissions / emissions.totalEmissions) * 100).toFixed(0)}%). Program efisiensi energi yang dijalankan telah memberikan penghematan nyata. Target jangka menengah adalah memasang panel surya untuk memenuhi 30–40% kebutuhan listrik dari energi terbarukan.

**Pengelolaan Limbah:**
Program pemilahan limbah di sumber produksi telah dimulai pada Q4 2025. Kerjasama dengan mitra daur ulang lokal direncanakan dimulai Q1 2026 untuk mengurangi volume limbah ke TPA sebesar 40%.

**Biodiversitas & Air:**
Tidak ada dampak signifikan terhadap kawasan bernilai ekologis tinggi. Konsumsi air berada dalam batas normal untuk sektor ${sector}.`;
}

function buildSocialSection(name: string, employeeCount: number, idx: number): string {
  const localSupplierPct = [65, 72, 68][idx] ?? 68;
  return `**Kinerja Sosial**

**Ketenagakerjaan:**
Total karyawan: ${employeeCount} orang (${Math.round(employeeCount * 0.55)} perempuan, ${Math.round(employeeCount * 0.45)} laki-laki)
• Seluruh karyawan mendapat upah di atas UMR setempat
• Tidak ada kasus kecelakaan kerja serius sepanjang 2025
• Program pelatihan keselamatan kerja dijalankan setiap kuartal

**Komunitas Lokal:**
${name} aktif berkontribusi pada pemberdayaan masyarakat sekitar melalui program magang dan pelatihan keterampilan bagi warga lokal. Sebanyak ${Math.round(employeeCount * 0.7)}% karyawan berasal dari area dalam radius 10 km dari lokasi usaha.

**Rantai Pasok:**
Pemasok lokal diprioritaskan dengan ${localSupplierPct}% pembelian dari mitra dalam provinsi yang sama. Seleksi pemasok mulai memasukkan kriteria keberlanjutan sejak 2025.

**Kesehatan & Keselamatan:**
Semua area kerja memenuhi standar K3 nasional. APD tersedia dan penggunaannya dimonitor secara aktif.`;
}

function buildGovernanceSection(sector: string): string {
  return `**Kinerja Tata Kelola**

**Struktur Organisasi:**
Manajemen aktif terlibat dalam pengambilan keputusan keberlanjutan. Pemilik usaha telah menunjuk penanggung jawab program ESG internal yang berkoordinasi langsung dengan manajemen puncak.

**Transparansi & Pelaporan:**
Laporan ESG ini merupakan laporan tahunan pertama yang dipublikasikan secara formal. Ke depan, pelaporan akan dilakukan setiap tahun dengan audit eksternal yang direncanakan pada 2026.

**Kepatuhan Regulasi:**
Seluruh operasional bisnis mematuhi regulasi lingkungan yang berlaku di Indonesia, termasuk izin lingkungan dan pelaporan limbah sesuai ketentuan KLHK. Tidak ada pelanggaran regulasi yang tercatat selama 2025.

**Manajemen Risiko:**
Risiko iklim telah diidentifikasi sebagai risiko material jangka menengah, khususnya terkait ketidakpastian pasokan energi dan potensi kenaikan biaya karbon. Rencana mitigasi sedang disusun sebagai bagian dari strategi keberlanjutan 5 tahun.

**Anti-Korupsi:**
Kebijakan anti-korupsi dan kode etik bisnis berlaku untuk semua karyawan dan mitra usaha. Pelatihan etika bisnis dilaksanakan setahun sekali.`;
}

function buildRecommendations(
  sector: string,
  emissions: ReturnType<typeof calculateCarbonFootprint>,
): string {
  return `**Rekomendasi Strategis 2026**

Berdasarkan analisis kinerja ESG 2025, berikut prioritas aksi untuk meningkatkan keberlanjutan bisnis:

**Prioritas Tinggi (Q1–Q2 2026):**
1. Selesaikan instalasi lampu LED di semua area dan pastikan pemeliharaan rutin dilakukan
2. Formalisasi program pemilahan limbah dengan target pengurangan ke TPA 40%
3. Mulai negosiasi dengan pemasok hijau yang direkomendasikan

**Prioritas Menengah (Q3–Q4 2026):**
4. Studi kelayakan pemasangan panel surya dan pengajuan insentif perpajakan hijau
5. Implementasi sistem monitoring emisi digital untuk pelaporan otomatis
6. Pelatihan seluruh karyawan tentang praktik kerja ramah lingkungan

**Target Kinerja 2026:**
• Pengurangan emisi: min. ${((emissions.totalEmissions * 0.15).toFixed(2))} ton CO₂e (15% dari baseline)
• Skor ESG keseluruhan: target 75+ (naik dari posisi saat ini)
• Persentase energi terbarukan: 20% dari total konsumsi listrik

Fakhara AI akan terus memantau progres dan memperbarui rekomendasi secara berkala sesuai perkembangan implementasi.`;
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
