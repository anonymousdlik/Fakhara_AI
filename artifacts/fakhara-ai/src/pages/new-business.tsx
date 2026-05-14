import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBusiness } from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Leaf, Building2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const SECTORS = [
  "Kuliner",
  "Fashion",
  "Retail",
  "Manufaktur",
  "Jasa",
  "Pertanian",
  "Teknologi",
  "Kerajinan",
  "Pendidikan",
  "Lainnya",
];

export default function NewBusiness() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "",
    sector: "",
    location: "",
    employeeCount: "",
    description: "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      createBusiness({
        name: form.name,
        sector: form.sector,
        location: form.location,
        employeeCount: Number(form.employeeCount),
        description: form.description || undefined,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["businesses"] });
      toast({ title: "Bisnis berhasil dibuat!", description: `${data.name} telah terdaftar di Fakhara AI` });
      navigate(`/businesses/${data.id}`);
    },
    onError: (err) => {
      toast({ title: "Gagal membuat bisnis", description: String(err), variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.sector || !form.location || !form.employeeCount) {
      toast({ title: "Lengkapi semua field yang diperlukan", variant: "destructive" });
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Fakhara AI</h1>
        </div>

        <Link href="/">
          <Button variant="ghost" className="mb-4 gap-2 text-gray-600">
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Dashboard
          </Button>
        </Link>

        <Card className="border-0 shadow-sm bg-white">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Daftarkan Bisnis Baru</CardTitle>
                <p className="text-sm text-gray-500 mt-0.5">Mulai audit karbon dan rencana keberlanjutan</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">Nama Bisnis *</Label>
                <Input
                  id="name"
                  placeholder="Contoh: Warung Makan Bu Siti"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="sector" className="text-sm font-medium text-gray-700">Sektor Bisnis *</Label>
                <Select value={form.sector} onValueChange={(v) => setForm({ ...form, sector: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih sektor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTORS.map((s) => (
                      <SelectItem key={s} value={s.toLowerCase()}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location" className="text-sm font-medium text-gray-700">Lokasi *</Label>
                  <Input
                    id="location"
                    placeholder="Kota/Kabupaten"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="employees" className="text-sm font-medium text-gray-700">Jumlah Karyawan *</Label>
                  <Input
                    id="employees"
                    type="number"
                    min="1"
                    placeholder="5"
                    value={form.employeeCount}
                    onChange={(e) => setForm({ ...form, employeeCount: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">Deskripsi (opsional)</Label>
                <Textarea
                  id="description"
                  placeholder="Ceritakan tentang bisnis Anda..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="mt-1"
                />
              </div>

              <Button
                type="submit"
                disabled={mutation.isPending}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {mutation.isPending ? "Menyimpan..." : "Daftarkan Bisnis"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
