import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, BarChart3, Sparkles, ArrowRight, Target, Globe2, Truck, FileText, Landmark, Trophy, ChevronRight, Zap, TrendingDown, Leaf } from "lucide-react";

export default function Landing() {
  const pillars = [
    {
      icon: BarChart3,
      title: "Audit Emisi + OCR",
      desc: "Hitung jejak karbon dari listrik, bahan bakar, sampah, dan rantai pasok. Upload struk tagihan — AI baca otomatis.",
    },
    {
      icon: Target,
      title: "8 Rencana Aksi Prioritas",
      desc: "Dapatkan 8 aksi paling berdampak, lengkap dengan estimasi penghematan dan status progress.",
    },
    {
      icon: Globe2,
      title: "Supplier Hijau",
      desc: "Rekomendasi pemasok ramah lingkungan berdasarkan kategori bisnis dan lokasi.",
    },
    {
      icon: FileText,
      title: "Laporan ESG Otomatis",
      desc: "Generate laporan ESG ringkas (E/S/G score + narasi) — siap presentasi investor atau mitra.",
    },
  ];

  const steps = [
    "Isi profil bisnis UMKM",
    "Jalankan audit operasional",
    "Lihat insight AI dan 8 rencana aksi",
    "Pantau progress bulanan dan export ESG report",
    "Simulasi skor GreenLend dan ajukan akses modal",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 text-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Navbar */}
        <header className="flex items-center justify-between mb-14">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Fakhara AI" className="h-14 w-auto" />
          </div>
          <Link href="/dashboard">
            <Button className="bg-green-600 hover:bg-green-700 gap-2">
              Masuk ke Aplikasi
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </header>

        {/* Hero */}
        <section className="grid lg:grid-cols-2 gap-12 items-center mb-14">
          <div>
            <Badge className="mb-3 bg-green-100 text-green-700 hover:bg-green-100 border-0">
              AI for Environmental & Social Impact · Technofest 2026
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-bold leading-tight mb-5">
              Bukan sekadar satu app —{" "}
              <span className="text-green-600">ekosistem hijau</span>{" "}
              untuk UMKM Indonesia.
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-xl leading-relaxed">
              Fakhara AI mengukur dampak lingkungan bisnis kamu, menyusun rencana aksi, dan menghubungkannya ke modal — lewat GreenLend, platform kredit berbasis skor SDG/ESG.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              <Link href="/businesses/new">
                <Button className="bg-green-600 hover:bg-green-700 gap-2">
                  <Sparkles className="w-4 h-4" />
                  Coba Sekarang
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" className="gap-2 bg-white">
                  Lihat Dashboard
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-4 max-w-lg">
              <div className="rounded-2xl bg-white/70 border border-white p-4 shadow-sm">
                <p className="text-2xl font-bold text-green-700">64 jt</p>
                <p className="text-xs text-gray-500">UMKM target di Indonesia</p>
              </div>
              <div className="rounded-2xl bg-white/70 border border-white p-4 shadow-sm">
                <p className="text-2xl font-bold text-green-700">10</p>
                <p className="text-xs text-gray-500">Fitur AI dalam 1 platform</p>
              </div>
              <div className="rounded-2xl bg-white/70 border border-white p-4 shadow-sm">
                <p className="text-2xl font-bold text-green-700">SDGs</p>
                <p className="text-xs text-gray-500">8, 13 & 17 sekaligus</p>
              </div>
            </div>
          </div>

          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Kenapa app ini ada?</h3>
                  <p className="text-sm text-gray-500">UMKM perlu cara sederhana untuk mulai hijau dan dapat modal.</p>
                </div>
              </div>
              <div className="space-y-3">
                {pillars.map((item) => (
                  <div key={item.title} className="flex gap-3 rounded-2xl bg-gray-50 p-4">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Ekosistem Section */}
        <section className="mb-14">
          <div className="text-center mb-8">
            <Badge className="mb-3 bg-teal-100 text-teal-700 border-0">Ekosistem Terintegrasi</Badge>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Satu ekosistem, dua platform</h2>
            <p className="text-gray-500 max-w-xl mx-auto text-sm">Fakhara AI dan GreenLend bekerja bersama — dari audit emisi hingga akses pembiayaan mikro berbasis dampak hijau.</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-4 items-center">
            {/* Fakhara AI Card */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-600 to-emerald-700 text-white">
              <CardContent className="p-6">
                <img src="/logo.png" alt="Fakhara AI" className="h-12 w-auto mb-4 brightness-0 invert" />
                <p className="text-sm text-white/80 mb-4">Platform audit karbon & keberlanjutan berbasis AI untuk UMKM Indonesia.</p>
                <div className="space-y-2 text-sm">
                  {[
                    { icon: BarChart3, text: "Audit emisi & OCR struk" },
                    { icon: Target, text: "8 rencana aksi prioritas" },
                    { icon: Truck, text: "Rekomendasi supplier hijau" },
                    { icon: FileText, text: "Laporan ESG otomatis" },
                    { icon: TrendingDown, text: "Carbon Credit Simulator" },
                    { icon: Zap, text: "Green ROI Calculator" },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-2 text-white/90">
                      <Icon className="w-3.5 h-3.5 text-green-200 flex-shrink-0" />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Arrow */}
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="text-center text-sm text-gray-500 font-medium">Skor ESG/SDG dari Fakhara</div>
              <div className="flex items-center gap-2">
                <div className="h-px w-12 bg-green-400" />
                <ChevronRight className="w-6 h-6 text-green-600" />
                <div className="h-px w-12 bg-teal-400" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 text-center shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Bisnis makin hijau =</p>
                <p className="text-sm font-bold text-teal-700">Skor kredit lebih tinggi</p>
                <p className="text-xs text-gray-400">+ bunga lebih rendah</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-px w-12 bg-teal-400" />
                <ChevronRight className="w-6 h-6 text-teal-600" />
                <div className="h-px w-12 bg-teal-600" />
              </div>
              <div className="text-center text-sm text-gray-500 font-medium">Akses modal ke GreenLend</div>
            </div>

            {/* GreenLend Card */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-teal-600 to-cyan-700 text-white">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-1">
                  <Landmark className="w-6 h-6 text-white" />
                  <span className="text-xl font-bold">GreenLend</span>
                </div>
                <div className="flex items-center gap-1.5 mb-4">
                  <Trophy className="w-3.5 h-3.5 text-yellow-300" />
                  <span className="text-xs text-white/80 font-medium">🥇 Juara 1 — NYU Shanghai Digital Innovation Challenge 2025</span>
                </div>
                <p className="text-sm text-white/80 mb-4">Platform kredit mikro berbasis AI yang menggunakan skor SDG/ESG sebagai faktor kelayakan pinjaman.</p>
                <div className="space-y-2 text-sm">
                  {[
                    "Scoring: 20% Tradisional + 50% Data Alternatif + 30% SDG Hijau",
                    "Pinjaman hingga Rp 50 juta",
                    "Bunga 12–18% (diskon SDG hingga −2%)",
                    "Tanpa riwayat kredit formal",
                    "Dianalisa oleh AI secara real-time",
                  ].map((text) => (
                    <div key={text} className="flex items-start gap-2 text-white/90">
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-200 mt-1.5 flex-shrink-0" />
                      <span className="text-xs leading-relaxed">{text}</span>
                    </div>
                  ))}
                </div>
                <a href="https://greenlend.elpeef.com" target="_blank" rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs text-teal-100 hover:text-white transition-colors">
                  greenlend.elpeef.com <ArrowRight className="w-3 h-3" />
                </a>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How it works + CTA */}
        <section className="grid lg:grid-cols-2 gap-6 mb-6">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Cara pakainya</h3>
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div key={step} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 text-sm font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-sm text-gray-600 pt-1">{step}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">GreenLend — Juara 1, NYU Shanghai 2025</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Platform mitra kami memenangkan Digital Innovation Challenge di NYU Shanghai tahun 2025 dengan konsep kredit berbasis skor SDG. Fakhara AI adalah jembatannya — dari emisi ke modal.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">Siap mulai?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Tambah bisnis pertama kamu. Dashboard langsung terisi dengan audit, rencana aksi, dan skor GreenLend-mu.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/businesses/new">
                    <Button className="bg-green-600 hover:bg-green-700 gap-2">
                      Tambah Bisnis Pertama
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button variant="outline">Buka Dashboard</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Footer tagline */}
        <div className="text-center py-4 text-xs text-gray-400 flex items-center justify-center gap-2">
          <Leaf className="w-3 h-3 text-green-400" />
          Fakhara AI · Intelligent by Design, Elegant by Nature · Technofest 2026
        </div>

      </div>
    </div>
  );
}
