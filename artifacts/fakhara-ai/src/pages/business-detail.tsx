import { useState, useMemo, useRef, type ReactNode } from "react";
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
  AlertTriangle, ChevronDown, ChevronUp, Pencil, X, Download,
  MessageCircle, Wrench, Send, Bot, Camera, TreePine, Wallet, Award,
  Landmark, Star, CircleDollarSign, ExternalLink, Info,
  ShieldCheck, Lightbulb, BadgeCheck
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
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrNote, setOcrNote] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleOcrUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "File harus berupa gambar", variant: "destructive" });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: "Gambar terlalu besar", description: "Maks 8MB", variant: "destructive" });
      return;
    }
    setOcrLoading(true);
    setOcrNote(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const r = reader.result;
          if (typeof r === "string") {
            resolve(r.split(",")[1] ?? "");
          } else {
            reject(new Error("Failed to read file"));
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      const res = await fetch(`/api/businesses/${businessId}/audits/ocr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Gagal membaca struk");
      }
      const data = await res.json() as {
        electricityKwh?: number; fuelLiters?: number; wasteKg?: number;
        supplyChainSpendIdr?: number; period?: string;
        receiptType: string; confidence: string; notes: string;
      };

      setForm((prev) => ({
        ...prev,
        period: data.period ?? prev.period,
        electricityKwh: data.electricityKwh != null ? String(data.electricityKwh) : prev.electricityKwh,
        fuelLiters: data.fuelLiters != null ? String(data.fuelLiters) : prev.fuelLiters,
        wasteKg: data.wasteKg != null ? String(data.wasteKg) : prev.wasteKg,
        supplyChainSpendIdr: data.supplyChainSpendIdr != null ? String(data.supplyChainSpendIdr) : prev.supplyChainSpendIdr,
      }));

      const filledFields: string[] = [];
      if (data.electricityKwh != null) filledFields.push("listrik");
      if (data.fuelLiters != null) filledFields.push("bahan bakar");
      if (data.wasteKg != null) filledFields.push("sampah");
      if (data.supplyChainSpendIdr != null) filledFields.push("belanja");

      setOcrNote(
        `Jenis struk: ${data.receiptType} • Kepercayaan AI: ${data.confidence}` +
        (filledFields.length > 0 ? ` • Field terisi: ${filledFields.join(", ")}` : "") +
        (data.notes ? `\n${data.notes}` : ""),
      );
      toast({
        title: filledFields.length > 0 ? "Data dari struk berhasil diisi" : "Struk dibaca, tapi tidak ada angka jelas",
        description: filledFields.length > 0
          ? `${filledFields.join(", ")} otomatis diisi. Cek dan koreksi jika perlu.`
          : data.notes,
        variant: filledFields.length > 0 ? "default" : "destructive",
      });
    } catch (err) {
      toast({ title: "Gagal membaca struk", description: String(err), variant: "destructive" });
    } finally {
      setOcrLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
            <div className="mb-4 p-3 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Camera className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">Punya foto struk listrik / nota bensin?</p>
                  <p className="text-xs text-gray-600 mt-0.5">AI akan baca otomatis dan isi form di bawah. Tinggal koreksi kalau perlu.</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleOcrUpload(f);
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2 gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-100 h-8"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={ocrLoading}
                  >
                    {ocrLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                    {ocrLoading ? "AI sedang membaca struk..." : "Upload / Foto Struk"}
                  </Button>
                  {ocrNote && (
                    <p className="text-xs text-purple-700 mt-2 whitespace-pre-line bg-white/60 rounded p-2 border border-purple-100">{ocrNote}</p>
                  )}
                </div>
              </div>
            </div>
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

  const TREES_PER_TON = 22;
  const SAVINGS_PER_TON: Record<string, number> = {
    energi: 1500 * 1500,
    transportasi: 13000 * 430,
    sampah: 500 * 833,
    supply_chain: 3_000_000,
  };
  const formatRp = (n: number) => {
    if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)} M`;
    if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)} jt`;
    if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)} rb`;
    return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
  };
  const computeSavings = (items: typeof plan.items) =>
    items.reduce((acc, it) => {
      const factor = SAVINGS_PER_TON[it.category] ?? 1_500_000;
      return acc + Number(it.estimatedReduction) * factor;
    }, 0);

  const totalReduction = plan.items.reduce(
    (acc, i) => acc + Number(i.estimatedReduction),
    0,
  );
  const totalSavingsAnnual = computeSavings(plan.items);

  const top3 = [...plan.items]
    .filter((i) => i.priority === "quick_win")
    .sort((a, b) => Number(b.estimatedReduction) - Number(a.estimatedReduction))
    .slice(0, 3);
  const fallbackTop3 = top3.length === 3
    ? top3
    : [...plan.items]
        .sort(
          (a, b) => Number(b.estimatedReduction) - Number(a.estimatedReduction),
        )
        .slice(0, 3);
  const top3Reduction = fallbackTop3.reduce(
    (acc, i) => acc + Number(i.estimatedReduction),
    0,
  );
  const top3Trees = Math.round(top3Reduction * TREES_PER_TON);
  const top3SavingsAnnual = computeSavings(fallbackTop3);

  const treeIcons = Math.min(top3Trees, 30);

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

      <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 via-green-50 to-amber-50 border border-emerald-200">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-emerald-700" />
            <span className="text-sm font-semibold text-emerald-900">Simulasi Dampak — Kalau 3 Aksi Prioritas Dijalankan</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 border border-emerald-100">
              <div className="flex items-center gap-2 mb-2">
                <TreePine className="w-4 h-4 text-emerald-600" />
                <p className="text-xs font-medium text-gray-600">Setara Menanam</p>
              </div>
              <p className="text-3xl font-bold text-emerald-700 mb-1">{top3Trees.toLocaleString("id-ID")}</p>
              <p className="text-xs text-gray-500 mb-3">pohon dewasa per tahun</p>
              <div className="flex flex-wrap gap-0.5">
                {Array.from({ length: treeIcons }).map((_, i) => (
                  <TreePine key={i} className="w-3.5 h-3.5 text-emerald-500" />
                ))}
                {top3Trees > 30 && <span className="text-xs text-emerald-700 font-medium ml-1">+{top3Trees - 30}</span>}
              </div>
              <p className="text-[11px] text-gray-400 mt-2">Berdasarkan {top3Reduction.toFixed(2)} ton CO₂e × 22 pohon/ton/tahun (faktor EPA).</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-amber-100">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-amber-600" />
                <p className="text-xs font-medium text-gray-600">Estimasi Penghematan Operasional</p>
              </div>
              <p className="text-3xl font-bold text-amber-700 mb-1">{formatRp(top3SavingsAnnual)}</p>
              <p className="text-xs text-gray-500 mb-3">per tahun • ≈ {formatRp(top3SavingsAnnual / 12)}/bulan</p>
              <div className="space-y-1">
                {fallbackTop3.map((it) => {
                  const factor = SAVINGS_PER_TON[it.category] ?? 1_500_000;
                  const saving = Number(it.estimatedReduction) * factor;
                  return (
                    <div key={it.id} className="flex items-center justify-between text-[11px] text-gray-600">
                      <span className="truncate pr-2">{it.title}</span>
                      <span className="font-medium text-amber-700 flex-shrink-0">{formatRp(saving)}/th</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-gray-400 mt-2">Estimasi tarif: listrik Rp1.500/kWh, BBM Rp13.000/L, sampah Rp500/kg.</p>
            </div>
          </div>
          {plan.items.length > fallbackTop3.length && (
            <div className="mt-4 pt-3 border-t border-emerald-200/60 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900">
              <span>Kalau <strong>semua {plan.items.length} aksi</strong> dijalankan:</span>
              <span className="font-semibold">
                {Math.round(totalReduction * TREES_PER_TON).toLocaleString("id-ID")} pohon · {formatRp(totalSavingsAnnual)}/tahun
              </span>
            </div>
          )}
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

  const handlePrint = () => {
    const logoUrl = `${window.location.origin}/logo.png`;
    const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Laporan ESG — Fakhara AI</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 32px; color: #111; }
  .header { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #16a34a; padding-bottom: 20px; margin-bottom: 28px; }
  .header img { height: 64px; }
  .header-text h1 { margin: 0; font-size: 22px; color: #111; }
  .header-text p { margin: 4px 0 0; font-size: 13px; color: #6b7280; }
  .scores { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .score-card { background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; padding: 14px; text-align: center; }
  .score-card .value { font-size: 32px; font-weight: 700; color: #16a34a; }
  .score-card .label { font-size: 12px; color: #4b5563; margin-top: 4px; }
  .section { margin-bottom: 24px; background: #fafafa; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; }
  .section h2 { margin: 0 0 12px; font-size: 15px; color: #374151; display: flex; align-items: center; gap: 8px; }
  .section p { font-size: 13.5px; color: #4b5563; line-height: 1.8; white-space: pre-line; }
  .footer { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 11px; color: #9ca3af; text-align: center; }
  @media print { body { padding: 16px; } button { display: none; } }
</style></head><body>
<div class="header">
  <img src="${logoUrl}" alt="Fakhara AI" />
  <div class="header-text">
    <h1>Laporan ESG</h1>
    <p>Periode: ${report.period} &nbsp;|&nbsp; Digenerate oleh Fakhara AI</p>
  </div>
</div>
<div class="scores">
  <div class="score-card"><div class="value">${report.environmentalScore}</div><div class="label">Skor Lingkungan (E)</div></div>
  <div class="score-card"><div class="value">${report.socialScore}</div><div class="label">Skor Sosial (S)</div></div>
  <div class="score-card"><div class="value">${report.governanceScore}</div><div class="label">Skor Tata Kelola (G)</div></div>
  <div class="score-card" style="background:#f8fafc;border-color:#94a3b8"><div class="value" style="color:#374151">${report.overallScore}</div><div class="label">Skor ESG Keseluruhan</div></div>
</div>
<div class="section"><h2>📋 Ringkasan Eksekutif</h2><p>${report.executiveSummary}</p></div>
<div class="section"><h2>🌿 E — Lingkungan</h2><p>${report.environmentalSection}</p></div>
<div class="section"><h2>👥 S — Sosial</h2><p>${report.socialSection}</p></div>
<div class="section"><h2>🏛 G — Tata Kelola</h2><p>${report.governanceSection}</p></div>
<div class="section"><h2>💡 Rekomendasi Strategis</h2><p>${report.recommendations}</p></div>
<div class="footer">Laporan ini dihasilkan oleh Fakhara AI &mdash; Intelligent by Design, Elegant by Nature &nbsp;|&nbsp; fakhara.ai</div>
<script>window.onload = function(){ window.print(); }<\/script>
</body></html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
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

      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" className="gap-2" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
          {generateMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Regenerate Laporan ESG
        </Button>
        <Button variant="outline" className="gap-2 text-green-700 border-green-300 hover:bg-green-50" onClick={handlePrint}>
          <Download className="w-4 h-4" />
          Download PDF
        </Button>
      </div>
    </div>
  );
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  trace?: { tool: string; args: unknown; result: unknown }[];
}

function AssistantTab({ businessId }: { businessId: number }) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "Halo! Saya Asisten AI Fakhara. Saya bisa cek audit, hitung ROI investasi hijau, atau cari pemasok ramah lingkungan untuk bisnis Anda. Mau tanya apa?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [openTrace, setOpenTrace] = useState<Record<number, boolean>>({});

  const suggestions = [
    "Bagaimana ringkasan audit terakhir saya?",
    "Hitung ROI kalau saya investasi Rp 50 juta untuk panel surya, hemat Rp 2 juta/bulan",
    "Cari pemasok hijau untuk kategori energi",
    "Bagaimana tren progress saya?",
  ];

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const history = next
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(0, -1)
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));
      const resp = await fetch(`/api/businesses/${businessId}/agent/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = (await resp.json()) as {
        reply: string;
        trace: { tool: string; args: unknown; result: unknown }[];
      };
      setMessages([
        ...next,
        { role: "assistant", content: data.reply, trace: data.trace },
      ]);
    } catch (err) {
      setMessages([
        ...next,
        {
          role: "assistant",
          content: `Maaf, terjadi kesalahan: ${String(err)}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
        <CardContent className="py-4 flex items-start gap-3">
          <div className="bg-green-600 p-2 rounded-lg">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-green-900">Asisten AI Berbasis Tool</h3>
            <p className="text-xs text-green-800/80 mt-0.5">
              Agen AI ini punya akses ke 5 tools (audit, rencana aksi, progress, supplier, ROI calculator)
              dan otomatis memilih tool yang tepat untuk menjawab Anda.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="bg-green-600 p-1.5 rounded-md h-fit">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>
                  {m.trace && m.trace.length > 0 && (
                    <button
                      onClick={() =>
                        setOpenTrace((s) => ({ ...s, [i]: !s[i] }))
                      }
                      className="mt-2 text-[11px] text-green-700 hover:text-green-800 flex items-center gap-1 font-medium"
                    >
                      <Wrench className="w-3 h-3" />
                      {openTrace[i] ? "Sembunyikan" : "Lihat"} {m.trace.length} tool call{m.trace.length > 1 ? "s" : ""}
                    </button>
                  )}
                  {m.trace && openTrace[i] && (
                    <div className="mt-2 space-y-2">
                      {m.trace.map((t, j) => (
                        <div
                          key={j}
                          className="bg-white border border-gray-200 rounded-lg p-2 text-[11px] font-mono"
                        >
                          <div className="text-green-700 font-semibold">→ {t.tool}</div>
                          {t.args != null && Object.keys(t.args as object).length > 0 && (
                            <div className="text-gray-500 mt-0.5 break-all">
                              args: {JSON.stringify(t.args)}
                            </div>
                          )}
                          <div className="text-gray-700 mt-1 break-all max-h-32 overflow-y-auto">
                            {JSON.stringify(t.result, null, 2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="bg-green-600 p-1.5 rounded-md h-fit">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-gray-100 rounded-2xl px-3.5 py-2 text-sm text-gray-500">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={loading}
                  className="text-[11px] bg-green-50 hover:bg-green-100 text-green-800 px-2.5 py-1 rounded-full border border-green-200 transition disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2 pt-1"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanya apa saja tentang bisnis Anda..."
              disabled={loading}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-green-600 hover:bg-green-700 gap-1.5"
            >
              <Send className="w-4 h-4" />
              Kirim
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function CheckToggle({ checked, onChange, label, icon }: { checked: boolean; onChange: (v: boolean) => void; label: string; icon: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-left w-full ${checked ? "bg-teal-50 border-teal-400 text-teal-800" : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"}`}
    >
      <span className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${checked ? "bg-teal-500" : "bg-gray-200"}`}>
        {checked ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <X className="w-3.5 h-3.5 text-gray-400" />}
      </span>
      {icon}
      <span>{label}</span>
    </button>
  );
}

interface GreenLendForm {
  hasRenewableEnergy: boolean;
  hasWasteRecycling: boolean;
  hasOrganicPractices: boolean;
  hasFairWages: boolean;
  womenCount: string;
  communityImpact: string;
  hasOnlinePlatform: boolean;
  monthlyTxCount: string;
}

type GreenLendAnalysis = {
  strengths: string[];
  gaps: { issue: string; impact: string; action: string }[];
  quickWins: string[];
  scoreBreakdown: string;
  timeToImprove: string;
  motivationalNote: string;
};

function GreenLendTab({ businessId }: { businessId: number }) {
  const { toast } = useToast();
  const [form, setForm] = useState<GreenLendForm>({
    hasRenewableEnergy: false,
    hasWasteRecycling: false,
    hasOrganicPractices: false,
    hasFairWages: false,
    womenCount: "0",
    communityImpact: "5",
    hasOnlinePlatform: false,
    monthlyTxCount: "20",
  });
  const [analysis, setAnalysis] = useState<GreenLendAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const { data: audit } = useQuery({
    queryKey: ["latest-audit", businessId],
    queryFn: () => getLatestAudit(businessId),
    retry: false,
  });

  const { data: business } = useQuery({
    queryKey: ["business", businessId],
    queryFn: () => getBusiness(businessId),
  });

  const totalEmissions = Number(audit?.totalEmissions ?? 0);
  const energyEmissions = Number(audit?.energyEmissions ?? 0);
  const transportEmissions = Number(audit?.transportEmissions ?? 0);
  const wasteEmissions = Number(audit?.wasteEmissions ?? 0);
  const employeeCount = business?.employeeCount ?? 1;

  const traditionalRaw = audit ? 50 : 40;
  const traditionalContrib = traditionalRaw * 0.2;

  const altPresence = 10 + (form.hasOnlinePlatform ? 15 : 0) + Math.min(10, employeeCount * 0.4);
  const altTx = Math.min(30, (Number(form.monthlyTxCount) / 100) * 30);
  const altScore = Math.min(90, altPresence + altTx + 15);
  const altContrib = altScore * 0.5;

  const carbonScore = Math.max(0, 15 - totalEmissions / 2);
  const renewableBonus = form.hasRenewableEnergy ? 10 : 0;
  const wasteBonus = form.hasWasteRecycling ? 8 : 0;
  const organicBonus = form.hasOrganicPractices ? 7 : 0;
  const jobScore = Math.min(10, employeeCount * 2);
  const womenScore = Math.min(8, Number(form.womenCount) * 2);
  const fairWageBonus = form.hasFairWages ? 7 : 0;
  const communityScore = (Math.min(10, Number(form.communityImpact)) / 10) * 5;
  const sdgTotal = carbonScore + renewableBonus + wasteBonus + organicBonus + jobScore + womenScore + fairWageBonus + communityScore;
  const sdgCapped = Math.min(70, sdgTotal);
  const sdgContrib = sdgCapped * 0.3;

  const finalScore = Math.min(100, traditionalContrib + altContrib + sdgContrib);

  const loanEligible = finalScore >= 50;
  const maxLoanIdr = finalScore >= 80 ? 50_000_000 : finalScore >= 70 ? 30_000_000 : finalScore >= 60 ? 20_000_000 : finalScore >= 50 ? 10_000_000 : 0;
  const baseRate = finalScore >= 80 ? 12 : finalScore >= 70 ? 14 : finalScore >= 60 ? 16 : 18;
  const sdgDiscount = sdgCapped >= 50 ? 2 : sdgCapped >= 30 ? 1 : 0;
  const interestRate = baseRate - sdgDiscount;

  const scoreColor = finalScore >= 80 ? "text-emerald-700" : finalScore >= 60 ? "text-blue-700" : finalScore >= 50 ? "text-amber-700" : "text-red-600";
  const scoreLabel = finalScore >= 80 ? "Sangat Baik" : finalScore >= 70 ? "Baik" : finalScore >= 60 ? "Cukup" : finalScore >= 50 ? "Minimum" : "Belum Layak";
  const scoreBg = finalScore >= 80 ? "bg-emerald-100 border-emerald-200" : finalScore >= 60 ? "bg-blue-100 border-blue-200" : finalScore >= 50 ? "bg-amber-100 border-amber-200" : "bg-red-100 border-red-200";

  const handleAnalysis = async () => {
    if (!audit) {
      toast({ title: "Perlu audit dulu", description: "Lakukan audit karbon terlebih dahulu di tab Audit Karbon", variant: "destructive" });
      return;
    }
    setAnalysisLoading(true);
    setAnalysis(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/greenlend-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          womenCount: Number(form.womenCount),
          communityImpact: Number(form.communityImpact),
          monthlyTxCount: Number(form.monthlyTxCount),
          finalScore,
          sdgScore: sdgCapped,
          loanEligible,
          maxLoanIdr,
          interestRate,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Gagal menganalisa");
      }
      const data = await res.json() as GreenLendAnalysis;
      setAnalysis(data);
    } catch (err) {
      toast({ title: "Gagal analisa AI", description: String(err), variant: "destructive" });
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="border-0 shadow-sm bg-gradient-to-br from-teal-600 to-emerald-700 text-white overflow-hidden relative">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Landmark className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg">Akses Modal Hijau via GreenLend</h3>
                <Badge className="bg-white/20 text-white border-white/30 text-[10px]">Beta</Badge>
              </div>
              <p className="text-sm text-white/90 leading-relaxed mb-3">
                GreenLend adalah platform keuangan mikro berbasis AI yang memberi pinjaman UMKM dengan mempertimbangkan <strong>dampak SDG/ESG</strong> — bukan hanya riwayat kredit. Makin hijau bisnis kamu, makin tinggi peluang dapat dana dengan bunga lebih rendah.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-white/20 px-2 py-1 rounded-full">✓ Tanpa riwayat kredit formal</span>
                <span className="bg-white/20 px-2 py-1 rounded-full">✓ Bunga 10–15%</span>
                <span className="bg-white/20 px-2 py-1 rounded-full">✓ Sampai Rp50 juta</span>
                <span className="bg-white/20 px-2 py-1 rounded-full">✓ Skor ESG = keuntungan</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-3 gap-3 text-center text-xs">
            <div>
              <p className="text-white/60">Bobot Tradisional</p>
              <p className="font-bold text-base">20%</p>
            </div>
            <div>
              <p className="text-white/60">Data Alternatif</p>
              <p className="font-bold text-base">50%</p>
            </div>
            <div>
              <p className="text-white/60">Skor SDG/Hijau</p>
              <p className="font-bold text-base">30%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {!audit && (
        <Card className="border-0 shadow-sm bg-amber-50 border border-amber-200">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">Lakukan <strong>audit karbon</strong> terlebih dahulu di tab Audit Karbon. Data emisi Anda akan otomatis terpakai di simulasi ini.</p>
          </CardContent>
        </Card>
      )}

      {audit && (
        <Card className="border-0 shadow-sm bg-teal-50 border border-teal-200">
          <CardContent className="py-3 flex items-center gap-3">
            <BadgeCheck className="w-4 h-4 text-teal-700 flex-shrink-0" />
            <p className="text-xs text-teal-800">Data audit karbon terakhir ({audit.period}) sudah dimuat — total emisi <strong>{totalEmissions.toFixed(3)} ton CO₂e</strong>.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              Profil Keberlanjutan
            </CardTitle>
            <p className="text-xs text-gray-500">Centang praktik yang sudah Anda jalankan</p>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <CheckToggle checked={form.hasRenewableEnergy} onChange={(v) => setForm((p) => ({ ...p, hasRenewableEnergy: v }))} label="Pakai energi terbarukan (solar, dll)" icon={<Zap className="w-3.5 h-3.5 text-yellow-500" />} />
            <CheckToggle checked={form.hasWasteRecycling} onChange={(v) => setForm((p) => ({ ...p, hasWasteRecycling: v }))} label="Daur ulang / kelola sampah aktif" icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />} />
            <CheckToggle checked={form.hasOrganicPractices} onChange={(v) => setForm((p) => ({ ...p, hasOrganicPractices: v }))} label="Praktik organik / bahan alami" icon={<Leaf className="w-3.5 h-3.5 text-green-600" />} />
            <CheckToggle checked={form.hasFairWages} onChange={(v) => setForm((p) => ({ ...p, hasFairWages: v }))} label="Bayar upah layak (≥ UMK)" icon={<Users className="w-3.5 h-3.5 text-blue-500" />} />
            <CheckToggle checked={form.hasOnlinePlatform} onChange={(v) => setForm((p) => ({ ...p, hasOnlinePlatform: v }))} label="Punya toko online (Tokopedia, Shopee, dll)" icon={<ShoppingBag className="w-3.5 h-3.5 text-orange-500" />} />
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <Label className="text-xs text-gray-600 flex items-center gap-1 mb-1.5"><Users className="w-3 h-3" /> Karyawan wanita</Label>
                <Input type="number" min="0" value={form.womenCount} onChange={(e) => setForm((p) => ({ ...p, womenCount: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-gray-600 flex items-center gap-1 mb-1.5"><Star className="w-3 h-3" /> Dampak komunitas (1–10)</Label>
                <Input type="number" min="1" max="10" value={form.communityImpact} onChange={(e) => setForm((p) => ({ ...p, communityImpact: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-gray-600 flex items-center gap-1 mb-1.5"><CircleDollarSign className="w-3 h-3" /> Transaksi digital/bulan (estimasi)</Label>
                <Input type="number" min="0" value={form.monthlyTxCount} onChange={(e) => setForm((p) => ({ ...p, monthlyTxCount: e.target.value }))} className="h-8 text-sm" placeholder="Contoh: 50" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className={`border shadow-sm ${scoreBg}`}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Simulasi Skor GreenLend</p>
                  <p className={`text-4xl font-bold ${scoreColor}`}>{finalScore.toFixed(0)}</p>
                  <p className={`text-xs font-medium ${scoreColor}`}>{scoreLabel}</p>
                </div>
                <div className="text-right">
                  {loanEligible ? (
                    <div>
                      <p className="text-xs text-gray-500">Layak pinjaman</p>
                      <p className="text-lg font-bold text-emerald-700">Rp {(maxLoanIdr / 1_000_000).toFixed(0)} jt</p>
                      <p className="text-xs text-gray-500">bunga {interestRate}%/tahun</p>
                    </div>
                  ) : (
                    <div className="text-right">
                      <p className="text-xs text-red-600 font-medium">Skor minimum 50</p>
                      <p className="text-xs text-gray-500">diperlukan</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: "Tradisional (20%)", value: traditionalContrib, max: 12, color: "bg-slate-500" },
                  { label: "Data Alternatif (50%)", value: altContrib, max: 45, color: "bg-blue-500" },
                  { label: "SDG Hijau (30%)", value: sdgContrib, max: 21, color: "bg-teal-500", sub: `${sdgCapped.toFixed(0)}/70 poin SDG` },
                ].map(({ label, value, max, color, sub }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{label}</span>
                      <span className="font-medium">{value.toFixed(1)} / {max} poin</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${(value / max) * 100}%` }} />
                    </div>
                    {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="py-3">
              <p className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1.5"><Info className="w-3.5 h-3.5 text-blue-500" /> Kelayakan Pinjaman GreenLend</p>
              <div className="space-y-1.5">
                {[
                  { range: "Skor ≥80", loan: "Rp 50 juta", rate: "12%", active: finalScore >= 80 },
                  { range: "Skor 70–79", loan: "Rp 30 juta", rate: "14%", active: finalScore >= 70 && finalScore < 80 },
                  { range: "Skor 60–69", loan: "Rp 20 juta", rate: "16%", active: finalScore >= 60 && finalScore < 70 },
                  { range: "Skor 50–59", loan: "Rp 10 juta", rate: "18%", active: finalScore >= 50 && finalScore < 60 },
                  { range: "Skor < 50", loan: "Tidak layak", rate: "—", active: finalScore < 50 },
                ].map(({ range, loan, rate, active }) => (
                  <div key={range} className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs ${active ? "bg-teal-100 font-semibold text-teal-900 border border-teal-300" : "text-gray-500"}`}>
                    <span>{range}</span>
                    <span>{loan}</span>
                    <span>{rate !== "—" ? `${rate}/th` : "—"}</span>
                    {active && <BadgeCheck className="w-3.5 h-3.5 text-teal-600" />}
                  </div>
                ))}
              </div>
              {sdgDiscount > 0 && (
                <p className="text-[11px] text-teal-700 mt-2 flex items-center gap-1"><Leaf className="w-3 h-3" /> Diskon SDG −{sdgDiscount}% sudah diterapkan ke bunga di atas</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600" />
                Analisa AI — Cara Naikkan Skor GreenLend Kamu
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">AI akan identifikasi kekuatan, celah, dan langkah konkret berdasarkan data bisnis kamu</p>
            </div>
            <Button
              onClick={handleAnalysis}
              disabled={analysisLoading || !audit}
              className="bg-teal-600 hover:bg-teal-700 gap-2 flex-shrink-0"
            >
              {analysisLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {analysisLoading ? "AI Menganalisa..." : "Analisa Sekarang"}
            </Button>
          </div>

          {!analysis && !analysisLoading && (
            <div className="border-2 border-dashed border-gray-200 rounded-lg py-8 text-center">
              <Lightbulb className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Klik tombol di atas untuk mendapat rekomendasi personal dari AI</p>
            </div>
          )}

          {analysisLoading && (
            <div className="border-2 border-dashed border-teal-200 rounded-lg py-8 text-center bg-teal-50">
              <RefreshCw className="w-7 h-7 text-teal-400 mx-auto mb-2 animate-spin" />
              <p className="text-sm text-teal-600">AI sedang menganalisa profil bisnis dan skor GreenLend kamu...</p>
            </div>
          )}

          {analysis && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-emerald-800 mb-2 flex items-center gap-1.5"><BadgeCheck className="w-4 h-4" /> Kekuatan Bisnis Kamu</p>
                <ul className="space-y-1">
                  {analysis.strengths.map((s, i) => (
                    <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5"><Target className="w-4 h-4 text-amber-600" /> Celah yang Bisa Diperbaiki</p>
                <div className="space-y-2">
                  {analysis.gaps.map((g, i) => (
                    <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-amber-900">{g.issue}</p>
                      <p className="text-[11px] text-amber-700 mt-0.5 flex items-center gap-1"><TrendingUp className="w-3 h-3" />{g.impact}</p>
                      <p className="text-[11px] text-gray-600 mt-1 flex items-start gap-1"><Lightbulb className="w-3 h-3 text-blue-500 flex-shrink-0 mt-0.5" />{g.action}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> Quick Wins — Aksi Cepat Bulan Ini</p>
                <ul className="space-y-1">
                  {analysis.quickWins.map((q, i) => (
                    <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                      <span className="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</span>
                      {q}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <p className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1"><Info className="w-3.5 h-3.5 text-blue-500" /> Mengapa skor ini?</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{analysis.scoreBreakdown}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <p className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-purple-500" /> Estimasi waktu untuk skor 70+</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{analysis.timeToImprove}</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 rounded-lg p-4 text-center">
                <Leaf className="w-5 h-5 text-teal-600 mx-auto mb-1" />
                <p className="text-xs text-teal-800 italic">{analysis.motivationalNote}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Ingin apply ke GreenLend?</p>
                <a href="https://greenlend.elpeef.com" target="_blank" rel="noopener noreferrer"
                  className="text-xs font-medium text-teal-700 hover:text-teal-900 flex items-center gap-1">
                  greenlend.elpeef.com <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
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
          <img src="/logo.png" alt="Fakhara AI" className="h-11 w-auto" />
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
            <TabsTrigger value="greenlend" className="gap-1.5 text-teal-700 data-[state=active]:bg-teal-50 data-[state=active]:text-teal-800"><Landmark className="w-3.5 h-3.5" />Akses Modal</TabsTrigger>
            <TabsTrigger value="assistant" className="gap-1.5"><MessageCircle className="w-3.5 h-3.5" />Asisten AI</TabsTrigger>
          </TabsList>

          <TabsContent value="audit"><AuditTab businessId={businessId} /></TabsContent>
          <TabsContent value="action-plan"><ActionPlanTab businessId={businessId} /></TabsContent>
          <TabsContent value="suppliers"><SuppliersTab businessId={businessId} /></TabsContent>
          <TabsContent value="progress"><ProgressTab businessId={businessId} businessName={business?.name} /></TabsContent>
          <TabsContent value="esg"><EsgReportTab businessId={businessId} /></TabsContent>
          <TabsContent value="greenlend"><GreenLendTab businessId={businessId} /></TabsContent>
          <TabsContent value="assistant"><AssistantTab businessId={businessId} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
