import { useState, useMemo } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBusiness,
  patchBusiness,
  deleteBusiness,
  createAudit,
  getLatestAudit,
  listAudits,
  generateActionPlan,
  getActionPlan,
  updateActionItem,
  deleteActionItem,
  getSupplierRecommendations,
  getProgressHistory,
  logProgress,
  getEsgReport,
  generateEsgReport,
} from "../lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Leaf, Factory, MapPin, Users, TrendingDown, TrendingUp,
  Zap, Truck, Trash2, Package, CheckCircle2, Clock, PlayCircle,
  RefreshCw, FileText, Sparkles, BarChart3, ShoppingBag, Target,
  AlertTriangle, ChevronDown, ChevronUp, Pencil, X, Download
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LabelList,
} from "recharts";

const EMISSION_COLORS = {
  energyEmissions: "#10b981",
  transportEmissions: "#f59e0b",
  wasteEmissions: "#ef4444",
  supplyChainEmissions: "#8b5cf6",
};

interface ClarifyingQuestion {
  id: string;
  question: string;
  hint: string;
}

type AuditStep = "results" | "form" | "clarifying" | "processing";

function AuditTab({ businessId }: { businessId: number }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [step, setStep] = useState<AuditStep>("results");
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questions, setQuestions] = useState<ClarifyingQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    period: "",
    electricityKwh: "",
    fuelLiters: "",
    wasteKg: "",
    supplyChainSpendIdr: "",
    vehicleCount: "",
    deliveriesPerMonth: "",
  });

  const { data: latestAudit, isLoading } = useQuery({
    queryKey: ["latest-audit", businessId],
    queryFn: () => getLatestAudit(businessId),
    retry: false,
  });

  const { data: auditHistory } = useQuery({
    queryKey: ["audits", businessId],
    queryFn: () => listAudits(businessId),
  });

  const resetForm = () => {
    setForm({ period: "", electricityKwh: "", fuelLiters: "", wasteKg: "", supplyChainSpendIdr: "", vehicleCount: "", deliveriesPerMonth: "" });
    setQuestions([]);
    setAnswers({});
    setStep("results");
  };

  const mutation = useMutation({
    mutationFn: () =>
      createAudit(businessId, {
        period: form.period,
        electricityKwh: Number(form.electricityKwh),
        fuelLiters: Number(form.fuelLiters),
        wasteKg: Number(form.wasteKg),
        supplyChainSpendIdr: form.supplyChainSpendIdr ? Number(form.supplyChainSpendIdr) : undefined,
        vehicleCount: form.vehicleCount ? Number(form.vehicleCount) : undefined,
        deliveriesPerMonth: form.deliveriesPerMonth ? Number(form.deliveriesPerMonth) : undefined,
        answers: questions.map((q) => ({ questionId: q.id, question: q.question, answer: answers[q.id] ?? "" })),
      } as Parameters<typeof createAudit>[1]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["latest-audit", businessId] });
      qc.invalidateQueries({ queryKey: ["audits", businessId] });
      qc.invalidateQueries({ queryKey: ["business", businessId] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      resetForm();
      toast({ title: "Audit berhasil disimpan!", description: "Insight AI telah dihasilkan berdasarkan data Anda." });
    },
    onError: (err) => {
      setStep("clarifying");
      toast({ title: "Gagal menyimpan audit", description: String(err), variant: "destructive" });
    },
  });

  const handleFormNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingQuestions(true);
    setStep("clarifying");
    try {
      const res = await fetch(`/api/businesses/${businessId}/audits/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          electricityKwh: Number(form.electricityKwh),
          fuelLiters: Number(form.fuelLiters),
          wasteKg: Number(form.wasteKg),
        }),
      });
      const data = await res.json() as { questions: ClarifyingQuestion[] };
      setQuestions(data.questions ?? []);
    } catch {
      toast({ title: "Tidak dapat memuat pertanyaan AI", description: "Lanjutkan tanpa pertanyaan klarifikasi", variant: "destructive" });
      setQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleSubmitAudit = () => {
    setStep("processing");
    mutation.mutate();
  };

  const showForm = step === "form";
  const showClarifying = step === "clarifying";
  const showProcessing = step === "processing";

  const pieData = latestAudit
    ? [
        { name: "Energi", value: latestAudit.energyEmissions, color: EMISSION_COLORS.energyEmissions },
        { name: "Transportasi", value: latestAudit.transportEmissions, color: EMISSION_COLORS.transportEmissions },
        { name: "Sampah", value: latestAudit.wasteEmissions, color: EMISSION_COLORS.wasteEmissions },
        { name: "Rantai Pasok", value: latestAudit.supplyChainEmissions, color: EMISSION_COLORS.supplyChainEmissions },
      ]
    : [];

  return (
    <div className="space-y-6">
      {!isLoading && !latestAudit && step === "results" && (
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-orange-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Belum Ada Data Audit</h3>
            <p className="text-sm text-gray-400 mb-4">Input data operasional Anda untuk menghitung jejak karbon</p>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => setStep("form")}>
              Mulai Audit Karbon
            </Button>
          </CardContent>
        </Card>
      )}

      {latestAudit && step === "results" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-green-500 to-emerald-600 text-white">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs font-medium opacity-80">Total Emisi</p>
                <p className="text-2xl font-bold mt-1">{latestAudit.totalEmissions.toFixed(2)}</p>
                <p className="text-xs opacity-70">ton CO₂e/tahun</p>
              </CardContent>
            </Card>
            {[
              { icon: Zap, label: "Energi", value: latestAudit.energyEmissions, color: "text-green-600", bg: "bg-green-50" },
              { icon: Truck, label: "Transport", value: latestAudit.transportEmissions, color: "text-yellow-600", bg: "bg-yellow-50" },
              { icon: Trash2, label: "Sampah", value: latestAudit.wasteEmissions, color: "text-red-600", bg: "bg-red-50" },
            ].map(({ icon: Icon, label, value, color, bg }) => (
              <Card key={label} className="border-0 shadow-sm bg-white">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-7 h-7 ${bg} rounded-md flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <p className="text-xs text-gray-500">{label}</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{value.toFixed(3)}</p>
                  <p className="text-xs text-gray-400">ton CO₂e</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700">Distribusi Emisi</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend iconType="circle" iconSize={8} />
                    <Tooltip formatter={(v: number) => [`${v.toFixed(3)} ton`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {auditHistory && auditHistory.length > 1 && (
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-700">Tren Emisi</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={[...auditHistory].reverse().map((a) => ({ period: a.period, emisi: Number(a.totalEmissions) }))}>
                      <defs>
                        <linearGradient id="colorEmisi" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
                      <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => [`${v.toFixed(3)} ton`, "Emisi"]} />
                      <Area type="monotone" dataKey="emisi" stroke="#10b981" fill="url(#colorEmisi)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {latestAudit.aiInsights && (
            <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-green-600" />
                  <CardTitle className="text-sm font-semibold text-green-800">Insight AI</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{latestAudit.aiInsights}</p>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <Button variant="outline" className="gap-2" onClick={() => setStep("form")}>
              <RefreshCw className="w-4 h-4" />
              Audit Baru
            </Button>
          </div>
        </>
      )}

      {showForm && (
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Langkah 1/2 — Data Operasional</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Masukkan data bulanan bisnis Anda</p>
              </div>
              <div className="flex gap-1.5">
                <span className="w-6 h-1.5 bg-green-500 rounded-full" />
                <span className="w-6 h-1.5 bg-gray-200 rounded-full" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFormNext} className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-gray-700">Periode Audit</Label>
                <Input placeholder="Contoh: 2024-Annual atau 2024-Q1" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} className="mt-1" required />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-medium text-gray-700 flex items-center gap-1"><Zap className="w-3 h-3 text-green-600" /> Listrik (kWh/bulan)</Label>
                  <Input type="number" min="0" placeholder="500" value={form.electricityKwh} onChange={(e) => setForm({ ...form, electricityKwh: e.target.value })} className="mt-1" required />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700 flex items-center gap-1"><Truck className="w-3 h-3 text-yellow-600" /> Bahan Bakar (liter/bln)</Label>
                  <Input type="number" min="0" placeholder="100" value={form.fuelLiters} onChange={(e) => setForm({ ...form, fuelLiters: e.target.value })} className="mt-1" required />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700 flex items-center gap-1"><Trash2 className="w-3 h-3 text-red-600" /> Sampah (kg/bulan)</Label>
                  <Input type="number" min="0" placeholder="50" value={form.wasteKg} onChange={(e) => setForm({ ...form, wasteKg: e.target.value })} className="mt-1" required />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700 flex items-center gap-1"><Package className="w-3 h-3 text-purple-600" /> Belanja Rantai Pasok (IDR)</Label>
                  <Input type="number" min="0" placeholder="5000000" value={form.supplyChainSpendIdr} onChange={(e) => setForm({ ...form, supplyChainSpendIdr: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700">Jumlah Kendaraan</Label>
                  <Input type="number" min="0" placeholder="2" value={form.vehicleCount} onChange={(e) => setForm({ ...form, vehicleCount: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700">Pengiriman/Bulan</Label>
                  <Input type="number" min="0" placeholder="30" value={form.deliveriesPerMonth} onChange={(e) => setForm({ ...form, deliveriesPerMonth: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={loadingQuestions} className="bg-green-600 hover:bg-green-700 gap-2">
                  {loadingQuestions ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {loadingQuestions ? "Agen AI Menyiapkan Pertanyaan..." : "Lanjut ke Pertanyaan AI"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>Batal</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showClarifying && (
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Langkah 2/2 — Pertanyaan Klarifikasi AI</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Agen AI membutuhkan konteks lebih dalam untuk memberikan insight yang tepat</p>
              </div>
              <div className="flex gap-1.5">
                <span className="w-6 h-1.5 bg-green-500 rounded-full" />
                <span className="w-6 h-1.5 bg-green-500 rounded-full" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingQuestions ? (
              <div className="py-10 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6 text-green-600 animate-pulse" />
                </div>
                <p className="text-sm text-gray-500">Agen AI sedang menyusun pertanyaan klarifikasi...</p>
              </div>
            ) : (
              <div className="space-y-5">
                {questions.map((q, idx) => (
                  <div key={q.id} className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-800">
                      <span className="inline-flex items-center justify-center w-5 h-5 bg-green-100 text-green-700 text-xs font-bold rounded-full mr-2">{idx + 1}</span>
                      {q.question}
                    </Label>
                    <Input
                      placeholder={q.hint}
                      value={answers[q.id] ?? ""}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                ))}
                <div className="flex gap-3 pt-3 border-t border-gray-100">
                  <Button onClick={handleSubmitAudit} className="bg-green-600 hover:bg-green-700 gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Mulai Analisis AI
                  </Button>
                  <Button variant="outline" onClick={() => setStep("form")}>Kembali</Button>
                  <Button variant="ghost" onClick={resetForm} className="ml-auto text-gray-400">Batal</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showProcessing && (
        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="py-14 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Sparkles className="w-8 h-8 text-green-600 animate-pulse" />
            </div>
            <h3 className="text-base font-semibold text-green-800 mb-2">Agen AI Sedang Menganalisis...</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">Menghitung jejak karbon, menelaah data operasional, dan menghasilkan insight berbasis konteks bisnis Anda</p>
            <div className="flex items-center justify-center gap-2 text-xs text-green-600">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Mengkalkulasi emisi &amp; merumuskan rekomendasi...
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ActionPlanTab({ businessId }: { businessId: number }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);

  const { data: plan, isLoading } = useQuery({
    queryKey: ["action-plan", businessId],
    queryFn: () => getActionPlan(businessId),
    retry: false,
  });

  const generateMutation = useMutation({
    mutationFn: () => generateActionPlan(businessId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["action-plan", businessId] });
      toast({ title: "Rencana aksi berhasil dibuat!", description: "AI telah menganalisis data audit Anda" });
    },
    onError: (err) => {
      toast({ title: "Gagal membuat rencana aksi", description: String(err), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ itemId, status }: { itemId: number; status: string }) =>
      updateActionItem(businessId, itemId, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["action-plan", businessId] });
      qc.invalidateQueries({ queryKey: ["business", businessId] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: number) => deleteActionItem(businessId, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["action-plan", businessId] });
      qc.invalidateQueries({ queryKey: ["business", businessId] });
      setDeletingItemId(null);
      toast({ title: "Item berhasil dihapus" });
    },
    onError: (err) => {
      toast({ title: "Gagal menghapus item", description: String(err), variant: "destructive" });
    },
  });

  const priorityBadge = {
    quick_win: { label: "Quick Win", className: "bg-green-100 text-green-700" },
    medium_term: { label: "Jangka Menengah", className: "bg-blue-100 text-blue-700" },
    long_term: { label: "Jangka Panjang", className: "bg-purple-100 text-purple-700" },
  };

  const categoryIcon = {
    energi: <Zap className="w-4 h-4 text-green-600" />,
    transportasi: <Truck className="w-4 h-4 text-yellow-600" />,
    sampah: <Trash2 className="w-4 h-4 text-red-600" />,
    supply_chain: <Package className="w-4 h-4 text-purple-600" />,
  };

  const statusConfig = {
    pending: { icon: <Clock className="w-3 h-3" />, label: "Belum Dimulai", className: "bg-gray-100 text-gray-600" },
    in_progress: { icon: <PlayCircle className="w-3 h-3" />, label: "Sedang Dikerjakan", className: "bg-blue-100 text-blue-600" },
    completed: { icon: <CheckCircle2 className="w-3 h-3" />, label: "Selesai", className: "bg-green-100 text-green-600" },
  };

  if (isLoading) return <div className="py-8 text-center text-gray-400">Memuat rencana aksi...</div>;

  if (!plan) {
    return (
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Belum Ada Rencana Aksi</h3>
          <p className="text-sm text-gray-400 mb-4">AI akan membuat rencana prioritas pengurangan karbon berdasarkan audit terbaru</p>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            {generateMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generateMutation.isPending ? "AI Sedang Membuat Rencana..." : "Generate Rencana Aksi AI"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const completed = plan.items.filter((i) => i.status === "completed").length;
  const total = plan.items.length;

  return (
    <div className="space-y-5">
      <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-800">Ringkasan Rencana AI</span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{plan.summary}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-bold text-blue-700">{Number(plan.totalPotentialReduction).toFixed(2)}</p>
              <p className="text-xs text-blue-600">ton CO₂e bisa dikurangi</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Progress Implementasi</span>
              <span>{completed}/{total} selesai</span>
            </div>
            <Progress value={(completed / Math.max(total, 1)) * 100} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {plan.items.map((item) => {
          const priority = priorityBadge[item.priority as keyof typeof priorityBadge];
          const catIcon = categoryIcon[item.category as keyof typeof categoryIcon];
          const status = statusConfig[item.status as keyof typeof statusConfig];

          return (
            <Card key={item.id} className={`border-0 shadow-sm bg-white transition-all ${item.status === "completed" ? "opacity-60" : ""}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    {catIcon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className={`text-sm font-semibold ${item.status === "completed" ? "line-through text-gray-400" : "text-gray-900"}`}>
                        {item.title}
                      </h4>
                      {priority && <Badge className={`text-xs ${priority.className} border-0 font-normal`}>{priority.label}</Badge>}
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{item.description}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                      <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3 text-green-500" />−{Number(item.estimatedReduction).toFixed(3)} ton CO₂e</span>
                      {item.estimatedCostIdr && <span>Rp {Number(item.estimatedCostIdr).toLocaleString("id-ID")}</span>}
                    </div>
                    <details className="group">
                      <summary className="text-xs text-blue-500 cursor-pointer list-none flex items-center gap-1">
                        <span>Penjelasan AI</span>
                        <ChevronDown className="w-3 h-3 group-open:hidden" />
                        <ChevronUp className="w-3 h-3 hidden group-open:block" />
                      </summary>
                      <p className="text-xs text-gray-500 mt-1 pl-0">{item.reasoning}</p>
                    </details>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {status && (
                      <Badge className={`text-xs ${status.className} border-0 flex items-center gap-1`}>
                        {status.icon}{status.label}
                      </Badge>
                    )}
                    <div className="flex gap-1 mt-1">
                      {item.status === "pending" && (
                        <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => updateMutation.mutate({ itemId: item.id, status: "in_progress" })}>
                          Mulai
                        </Button>
                      )}
                      {item.status === "in_progress" && (
                        <Button size="sm" className="h-6 text-xs px-2 bg-green-600 hover:bg-green-700" onClick={() => updateMutation.mutate({ itemId: item.id, status: "completed" })}>
                          Selesai
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-gray-300 hover:text-red-500"
                        onClick={() => setDeletingItemId(item.id)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button variant="outline" className="gap-2" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
        {generateMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        Regenerate Rencana AI
      </Button>

      <AlertDialog open={deletingItemId !== null} onOpenChange={(open) => { if (!open) setDeletingItemId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Item Rencana Aksi?</AlertDialogTitle>
            <AlertDialogDescription>
              Item ini akan dihapus permanen dan tidak dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => { if (deletingItemId !== null) deleteItemMutation.mutate(deletingItemId); }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SuppliersTab({ businessId }: { businessId: number }) {
  const { data: suppliers, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["suppliers", businessId],
    queryFn: () => getSupplierRecommendations(businessId),
    retry: false,
  });

  const categoryColors: Record<string, string> = {
    energi: "bg-green-100 text-green-700",
    bahan_baku: "bg-yellow-100 text-yellow-700",
    packaging: "bg-blue-100 text-blue-700",
    logistik: "bg-purple-100 text-purple-700",
  };

  if (isLoading || isFetching) {
    return (
      <div className="py-12 text-center">
        <RefreshCw className="w-8 h-8 text-green-500 animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">AI sedang mencari pemasok hijau terbaik...</p>
      </div>
    );
  }

  if (!suppliers || suppliers.length === 0) {
    return (
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="py-12 text-center">
          <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400 mb-4">Lakukan audit terlebih dahulu untuk mendapatkan rekomendasi pemasok</p>
          <Button variant="outline" className="gap-2" onClick={() => refetch()}>
            <Sparkles className="w-4 h-4" />
            Cari Pemasok Hijau
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {suppliers.map((s) => (
          <Card key={s.id} className="border-0 shadow-sm bg-white hover:shadow-md transition-all">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="text-sm font-semibold text-gray-900">{s.name}</h4>
                <Badge className={`text-xs border-0 flex-shrink-0 ${categoryColors[s.category] ?? "bg-gray-100 text-gray-700"}`}>
                  {s.category.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mb-2">{s.description}</p>
              <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.location}</span>
                {s.greenCertification && <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" />{s.greenCertification}</span>}
              </div>
              <div className="flex items-center gap-1 text-xs text-green-600 mb-2">
                <TrendingDown className="w-3 h-3" />
                <span>Estimasi reduksi: {Number(s.estimatedEmissionReduction).toFixed(3)} ton CO₂e</span>
              </div>
              <p className="text-xs text-gray-400 italic">{s.reasoning}</p>
              {s.website && (
                <a href={s.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-1 block">
                  {s.website}
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function exportProgressCsv(records: { month: string; actualEmissions: number; baselineEmissions: number; reductionPercent: number; notes?: string | null }[], businessName?: string) {
  const header = ["Bulan", "Emisi Aktual (ton CO\u2082e)", "Baseline (ton CO\u2082e)", "Reduksi (%)", "Catatan"];
  const rows = records.map((r) => [
    r.month,
    Number(r.actualEmissions).toFixed(3),
    Number(r.baselineEmissions).toFixed(3),
    Number(r.reductionPercent).toFixed(2),
    r.notes ?? "",
  ]);
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = businessName ? businessName.replace(/[/\\:*?"<>|]/g, "").replace(/\s+/g, "_").replace(/_{2,}/g, "_").replace(/^_|_$/g, "") : "";
  a.download = `${safeName ? safeName + "_" : ""}progress_emisi.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ProgressTab({ businessId, businessName }: { businessId: number; businessName?: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ month: "", actualEmissions: "", baselineEmissions: "", notes: "" });

  const { data: progress } = useQuery({
    queryKey: ["progress", businessId],
    queryFn: () => getProgressHistory(businessId),
  });

  const mutation = useMutation({
    mutationFn: () =>
      logProgress(
        businessId,
        {
          month: form.month,
          actualEmissions: Number(form.actualEmissions),
          baselineEmissions: Number(form.baselineEmissions),
          notes: form.notes || undefined,
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["progress", businessId] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setShowForm(false);
      setForm({ month: "", actualEmissions: "", baselineEmissions: "", notes: "" });
      toast({ title: "Progress berhasil dicatat!" });
    },
    onError: (err) => toast({ title: "Gagal mencatat progress", description: String(err), variant: "destructive" }),
  });

  const summary = useMemo(() => {
    if (!progress || progress.length === 0) return null;
    const totalSaved = progress.reduce((sum, p) => sum + (Number(p.baselineEmissions) - Number(p.actualEmissions)), 0);
    const avgReduction = progress.reduce((sum, p) => sum + Number(p.reductionPercent), 0) / progress.length;
    const bestRecord = progress.reduce((best, p) => Number(p.reductionPercent) > Number(best.reductionPercent) ? p : best, progress[0]);
    return { totalSaved, avgReduction, bestMonth: bestRecord.month, bestReduction: Number(bestRecord.reductionPercent) };
  }, [progress]);

  return (
    <div className="space-y-5">
      {summary && (
        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-green-600" />
              Ringkasan Pencapaian
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Total CO₂e Dihemat</p>
                <p className={`text-lg font-bold ${summary.totalSaved >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {summary.totalSaved >= 0 ? "+" : ""}{summary.totalSaved.toFixed(3)}
                </p>
                <p className="text-xs text-gray-400">ton CO₂e</p>
              </div>
              <div className="text-center border-x border-green-100">
                <p className="text-xs text-gray-500 mb-1">Bulan Terbaik</p>
                <p className="text-sm font-bold text-emerald-700">{summary.bestMonth}</p>
                <p className="text-xs text-green-600 font-medium">↓ {summary.bestReduction.toFixed(1)}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Rata-rata Reduksi</p>
                <p className={`text-lg font-bold ${summary.avgReduction >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {summary.avgReduction >= 0 ? "+" : ""}{summary.avgReduction.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400">per bulan</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {progress && progress.length > 0 && (
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Tren Pengurangan Emisi Bulanan</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart
                data={progress.map((p) => ({
                  month: p.month,
                  aktual: Number(p.actualEmissions),
                  baseline: Number(p.baselineEmissions),
                  reduksi: Number(p.reductionPercent),
                }))}
                margin={{ top: 28, right: 16, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradBaseline" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0]?.payload;
                    const isReduction = d.reduksi > 0;
                    const isNeutral = d.reduksi === 0;
                    return (
                      <div className="bg-white border border-gray-100 rounded-lg shadow-md px-3 py-2 text-xs space-y-1">
                        <p className="font-semibold text-gray-700">{d.month}</p>
                        <p className="text-gray-500">Baseline: <span className="font-medium text-gray-700">{d.baseline.toFixed(3)} ton</span></p>
                        <p className="text-gray-500">Aktual: <span className="font-medium text-green-700">{d.aktual.toFixed(3)} ton</span></p>
                        <p className={isNeutral ? "text-gray-500 font-semibold" : isReduction ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>
                          {isNeutral ? "→ Tidak ada perubahan" : isReduction ? `↓ Reduksi ${d.reduksi.toFixed(1)}%` : `↑ Kenaikan ${Math.abs(d.reduksi).toFixed(1)}%`}
                        </p>
                      </div>
                    );
                  }}
                />
                <Area type="monotone" dataKey="baseline" stroke="#94a3b8" fill="url(#gradBaseline)" strokeWidth={1} strokeDasharray="4 4" />
                <Area type="monotone" dataKey="aktual" stroke="#10b981" fill="url(#gradActual)" strokeWidth={2} dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }}>
                  <LabelList
                    dataKey="reduksi"
                    position="top"
                    content={({ x, y, value }: { x?: number | string; y?: number | string; value?: number | string }) => {
                      if (value === undefined || value === null) return null;
                      const num = Number(value);
                      const arrow = num > 0 ? "↓" : num < 0 ? "↑" : "→";
                      const label = `${arrow}${Math.abs(num).toFixed(1)}%`;
                      const color = num > 0 ? "#059669" : num < 0 ? "#dc2626" : "#6b7280";
                      return (
                        <text
                          x={Number(x)}
                          y={Number(y) - 8}
                          fill={color}
                          fontSize={9}
                          fontWeight={600}
                          textAnchor="middle"
                        >
                          {label}
                        </text>
                      );
                    }}
                  />
                </Area>
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-700">Riwayat Progress</h3>
        <div className="flex gap-2">
          {progress && progress.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2 text-green-700 border-green-200 hover:bg-green-50"
              onClick={() => exportProgressCsv(progress, businessName)}
            >
              <Download className="w-3 h-3" />
              Export CSV
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowForm(!showForm)}>
            <Clock className="w-3 h-3" />
            Catat Progress
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="pt-4">
            <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Bulan (YYYY-MM)</Label>
                  <Input placeholder="2024-03" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} className="mt-1 h-8 text-sm" required />
                </div>
                <div>
                  <Label className="text-xs">Emisi Aktual (ton CO₂e)</Label>
                  <Input type="number" step="0.001" placeholder="0.450" value={form.actualEmissions} onChange={(e) => setForm({ ...form, actualEmissions: e.target.value })} className="mt-1 h-8 text-sm" required />
                </div>
                <div>
                  <Label className="text-xs">Baseline (ton CO₂e)</Label>
                  <Input type="number" step="0.001" placeholder="0.600" value={form.baselineEmissions} onChange={(e) => setForm({ ...form, baselineEmissions: e.target.value })} className="mt-1 h-8 text-sm" required />
                </div>
                <div>
                  <Label className="text-xs">Catatan</Label>
                  <Input placeholder="Opsional" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1 h-8 text-sm" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={mutation.isPending} size="sm" className="bg-green-600 hover:bg-green-700">
                  {mutation.isPending ? "Menyimpan..." : "Simpan"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Batal</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {progress && progress.length > 0 ? (
        <div className="space-y-2">
          {[...progress].reverse().map((p) => (
            <Card key={p.id} className="border-0 shadow-sm bg-white">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-800">{p.month}</span>
                    {p.notes && <p className="text-xs text-gray-400 mt-0.5">{p.notes}</p>}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-xs text-gray-400">{Number(p.actualEmissions).toFixed(3)} ton</span>
                      <Badge className={`text-xs border-0 ${Number(p.reductionPercent) > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {Number(p.reductionPercent) > 0 ? <TrendingDown className="w-3 h-3 inline mr-1" /> : <TrendingUp className="w-3 h-3 inline mr-1" />}
                        {Math.abs(Number(p.reductionPercent)).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !showForm ? (
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-gray-400">Belum ada data progress. Catat progress bulanan Anda.</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function EsgReportTab({ businessId }: { businessId: number }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: report, isLoading } = useQuery({
    queryKey: ["esg-report", businessId],
    queryFn: () => getEsgReport(businessId),
    retry: false,
  });

  const generateMutation = useMutation({
    mutationFn: () => generateEsgReport(businessId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["esg-report", businessId] });
      toast({ title: "Laporan ESG berhasil dibuat!" });
    },
    onError: (err) => {
      toast({ title: "Gagal membuat laporan ESG", description: String(err), variant: "destructive" });
    },
  });

  if (isLoading) return <div className="py-8 text-center text-gray-400">Memuat laporan ESG...</div>;

  if (!report) {
    return (
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="py-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Belum Ada Laporan ESG</h3>
          <p className="text-sm text-gray-400 mb-4">AI akan menghasilkan laporan ESG komprehensif berdasarkan data bisnis Anda</p>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="bg-green-600 hover:bg-green-700 gap-2"
          >
            {generateMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generateMutation.isPending ? "AI Sedang Membuat Laporan..." : "Generate Laporan ESG AI"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const scoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Skor E", value: report.environmentalScore, bg: "from-green-500 to-emerald-600" },
          { label: "Skor S", value: report.socialScore, bg: "from-blue-500 to-blue-600" },
          { label: "Skor G", value: report.governanceScore, bg: "from-purple-500 to-purple-600" },
          { label: "Skor ESG", value: report.overallScore, bg: "from-gray-700 to-gray-800" },
        ].map(({ label, value, bg }) => (
          <Card key={label} className={`border-0 shadow-sm bg-gradient-to-br ${bg} text-white`}>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-3xl font-bold">{value}</p>
              <p className="text-xs opacity-80 mt-1">{label}</p>
              <Progress value={value} className="mt-2 h-1 bg-white/20" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-green-600" />
            <CardTitle className="text-sm font-semibold text-green-800">Ringkasan Eksekutif</CardTitle>
            <Badge className="ml-auto bg-green-100 text-green-700 border-0 text-xs">{report.period}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{report.executiveSummary}</p>
        </CardContent>
      </Card>

      {[
        { title: "E — Lingkungan", content: report.environmentalSection, icon: Leaf, color: "text-green-600", bg: "bg-green-50" },
        { title: "S — Sosial", content: report.socialSection, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
        { title: "G — Tata Kelola", content: report.governanceSection, icon: CheckCircle2, color: "text-purple-600", bg: "bg-purple-50" },
        { title: "Rekomendasi Strategis", content: report.recommendations, icon: Target, color: "text-orange-600", bg: "bg-orange-50" },
      ].map(({ title, content, icon: Icon, color, bg }) => (
        <Card key={title} className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <CardTitle className="text-sm font-semibold text-gray-800">{title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{content}</p>
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" className="gap-2" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
        {generateMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        Regenerate Laporan ESG
      </Button>
    </div>
  );
}

export default function BusinessDetail() {
  const { id } = useParams<{ id: string }>();
  const businessId = Number(id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", sector: "", location: "", employeeCount: "", description: "" });

  const { data: business, isLoading } = useQuery({
    queryKey: ["business", businessId],
    queryFn: () => getBusiness(businessId),
  });

  const editMutation = useMutation({
    mutationFn: () =>
      patchBusiness(businessId, {
        name: editForm.name,
        sector: editForm.sector,
        location: editForm.location,
        employeeCount: Number(editForm.employeeCount),
        description: editForm.description || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business", businessId] });
      qc.invalidateQueries({ queryKey: ["businesses"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setShowEditDialog(false);
      toast({ title: "Bisnis berhasil diperbarui!" });
    },
    onError: (err) => {
      toast({ title: "Gagal memperbarui bisnis", description: String(err), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteBusiness(businessId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["businesses"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast({ title: "Bisnis berhasil dihapus" });
      navigate("/");
    },
    onError: (err) => {
      toast({ title: "Gagal menghapus bisnis", description: String(err), variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <Leaf className="w-10 h-10 text-green-500 animate-pulse mx-auto mb-3" />
          <p className="text-gray-500">Memuat data bisnis...</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-gray-600">Bisnis tidak ditemukan</p>
          <Link href="/">
            <Button className="mt-4" variant="outline">Kembali ke Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">Fakhara AI</span>
        </div>

        <Link href="/">
          <Button variant="ghost" className="mb-4 gap-2 text-gray-600 -ml-2">
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Button>
        </Link>

        <Card className="border-0 shadow-sm bg-white mb-6">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Factory className="w-5 h-5 text-gray-400" />
                  <h1 className="text-xl font-bold text-gray-900">{business.name}</h1>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                  <Badge className="bg-green-100 text-green-700 border-0">{business.sector}</Badge>
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{business.location}</span>
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{business.employeeCount} karyawan</span>
                </div>
                {business.description && <p className="text-sm text-gray-400 mt-2">{business.description}</p>}
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-7 text-xs"
                    onClick={() => {
                      setEditForm({
                        name: business.name,
                        sector: business.sector,
                        location: business.location,
                        employeeCount: String(business.employeeCount),
                        description: business.description ?? "",
                      });
                      setShowEditDialog(true);
                    }}
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="w-3 h-3" />
                    Hapus Bisnis
                  </Button>
                </div>
              </div>
              {business.latestTotalEmissions !== null && business.latestTotalEmissions !== undefined && (
                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-bold text-green-700">{Number(business.latestTotalEmissions).toFixed(2)}</p>
                  <p className="text-xs text-gray-400">ton CO₂e</p>
                  {business.emissionsTrend !== null && business.emissionsTrend !== undefined && (
                    <div className={`flex items-center gap-1 justify-end mt-1 ${Number(business.emissionsTrend) < 0 ? "text-green-500" : "text-red-400"}`}>
                      {Number(business.emissionsTrend) < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                      <span className="text-xs">{Math.abs(Number(business.emissionsTrend)).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {business.actionItemsTotal > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Rencana Aksi</span>
                  <span>{business.actionItemsCompleted}/{business.actionItemsTotal} selesai</span>
                </div>
                <Progress value={(business.actionItemsCompleted / business.actionItemsTotal) * 100} className="h-1.5" />
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Profil Bisnis</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => { e.preventDefault(); editMutation.mutate(); }}
              className="space-y-4 pt-1"
            >
              <div>
                <Label className="text-xs font-medium text-gray-700">Nama Bisnis</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="mt-1" required />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-700">Sektor</Label>
                <Input value={editForm.sector} onChange={(e) => setEditForm({ ...editForm, sector: e.target.value })} className="mt-1" required placeholder="kuliner, fashion, retail, manufaktur, jasa..." />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-700">Lokasi</Label>
                <Input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="mt-1" required />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-700">Jumlah Karyawan</Label>
                <Input type="number" min="1" value={editForm.employeeCount} onChange={(e) => setEditForm({ ...editForm, employeeCount: e.target.value })} className="mt-1" required />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-700">Deskripsi (opsional)</Label>
                <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="mt-1" rows={3} />
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>Batal</Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={editMutation.isPending}>
                  {editMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                  Simpan
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Bisnis "{business.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                Semua data bisnis ini termasuk audit, rencana aksi, dan laporan akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => deleteMutation.mutate()}
              >
                {deleteMutation.isPending ? "Menghapus..." : "Hapus Permanen"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Tabs defaultValue="audit">
          <TabsList className="bg-white border-0 shadow-sm mb-5 w-full justify-start overflow-x-auto">
            <TabsTrigger value="audit" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" />Audit Karbon</TabsTrigger>
            <TabsTrigger value="action-plan" className="gap-1.5"><Target className="w-3.5 h-3.5" />Rencana Aksi</TabsTrigger>
            <TabsTrigger value="suppliers" className="gap-1.5"><ShoppingBag className="w-3.5 h-3.5" />Pemasok Hijau</TabsTrigger>
            <TabsTrigger value="progress" className="gap-1.5"><TrendingDown className="w-3.5 h-3.5" />Progress</TabsTrigger>
            <TabsTrigger value="esg" className="gap-1.5"><FileText className="w-3.5 h-3.5" />Laporan ESG</TabsTrigger>
          </TabsList>

          <TabsContent value="audit"><AuditTab businessId={businessId} /></TabsContent>
          <TabsContent value="action-plan"><ActionPlanTab businessId={businessId} /></TabsContent>
          <TabsContent value="suppliers"><SuppliersTab businessId={businessId} /></TabsContent>
          <TabsContent value="progress"><ProgressTab businessId={businessId} businessName={business?.name} /></TabsContent>
          <TabsContent value="esg"><EsgReportTab businessId={businessId} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
