import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Leaf, ShieldCheck, BarChart3, Sparkles, ArrowRight, Target, Globe2, Truck, FileText } from "lucide-react";

export default function Landing() {
  const pillars = [
    {
      icon: BarChart3,
      title: "Audit Emisi",
      desc: "Hitung jejak karbon dari listrik, bahan bakar, sampah, dan rantai pasok.",
    },
    {
      icon: Target,
      title: "Rencana Aksi Prioritas",
      desc: "Dapatkan 8 aksi yang paling berdampak, lengkap dengan status progress.",
    },
    {
      icon: Globe2,
      title: "Supplier Hijau",
      desc: "Cari rekomendasi pemasok yang lebih ramah lingkungan.",
    },
    {
      icon: FileText,
      title: "ESG Report",
      desc: "Generate laporan ESG ringkas untuk presentasi, investor, atau partner.",
    },
  ];

  const steps = [
    "Isi profil bisnis UMKM",
    "Jalankan audit operasional",
    "Lihat insight AI dan 8 rencana aksi",
    "Pantau progress bulanan dan export report",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 text-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-green-600 rounded-2xl flex items-center justify-center shadow-sm">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Fakhara AI</h1>
              <p className="text-sm text-gray-500">Agen keberlanjutan untuk UMKM Indonesia</p>
            </div>
          </div>
          <Link href="/dashboard">
            <Button className="bg-green-600 hover:bg-green-700 gap-2">
              Masuk ke Aplikasi
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </header>

        <section className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <Badge className="mb-4 bg-green-100 text-green-700 hover:bg-green-100 border-0">AI for Environmental & Social Impact</Badge>
            <h2 className="text-4xl sm:text-5xl font-bold leading-tight mb-5">
              Bantu UMKM audit emisi, susun aksi, dan bikin ESG report otomatis.
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-xl leading-relaxed">
              Fakhara AI membantu bisnis kecil memahami dampak operasionalnya, menemukan peluang pengurangan emisi, dan memantau progres keberlanjutan secara transparan.
            </p>
            <div className="flex flex-wrap gap-3">
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
            <div className="mt-8 grid grid-cols-3 gap-4 max-w-lg">
              <div className="rounded-2xl bg-white/70 border border-white p-4 shadow-sm">
                <p className="text-2xl font-bold text-green-700">8</p>
                <p className="text-xs text-gray-500">Rencana aksi prioritas</p>
              </div>
              <div className="rounded-2xl bg-white/70 border border-white p-4 shadow-sm">
                <p className="text-2xl font-bold text-green-700">5</p>
                <p className="text-xs text-gray-500">Tool AI transparan</p>
              </div>
              <div className="rounded-2xl bg-white/70 border border-white p-4 shadow-sm">
                <p className="text-2xl font-bold text-green-700">1</p>
                <p className="text-xs text-gray-500">ESG report instan</p>
              </div>
            </div>
          </div>

          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Kenapa app ini ada?</h3>
                  <p className="text-sm text-gray-500">Biar UMKM punya cara sederhana untuk mulai hijau.</p>
                </div>
              </div>
              <div className="space-y-3">
                {pillars.map((item) => (
                  <div key={item.title} className="flex gap-3 rounded-2xl bg-gray-50 p-4">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
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

          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Siap mulai?</h3>
              <p className="text-sm text-gray-600 mb-5">
                Begitu kamu tambah bisnis pertama, dashboard langsung terisi dengan audit, rencana aksi, progress, dan laporan ESG.
              </p>
              <div className="flex gap-3">
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
        </section>
      </div>
    </div>
  );
}
