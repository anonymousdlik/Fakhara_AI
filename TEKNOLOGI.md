# Kerangka Kerja dan Alat — Fakhara AI

> Proyek ini dibangun untuk Technofest 2026, menargetkan 64 juta UMKM Indonesia dengan solusi audit karbon berbasis AI, perencanaan aksi hijau, dan akses modal berbasis skor ESG/SDG.

---

## 1. Kerangka Kerja dan Alat

### Bahasa Pemrograman

| Bahasa | Versi | Digunakan Untuk |
|---|---|---|
| **TypeScript** | 5.x | Seluruh codebase frontend dan backend — type-safe untuk mencegah bug runtime |
| **JavaScript (ESM)** | ES2022+ | Output transpilasi dan konfigurasi tooling |

---

### Kerangka Kerja Agen AI

Fakhara AI menggunakan **agen penalaran buatan sendiri** (*custom reasoning agent*) — tidak bergantung pada framework agen pihak ketiga seperti LangChain atau CrewAI. Arsitektur agen diimplementasikan langsung di `artifacts/api-server/src/services/aiAgent.ts` dengan pola berikut:

- **Tool-calling loop**: Model GPT-4o menerima daftar tools yang tersedia (audit data, progress history, supplier search, ROI calculator), lalu secara iteratif memilih tool yang relevan dan mengeksekusinya hingga jawaban final terbentuk.
- **Structured output**: Setiap fitur AI (audit karbon, ESG report, GreenLend analysis) menggunakan `response_format: { type: "json_object" }` agar output deterministik dan bisa diparsing langsung.
- **Context injection**: Data bisnis, emisi, dan riwayat aksi diinjeksikan sebagai system prompt sehingga model "tahu" konteks pengguna tanpa memory eksternal.

---

### API dan SDK untuk LLM

