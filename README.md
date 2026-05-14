# Fakhara AI

Fakhara AI adalah web app AI agent untuk UMKM Indonesia yang membantu audit operasional, menghitung jejak karbon, menyusun 8 rencana aksi prioritas, merekomendasikan supplier hijau, memantau progres bulanan, dan men-generate ESG report otomatis.

## Kenapa dibuat

Banyak UMKM ingin mulai lebih ramah lingkungan, tapi tidak punya waktu, tools, atau tim khusus. Fakhara AI dibuat untuk jadi asisten keberlanjutan yang transparan, praktis, dan mudah dipakai.

## Fitur utama

- Audit emisi dari listrik, bahan bakar, sampah, dan supply chain
- Analisis AI dengan pertanyaan klarifikasi bila data belum cukup
- 8 rencana aksi prioritas lengkap dengan status progress
- Rekomendasi supplier hijau
- Tracking progres bulanan
- Export laporan ESG
- Asisten AI dengan tool trace agar keputusan AI transparan

## Cara kerja

1. Tambahkan profil bisnis UMKM.
2. Jalankan audit operasional.
3. Lihat insight AI dan 8 rencana aksi.
4. Update status aksi dari pending ke in progress lalu completed.
5. Pantau progres dan export ESG report.

## Teknologi

- React + Vite
- TypeScript
- Express API
- PostgreSQL
- OpenAI GPT-4o

## AI usage

Aplikasi ini memakai OpenAI API untuk:

- generate insight audit
- generate 8 action plan
- search supplier hijau
- menghitung ROI
- menulis ESG report
- chat asisten AI dengan tool calling

Jika environment variable `OPENAI_API_KEY` tersedia, aplikasi akan memakai API key milik user secara langsung. Jika tidak, aplikasi fallback ke integrasi AI Replit.

## Struktur route

- `/` = landing page
- `/dashboard` = ringkasan bisnis
- `/businesses/new` = tambah bisnis
- `/businesses/:id` = detail bisnis

## Kriteria hackathon yang dipenuhi

- AI untuk dampak lingkungan dan sosial
- Solusi untuk UMKM Indonesia
- Agentic flow dengan tool usage
- Transparan karena ada trace penggunaan tool
- Output seluruh UI berbahasa Indonesia
- Ada tracking aksi, progres, dan laporan ESG

## Jalankan lokal

- `pnpm install`
- `pnpm --filter @workspace/fakhara-ai run dev`
- `pnpm --filter @workspace/api-server run dev`
