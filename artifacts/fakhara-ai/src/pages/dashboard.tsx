import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { getDashboardSummary, listBusinesses } from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, TrendingDown, Factory, CheckCircle2, ArrowRight, BarChart3,
  ShieldCheck, Users, Globe2, Landmark, Leaf, Activity, Lock,
  Building2, ChevronRight, LayoutDashboard, UserCircle,
} from "lucide-react";

type Role = "umkm" | "admin";

const DEMO_UMKM_ID = 1; // bisnis yang "dimiliki" user UMKM demo

export default function Dashboard() {
  const [role, setRole] = useState<Role>(() => {
    try { return (localStorage.getItem("fakhara_role") as Role) ?? "umkm"; }
    catch { return "umkm"; }
  });

  useEffect(() => {
    try { localStorage.setItem("fakhara_role", role); } catch { /* noop */ }
  }, [role]);

  const { data: summary } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => getDashboardSummary(),
  });

  const { data: businesses, isLoading } = useQuery({
    queryKey: ["businesses"],
    queryFn: () => listBusinesses(),
  });

  const myBusinesses = businesses?.filter((b) => b.id === DEMO_UMKM_ID) ?? [];
  const visibleBusinesses = role === "admin" ? (businesses ?? []) : myBusinesses;
  const hasBusinesses = visibleBusinesses.length > 0;

  const RoleSwitcher = () => (
    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
      <button
        onClick={() => setRole("umkm")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          role === "umkm"
            ? "bg-white shadow-sm text-green-700"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <UserCircle className="w-3.5 h-3.5" />
        UMKM
      </button>
      <button
        onClick={() => setRole("admin")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          role === "admin"
            ? "bg-white shadow-sm text-blue-700"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        Admin
      </button>
    </div>
  );

  /* ─── EMPTY STATE ─── */
  if (!isLoading && !hasBusinesses) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="Fakhara AI" className="h-14 w-auto" />
              <RoleSwitcher />
            </div>
            {role === "umkm" && (
              <Link href="/businesses/new">
                <Button className="bg-green-600 hover:bg-green-700 gap-2">
                  <Plus className="w-4 h-4" /> Tambah Bisnis
                </Button>
              </Link>
            )}
          </div>
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <Card className="border-0 shadow-xl bg-white/90 backdrop-blur">
              <CardContent className="p-8">
                <Badge className="mb-4 bg-green-100 text-green-700 hover:bg-green-100 border-0">
                  AI for Environmental & Social Impact
                </Badge>
                <h2 className="text-4xl font-bold leading-tight mb-4 text-gray-900">
                  Audit emisi, susun 8 rencana aksi, lalu pantau progresnya.
                </h2>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Fakhara AI membantu UMKM menghitung jejak karbon, menemukan peluang pengurangan, mencari supplier hijau, dan men-generate ESG report otomatis.
                </p>
                <Link href="/businesses/new">
                  <Button className="bg-green-600 hover:bg-green-700 gap-2">
                    <Plus className="w-4 h-4" /> Mulai Isi Bisnis
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <div className="grid gap-4">
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader className="pb-2"><CardTitle className="text-base">Apa yang app ini lakukan?</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm text-gray-600">
                  <p>• Hitung emisi dari listrik, bahan bakar, sampah, dan supply chain.</p>
                  <p>• Buat 8 rekomendasi aksi yang paling berdampak.</p>
                  <p>• Simpan progress bulanan dan export laporan ESG.</p>
                  <p>• Simulasi skor GreenLend untuk akses modal hijau.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── ADMIN DASHBOARD ─── */
  if (role === "admin") {
    const totalBusinesses = businesses?.length ?? 0;
    const totalEmissions = summary?.totalEmissionsTonnes ?? 0;
    const completedActions = summary?.completedActions ?? 0;
    const totalActions = summary?.totalActions ?? 0;
    const avgReduction = summary?.avgReductionPercent ?? 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Navbar Admin */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="Fakhara AI" className="h-14 w-auto" />
              <RoleSwitcher />
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-blue-100 text-blue-700 border-0 gap-1.5 px-3 py-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin Panel
              </Badge>
              <Link href="/">
                <Button variant="outline" size="sm" className="bg-white gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  Landing
                </Button>
              </Link>
            </div>
          </div>

          {/* Platform Impact Hero */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-700 to-indigo-800 text-white mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <LayoutDashboard className="w-5 h-5 text-blue-200" />
                <h2 className="font-bold text-lg">Platform Impact Overview</h2>
                <Badge className="ml-auto bg-white/20 text-white border-white/30 text-xs">Live</Badge>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Bisnis UMKM", value: totalBusinesses, sub: "terdaftar di platform", icon: Building2, color: "bg-blue-500/30" },
                  { label: "Ton CO₂e Teraudit", value: totalEmissions.toFixed(2), sub: "seluruh platform", icon: BarChart3, color: "bg-orange-500/30" },
                  { label: "Rata-rata Reduksi", value: `${avgReduction}%`, sub: "progress emisi", icon: TrendingDown, color: "bg-green-500/30" },
                  { label: "Aksi Diselesaikan", value: `${completedActions}/${totalActions}`, sub: "rencana aksi aktif", icon: CheckCircle2, color: "bg-purple-500/30" },
                ].map(({ label, value, sub, icon: Icon, color }) => (
                  <div key={label} className="bg-white/10 rounded-2xl p-4">
                    <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center mb-3`}>
                      <Icon className="w-4.5 h-4.5 text-white" />
                    </div>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs text-white/60 mt-0.5">{label}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">{sub}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* SDG Impact + GreenLend stats row */}
          <div className="grid lg:grid-cols-3 gap-4 mb-6">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-green-600 to-emerald-700 text-white">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Leaf className="w-4 h-4 text-green-200" />
                  <span className="text-sm font-semibold">SDG Impact</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">SDG 8 — Pekerjaan Layak</span>
                    <span className="font-bold">{(businesses ?? []).reduce((a, b) => a + (b.employeeCount ?? 0), 0)} pekerja</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">SDG 13 — Aksi Iklim</span>
                    <span className="font-bold">{totalEmissions.toFixed(2)} ton CO₂</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">SDG 17 — Kemitraan</span>
                    <span className="font-bold">+ GreenLend</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-teal-600 to-cyan-700 text-white">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Landmark className="w-4 h-4 text-teal-200" />
                  <span className="text-sm font-semibold">GreenLend Ecosystem</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">Bisnis terskor SDG</span>
                    <span className="font-bold">{totalBusinesses} UMKM</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">Potensi pinjaman</span>
                    <span className="font-bold">Rp {(totalBusinesses * 30).toLocaleString("id-ID")} jt</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">Diskon SDG rata-rata</span>
                    <span className="font-bold">−1.5%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-700">Subscription Tiers</span>
                  <Badge className="ml-auto text-[10px] bg-amber-100 text-amber-700 border-0">Coming soon</Badge>
                </div>
                <div className="space-y-2">
                  {[
                    { tier: "Starter", price: "Gratis", limit: "1 bisnis", color: "bg-gray-100 text-gray-600" },
                    { tier: "UMKM Pro", price: "Rp 99rb/bln", limit: "5 bisnis + ESG PDF", color: "bg-green-100 text-green-700" },
                    { tier: "Enterprise", price: "Custom", limit: "Unlimited + API", color: "bg-blue-100 text-blue-700" },
                  ].map(({ tier, price, limit, color }) => (
                    <div key={tier} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[10px] border-0 ${color}`}>{tier}</Badge>
                        <span className="text-xs text-gray-500">{limit}</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-700">{price}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* All businesses list */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-800">Semua Bisnis UMKM ({totalBusinesses})</h2>
              </div>
              <Link href="/businesses/new">
                <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Tambah
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(businesses ?? []).map((b) => (
                <Link key={b.id} href={`/businesses/${b.id}`}>
                  <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer bg-white group">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                          {b.name}
                        </CardTitle>
                        <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 border-0">
                          {b.sector}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-gray-500 mb-3">{b.location} · {b.employeeCount} karyawan</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">
                          {new Date(b.createdAt).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" })}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    );
  }

  /* ─── UMKM DASHBOARD ─── */
  const myBusiness = myBusinesses[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Navbar UMKM */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="Fakhara AI" className="h-14 w-auto" />
            <RoleSwitcher />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-100">
              <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center">
                <UserCircle className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-gray-800 leading-tight">{myBusiness?.name ?? "UMKM Demo"}</p>
                <p className="text-gray-400 leading-tight">Paket Starter · Gratis</p>
              </div>
            </div>
          </div>
        </div>

        {/* Selamat datang */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Selamat datang 👋
          </h2>
          <p className="text-sm text-gray-500">
            Ini dashboard keberlanjutan bisnis Anda. Pantau emisi, rencana aksi, dan skor GreenLend dari sini.
          </p>
        </div>

        {/* Stats UMKM */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Emisi", value: `${summary.totalEmissionsTonnes.toFixed(2)} ton`, sub: "CO₂e / tahun", icon: BarChart3, color: "bg-orange-100 text-orange-600" },
              { label: "Reduksi Dicapai", value: `${summary.avgReductionPercent}%`, sub: "dari baseline", icon: TrendingDown, color: "bg-green-100 text-green-600" },
              { label: "Aksi Selesai", value: `${summary.completedActions}/${summary.totalActions}`, sub: "rencana aktif", icon: CheckCircle2, color: "bg-purple-100 text-purple-600" },
              { label: "Bisnis Terdaftar", value: `${myBusinesses.length}`, sub: "milik Anda", icon: Factory, color: "bg-blue-100 text-blue-600" },
            ].map(({ label, value, sub, icon: Icon, color }) => (
              <Card key={label} className="border-0 shadow-sm bg-white">
                <CardContent className="pt-5 pb-4">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color.split(" ")[0]}`}>
                    <Icon className={`w-4.5 h-4.5 ${color.split(" ")[1]}`} />
                  </div>
                  <p className="text-xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs font-medium text-gray-700">{label}</p>
                  <p className="text-[10px] text-gray-400">{sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Bisnis saya */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-green-600" />
              Bisnis Saya
            </h3>
            <Link href="/businesses/new">
              <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Tambah
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <Card className="border-0 shadow-sm animate-pulse">
              <CardContent className="pt-6 h-32 bg-gray-100 rounded-xl" />
            </Card>
          ) : myBusiness ? (
            <Link href={`/businesses/${myBusiness.id}`}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer bg-white group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors">{myBusiness.name}</h4>
                      <p className="text-sm text-gray-500">{myBusiness.location} · {myBusiness.employeeCount} karyawan</p>
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-0">{myBusiness.sector}</Badge>
                  </div>
                  {myBusiness.description && (
                    <p className="text-xs text-gray-400 mb-3 line-clamp-2">{myBusiness.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <Activity className="w-3 h-3" /> Buka detail →
                    </span>
                    <div className="flex gap-1">
                      {["Audit", "Aksi", "ESG", "Modal"].map((t) => (
                        <Badge key={t} className="text-[10px] bg-gray-100 text-gray-500 border-0">{t}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ) : null}
        </div>

        {/* Upgrade prompt */}
        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
          <CardContent className="p-5 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">Paket Starter — 1 bisnis aktif</p>
                <p className="text-xs text-gray-500 mt-0.5">Upgrade ke <strong>UMKM Pro</strong> untuk kelola hingga 5 bisnis, export ESG PDF berlogo, dan prioritas analisis AI.</p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="bg-white border-amber-300 text-amber-700 hover:bg-amber-50 flex-shrink-0" disabled>
              Upgrade <span className="ml-1 text-[10px] opacity-60">soon</span>
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
