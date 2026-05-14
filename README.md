# Fakhara AI

> **Intelligent by Design, Elegant by Nature**

Fakhara AI adalah AI Agent berbasis web untuk 64 juta UMKM Indonesia — membantu audit emisi karbon, menyusun rencana aksi hijau, merekomendasikan supplier ramah lingkungan, memantau progres bulanan, dan membuka akses modal berbasis skor ESG/SDG.

Dibangun untuk **Technofest 2026**.

---

## Kenapa Dibuat

Banyak UMKM ingin lebih ramah lingkungan, tapi tidak punya waktu, tools, atau tim khusus ESG. Bank dan lembaga kredit semakin mensyaratkan laporan ESG — tapi UMKM tidak tahu cara membuatnya. Fakhara AI hadir sebagai asisten keberlanjutan yang praktis, transparan, dan langsung bisa dipakai tanpa keahlian teknis.

---

## Fitur Saat Ini

| Fitur | Deskripsi |
|---|---|
| **Audit Emisi Karbon** | Hitung jejak karbon dari listrik, bahan bakar, sampah, dan supply chain |
| **OCR Struk Tagihan** | Upload foto tagihan listrik/air/gas — AI otomatis baca dan isi data audit |
| **8 Rencana Aksi AI** | Dapat 8 aksi prioritas berdasarkan data emisi, lengkap dengan estimasi dampak |
| **Supplier Hijau** | Rekomendasi pemasok ramah lingkungan berdasarkan kategori bisnis |
| **Tracking Progress** | Catat progres emisi bulanan, lihat grafik tren, export CSV |
| **Laporan ESG** | Generate laporan ESG otomatis (E/S/G score + narasi) — bisa download PDF berlogo |
| **Carbon Credit Simulator** | Estimasi kredit karbon dan setara pohon dari 3 aksi teratas |
| **Green ROI Calculator** | Hitung penghematan biaya (Rp/tahun) dari investasi hijau |
| **Akses Modal Hijau** | Simulasi skor GreenLend — platform kredit UMKM berbasis SDG — lengkap analisa AI |
| **Asisten AI** | Chat dengan AI yang punya akses data bisnis; semua tool call transparan (ada trace) |

---

## Cara Kerja

1. Tambahkan profil bisnis UMKM (nama, sektor, lokasi, jumlah karyawan)
2. Jalankan audit operasional — isi manual atau upload struk via OCR
3. Lihat insight AI dan 8 rencana aksi prioritas
4. Update status aksi dari *pending* → *in progress* → *completed*
5. Catat progres emisi bulanan dan pantau grafik tren
6. Generate laporan ESG dan download PDF berlogo Fakhara AI
7. Simulasi skor GreenLend untuk melihat peluang akses modal

---

## Teknologi

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Radix UI, TanStack React Query, Recharts
- **Backend**: Node.js, Express.js v5, TypeScript
- **Database**: PostgreSQL, Drizzle ORM
- **AI**: OpenAI GPT-4o (teks + vision untuk OCR)
- **Hosting**: Replit

Lihat [`TEKNOLOGI.md`](./TEKNOLOGI.md) untuk dokumentasi lengkap semua library, API, dan kutipan resmi.

---

## AI Usage

Aplikasi menggunakan OpenAI GPT-4o untuk:

- Analisis dan klarifikasi data audit karbon
- Generate 8 rencana aksi prioritas
- OCR struk tagihan utilitas (vision API)
- Rekomendasi supplier hijau
- Perhitungan ROI investasi hijau
- Generate laporan ESG (skor + narasi E/S/G)
- Analisa kelayakan kredit GreenLend berbasis SDG
- Chat asisten AI dengan tool calling dan trace transparan

Jika `OPENAI_API_KEY` tersedia, aplikasi memakai key user langsung. Jika tidak, fallback ke integrasi AI Replit.

---

## Struktur Route

- `/` — Landing page
- `/dashboard` — Ringkasan semua bisnis
- `/businesses/new` — Tambah bisnis baru
- `/businesses/:id` — Detail bisnis (8 tab: Audit, Rencana Aksi, Supplier, Progress, ESG, Akses Modal, Asisten AI)

---

## Kriteria Hackathon yang Dipenuhi

- AI untuk dampak lingkungan dan sosial (SDGs 8, 13, 17)
- Solusi nyata untuk UMKM Indonesia (64 juta target)
- Agentic flow dengan tool usage dan reasoning iteratif
- Transparan: setiap keputusan AI punya trace tool yang bisa dilihat user
- Seluruh UI dalam Bahasa Indonesia
- Tracking aksi, progres bulanan, dan laporan ESG siap presentasi
- Integrasi ekosistem: Fakhara AI ↔ GreenLend untuk akses modal

---

## 🗺️ Roadmap

### v1.1 — Pengalaman Pengguna yang Lebih Baik *(Q3 2026)*
- [ ] Notifikasi deadline rencana aksi (email/WhatsApp reminder)
- [ ] Multi-user per bisnis — undang anggota tim dengan role editor/viewer
- [ ] Mobile web responsif penuh untuk pemakaian di lapangan
- [ ] Dark mode
- [ ] Onboarding tour interaktif untuk pengguna baru

### v1.2 — Data dan Integrasi *(Q3–Q4 2026)*
- [ ] **Integrasi PLN/Tokopedia/Shopee** — fetch data konsumsi otomatis dari akun resmi
- [ ] Import massal via Excel/CSV untuk bisnis dengan banyak cabang
- [ ] Integrasi Google Sheets untuk sinkronisasi data emisi dua arah
- [ ] Webhook API publik agar data Fakhara AI bisa dipakai sistem pihak ketiga

### v2.0 — Platform Ekosistem Hijau *(Q1 2027)*
- [ ] **Marketplace Supplier Hijau** — UMKM bisa daftar dan terverifikasi sebagai supplier hijau
- [ ] **Benchmarking Industri** — bandingkan emisi dengan rata-rata bisnis sejenis di sektor dan kota yang sama
- [ ] **GreenLend Direct Apply** — ajukan pinjaman ke GreenLend langsung dari Fakhara AI dengan data skor otomatis terkirim
- [ ] **Carbon Credit Marketplace** — jual kredit karbon yang sudah diverifikasi ke korporasi atau platform offset

### v2.1 — Skala dan Kepercayaan *(Q2 2027)*
- [ ] **Verifikasi laporan ESG** oleh auditor pihak ketiga terintegrasi
- [ ] **Blockchain timestamping** untuk laporan ESG — bukti tidak bisa dimanipulasi
- [ ] **API untuk Bank dan Koperasi** — institusi keuangan bisa query skor ESG UMKM langsung
- [ ] **White-label** — platform bisa dipakai oleh Dinas Koperasi / bank penyalur KUR

### v3.0 — Jaringan UMKM Hijau Indonesia *(2028)*
- [ ] **Komunitas UMKM Hijau** — forum peer-to-peer berbagi praktik terbaik
- [ ] **Sertifikasi digital** — UMKM yang capai target emisi dapat sertifikat verifikasi Fakhara AI
- [ ] **Integrasi BPOM/BSN** — data keberlanjutan masuk ke proses sertifikasi halal dan SNI
- [ ] **Dashboard Nasional** — visualisasi agregat dampak semua UMKM pengguna untuk laporan SDG Indonesia

---

## Jalankan Lokal

```bash
pnpm install
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/fakhara-ai run dev
```

Set environment variable:
```
OPENAI_API_KEY=sk-...
```