| Nama | Penyedia | Tautan | Digunakan Untuk |
|---|---|---|---|
| **OpenAI API — GPT-4o** | OpenAI | [platform.openai.com](https://platform.openai.com/docs) | Analisis audit karbon, pembuatan 8 rencana aksi prioritas, generate laporan ESG, rekomendasi supplier hijau, analisa kelayakan GreenLend, dan AI chatbot interaktif |
| **OpenAI Vision API — GPT-4o** | OpenAI | [platform.openai.com/docs/guides/vision](https://platform.openai.com/docs/guides/vision) | OCR struk tagihan listrik/air/gas — gambar dikonversi ke base64 lalu diekstrak nilainya oleh model vision |
| **OpenAI Node.js SDK** | OpenAI | [github.com/openai/openai-node](https://github.com/openai/openai-node) | Wrapper resmi untuk memanggil OpenAI API dari backend Node.js |

---

### Kerangka Kerja Backend

| Nama | Penyedia | Versi | Tautan | Digunakan Untuk |
|---|---|---|---|---|
| **Node.js** | OpenJS Foundation | 20.x LTS | [nodejs.org](https://nodejs.org) | Runtime JavaScript server-side; menjalankan seluruh API server |
| **Express.js** | OpenJS Foundation | v5 | [expressjs.com](https://expressjs.com) | REST API framework — routing endpoint audit, bisnis, progress, ESG report, GreenLend, dan AI agent chat |
| **Pino** | Matteo Collina et al. | ^9 | [getpino.io](https://getpino.io) | Structured JSON logging untuk monitoring request/response di server |
| **Pino HTTP** | - | ^10 | [github.com/pinojs/pino-http](https://github.com/pinojs/pino-http) | Middleware Express untuk logging otomatis setiap HTTP request |

---

### Kerangka Kerja Frontend

| Nama | Penyedia | Versi | Tautan | Digunakan Untuk |
|---|---|---|---|---|
| **React** | Meta (Facebook) | 18.x | [react.dev](https://react.dev) | Library UI utama — semua komponen halaman dibangun sebagai React component |
| **Vite** | Evan You / Vite Team | 6.x | [vitejs.dev](https://vitejs.dev) | Build tool dan dev server dengan Hot Module Replacement (HMR) |
| **TanStack React Query** | Tanner Linsley | v5 | [tanstack.com/query](https://tanstack.com/query/latest) | Data fetching, caching, dan sinkronisasi state server — digunakan untuk semua panggilan API |
| **Wouter** | Alexey Taktarov | ^3 | [github.com/molefrog/wouter](https://github.com/molefrog/wouter) | Client-side routing ringan tanpa dependency besar |
| **Recharts** | Recharts Group | ^2 | [recharts.org](https://recharts.org) | Visualisasi data — grafik area tren emisi dan distribusi karbon di tab Progress |
| **Tailwind CSS** | Tailwind Labs | v4 | [tailwindcss.com](https://tailwindcss.com) | Utility-first CSS framework untuk seluruh styling UI |
| **Radix UI** | WorkOS | ^1 | [radix-ui.com](https://www.radix-ui.com) | Komponen UI headless yang aksesibel (Tabs, Dialog, Progress, Select, dll.) |
| **shadcn/ui** | shadcn | - | [ui.shadcn.com](https://ui.shadcn.com) | Koleksi komponen siap pakai berbasis Radix UI + Tailwind (Card, Button, Badge, dll.) |
| **Framer Motion** | Framer | catalog | [framer.com/motion](https://www.framer.com/motion) | Animasi UI halus pada transisi komponen |
| **Lucide React** | Lucide Contributors | catalog | [lucide.dev](https://lucide.dev) | Library ikon SVG — digunakan di seluruh antarmuka |
| **React Hook Form** | Bill, Beier | ^7 | [react-hook-form.com](https://react-hook-form.com) | Manajemen state form yang efisien dengan validasi |
| **Zod** | Colin McDonnell | catalog | [zod.dev](https://zod.dev) | Schema validation untuk data form dan response API |

---

### Basis Data dan ORM

| Nama | Penyedia | Versi | Tautan | Digunakan Untuk |
|---|---|---|---|---|
| **PostgreSQL** | PostgreSQL Global Development Group | 16.x | [postgresql.org](https://www.postgresql.org) | Basis data relasional utama — menyimpan data bisnis, hasil audit karbon, rencana aksi, riwayat progress, laporan ESG, dan rekomendasi supplier |
| **Drizzle ORM** | Drizzle Team | catalog | [orm.drizzle.team](https://orm.drizzle.team) | TypeScript ORM untuk query PostgreSQL secara type-safe tanpa raw SQL |
| **Drizzle Kit** | Drizzle Team | ^0.31 | [orm.drizzle.team/docs/kit-overview](https://orm.drizzle.team/docs/kit-overview) | CLI tool untuk migrasi dan push schema database |
| **Drizzle Zod** | Drizzle Team | ^0.8 | [github.com/drizzle-team/drizzle-orm](https://github.com/drizzle-team/drizzle-orm) | Auto-generate Zod schema dari Drizzle table schema |
| **pg (node-postgres)** | Brian Carlson | ^8 | [node-postgres.com](https://node-postgres.com) | Driver PostgreSQL native untuk Node.js |

---

### Layanan Cloud dan Infrastruktur

| Nama | Penyedia | Tautan | Digunakan Untuk |
|---|---|---|---|
| **Replit** | Replit Inc. | [replit.com](https://replit.com) | Platform cloud hosting — deployment aplikasi, managed PostgreSQL database, environment secrets (menyimpan `OPENAI_API_KEY` secara aman), dan domain produksi `.replit.app` |

---

## 2. Kutipan Lengkap Perangkat Lunak dan API

> "Proyek ini menggunakan **OpenAI API (GPT-4o)** oleh OpenAI ([platform.openai.com](https://platform.openai.com)) untuk pembuatan analisis audit karbon, penyusunan rencana aksi hijau, generasi laporan ESG otomatis, rekomendasi supplier, analisa kelayakan kredit berbasis SDG, dan asisten AI interaktif. Fitur OCR tagihan utilitas juga menggunakan **GPT-4o Vision API** dari OpenAI yang sama untuk mengekstrak data konsumsi energi dari gambar struk."

> "Antarmuka pengguna dibangun dengan **React 18** oleh Meta ([react.dev](https://react.dev)) sebagai framework UI utama, dikompilasi menggunakan **Vite** ([vitejs.dev](https://vitejs.dev)) sebagai build tool, dengan styling menggunakan **Tailwind CSS** oleh Tailwind Labs ([tailwindcss.com](https://tailwindcss.com)) dan komponen aksesibel dari **Radix UI** oleh WorkOS ([radix-ui.com](https://www.radix-ui.com))."

> "Backend REST API diimplementasikan menggunakan **Express.js v5** oleh OpenJS Foundation ([expressjs.com](https://expressjs.com)) yang berjalan di atas **Node.js** ([nodejs.org](https://nodejs.org)), dengan **Drizzle ORM** ([orm.drizzle.team](https://orm.drizzle.team)) untuk interaksi type-safe ke basis data **PostgreSQL** ([postgresql.org](https://www.postgresql.org))."

> "Visualisasi data emisi karbon menggunakan **Recharts** ([recharts.org](https://recharts.org)) untuk grafik tren dan distribusi. Data fetching dan caching client-side dikelola oleh **TanStack React Query v5** ([tanstack.com/query](https://tanstack.com/query/latest)). Seluruh aplikasi di-host dan di-deploy di platform **Replit** ([replit.com](https://replit.com))."

---

*Dokumen ini dibuat untuk keperluan dokumentasi teknis Technofest 2026.*
