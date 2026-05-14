import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  getDashboardSummary,
  listBusinesses,
} from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Leaf, TrendingDown, Factory, CheckCircle2, ArrowRight, BarChart3 } from "lucide-react";

export default function Dashboard() {
  const { data: summary } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => getDashboardSummary(),
  });

  const { data: businesses, isLoading } = useQuery({
    queryKey: ["businesses"],
    queryFn: () => listBusinesses(),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
                <Leaf className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Fakhara AI</h1>
            </div>
            <p className="text-gray-500 ml-13 pl-1">Agen Keberlanjutan untuk UMKM Indonesia</p>
          </div>
          <Link href="/businesses/new">
            <Button className="bg-green-600 hover:bg-green-700 gap-2">
              <Plus className="w-4 h-4" />
              Tambah Bisnis
            </Button>
          </Link>
        </div>

        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Factory className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{summary.totalBusinesses}</p>
                    <p className="text-xs text-gray-500">Total Bisnis</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{summary.totalEmissionsTonnes.toFixed(1)}</p>
                    <p className="text-xs text-gray-500">Ton CO₂e Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{summary.avgReductionPercent}%</p>
                    <p className="text-xs text-gray-500">Rata-rata Reduksi</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{summary.completedActions}/{summary.totalActions}</p>
                    <p className="text-xs text-gray-500">Aksi Selesai</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Daftar Bisnis UMKM</h2>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-0 shadow-sm animate-pulse">
                  <CardContent className="pt-6 h-32 bg-gray-100 rounded-xl" />
                </Card>
              ))}
            </div>
          ) : businesses && businesses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {businesses.map((b) => (
                <Link key={b.id} href={`/businesses/${b.id}`}>
                  <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer bg-white group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base font-semibold text-gray-900 group-hover:text-green-700 transition-colors">
                          {b.name}
                        </CardTitle>
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-0">
                          {b.sector}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-gray-500 mb-3">{b.location} • {b.employeeCount} karyawan</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          Dibuat {new Date(b.createdAt).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" })}
                        </span>
                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-green-600 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Leaf className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Belum Ada Bisnis</h3>
                <p className="text-gray-400 text-sm mb-4">Mulai perjalanan keberlanjutan UMKM Anda</p>
                <Link href="/businesses/new">
                  <Button className="bg-green-600 hover:bg-green-700 gap-2">
                    <Plus className="w-4 h-4" />
                    Tambah Bisnis Pertama
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
