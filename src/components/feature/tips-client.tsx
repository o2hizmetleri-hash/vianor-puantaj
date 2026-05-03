"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Wine, Loader2, FileDown, Trash2, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DISTRIBUTION_METHODS,
  POSITION_WEIGHTS,
  formatDate,
  formatTRY,
  monthStr,
} from "@/lib/utils";
import type { Employee, TipsDistribution, TipsPool } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { exportTipsXlsx } from "@/lib/export";

/** Yuvarlama sonrası toplamın havuz tutarına tam eşitlenmesi (son kişiye kuruş farkı) */
function reconcileTipsAmounts(
  rows: { employee: Employee; amount: number }[],
  targetTotal: number
): { employee: Employee; amount: number }[] {
  if (rows.length === 0) return rows;
  const out = rows.map((r) => ({
    ...r,
    amount: Number(Number(r.amount).toFixed(2)),
  }));
  const sum = out.reduce((s, r) => s + r.amount, 0);
  const drift = Number((targetTotal - sum).toFixed(2));
  if (drift !== 0) {
    const last = out[out.length - 1];
    out[out.length - 1] = {
      ...last,
      amount: Number((last.amount + drift).toFixed(2)),
    };
  }
  return out;
}

interface Props {
  pools: TipsPool[];
  distributions: TipsDistribution[];
  employees: Employee[];
}

export function TipsClient({ pools, distributions, employees }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState<{ employee: Employee; amount: number }[] | null>(
    null
  );

  const [form, setForm] = useState({
    pool_date: new Date().toISOString().slice(0, 10),
    total_amount: 0,
    distribution_method: "equal" as "equal" | "by_hours" | "by_position",
    notes: "",
  });

  // Önizleme — kim ne kadar alacak
  const computePreview = async () => {
    if (form.total_amount <= 0) {
      toast.error("Toplam tutar 0'dan büyük olmalı");
      return;
    }
    try {
      const supabase = createClient();
      const { data: att } = await supabase
        .from("attendance")
        .select("employee_id, worked_hours, status")
        .eq("work_date", form.pool_date);
      const todayWorking = (att || []).filter((a: any) => a.status === "present");
      if (todayWorking.length === 0) {
        toast.error("O gün çalışan personel bulunamadı");
        return;
      }
      const workingMap = new Map<string, number>();
      todayWorking.forEach((a: any) =>
        workingMap.set(a.employee_id, Number(a.worked_hours || 0))
      );
      const eligible = employees.filter((e) => workingMap.has(e.id));

      let result: { employee: Employee; amount: number }[] = [];

      if (form.distribution_method === "equal") {
        const n = eligible.length;
        const cents = Math.round(form.total_amount * 100);
        const base = Math.floor(cents / n);
        const rem = cents % n;
        result = eligible.map((e, i) => ({
          employee: e,
          amount: (base + (i < rem ? 1 : 0)) / 100,
        }));
      } else if (form.distribution_method === "by_hours") {
        const totalHours = eligible.reduce((s, e) => s + (workingMap.get(e.id) || 0), 0) || 1;
        result = eligible.map((e) => ({
          employee: e,
          amount: Number(
            ((workingMap.get(e.id) || 0) / totalHours * form.total_amount).toFixed(2)
          ),
        }));
        result = reconcileTipsAmounts(result, form.total_amount);
      } else if (form.distribution_method === "by_position") {
        const weights = eligible.map((e) => POSITION_WEIGHTS[e.position || "Diğer"] || 0.7);
        const totalW = weights.reduce((s, w) => s + w, 0) || 1;
        result = eligible.map((e, i) => ({
          employee: e,
          amount: Number(((weights[i] / totalW) * form.total_amount).toFixed(2)),
        }));
        result = reconcileTipsAmounts(result, form.total_amount);
      }
      setPreviewing(result);
    } catch (e: any) {
      toast.error(e?.message || "Hata");
    }
  };

  const confirmDistribution = async () => {
    if (!previewing) return;
    setLoading(true);
    try {
      const supabase = createClient();
      // Önce pool kaydı
      const { data: pool, error: poolErr } = await supabase
        .from("tips_pool")
        .insert({
          pool_date: form.pool_date,
          total_amount: form.total_amount,
          distribution_method: form.distribution_method,
          notes: form.notes || null,
        })
        .select("id")
        .single();
      if (poolErr) throw poolErr;

      const dist = previewing.map((p) => ({
        pool_id: pool.id,
        employee_id: p.employee.id,
        amount: p.amount,
        is_paid: false,
        paid_in_month: monthStr(),
      }));
      const { error: distErr } = await supabase.from("tips_distribution").insert(dist);
      if (distErr) throw distErr;

      toast.success("Bahşiş havuzu oluşturuldu ve dağıtıldı");
      setOpen(false);
      setPreviewing(null);
      setForm({
        pool_date: new Date().toISOString().slice(0, 10),
        total_amount: 0,
        distribution_method: "equal",
        notes: "",
      });
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Hata");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (p: TipsPool) => {
    if (!confirm("Bu havuz ve dağıtımları silinsin mi?")) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from("tips_pool").delete().eq("id", p.id);
      if (error) throw error;
      toast.success("Silindi");
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Hata");
    }
  };

  // Aylık özet — her personelin bu ay topladığı bahşiş
  const monthlyTotals = useMemo(() => {
    const m = monthStr();
    const map = new Map<string, number>();
    for (const d of distributions) {
      if (d.pool?.pool_date.startsWith(m)) {
        map.set(d.employee_id, (map.get(d.employee_id) || 0) + Number(d.amount));
      }
    }
    return Array.from(map.entries())
      .map(([id, amount]) => ({
        employee: employees.find((e) => e.id === id),
        amount,
      }))
      .filter((r) => r.employee)
      .sort((a, b) => b.amount - a.amount);
  }, [distributions, employees]);

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportTipsXlsx(distributions)}>
            <FileDown className="h-4 w-4" />
            Excel
          </Button>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Yeni Havuz
        </Button>
      </div>

      <Tabs defaultValue="pools">
        <TabsList>
          <TabsTrigger value="pools">Havuz Geçmişi</TabsTrigger>
          <TabsTrigger value="monthly">Bu Ay Özeti</TabsTrigger>
        </TabsList>

        <TabsContent value="pools" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {pools.length === 0 ? (
                <EmptyState
                  icon={Wine}
                  title="Henüz havuz yok"
                  description="İlk bahşiş havuzunuzu oluşturmak için 'Yeni Havuz' butonuna tıklayın."
                />
              ) : (
                <div className="divide-y divide-cream-200">
                  {pools.map((p) => {
                    const dist = distributions.filter((d) => d.pool_id === p.id);
                    return (
                      <div key={p.id} className="p-4 hover:bg-cream-50">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div>
                            <p className="font-serif text-lg text-cherry-800">
                              {formatTRY(p.total_amount)}
                            </p>
                            <p className="text-xs text-ink-600">
                              {formatDate(p.pool_date)} · {DISTRIBUTION_METHODS[p.distribution_method]} ·{" "}
                              {dist.length} kişi
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-danger hover:bg-red-50"
                            onClick={() => handleDelete(p)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <details className="mt-2">
                          <summary className="text-xs text-cherry-700 cursor-pointer hover:underline inline-flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            Dağılım göster
                          </summary>
                          <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {dist.map((d) => (
                              <div
                                key={d.id}
                                className="flex items-center justify-between bg-cream-100 rounded-sm px-2 py-1.5 text-xs"
                              >
                                <span className="truncate">{d.employee?.full_name}</span>
                                <span className="font-mono text-cherry-700 font-semibold">
                                  {formatTRY(d.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </details>
                        {p.notes && (
                          <p className="text-xs text-ink-600 mt-2 italic">{p.notes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Bu Ay Toplam Bahşiş — Personel Bazında</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyTotals.length === 0 ? (
                <EmptyState
                  icon={Wine}
                  title="Bu ay henüz bahşiş yok"
                  description="Bu ay için henüz bahşiş havuzu oluşturulmamış."
                />
              ) : (
                <div className="space-y-1.5">
                  {monthlyTotals.map((m) => (
                    <div
                      key={m.employee!.id}
                      className="flex items-center justify-between bg-cream-100 rounded-sm px-3 py-2 text-sm"
                    >
                      <span>{m.employee!.full_name}</span>
                      <span className="font-mono font-semibold text-cherry-700">
                        {formatTRY(m.amount)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between bg-cherry-900 text-cream-50 rounded-sm px-3 py-2.5 text-sm mt-3">
                    <span className="font-medium">Toplam</span>
                    <span className="font-mono font-bold">
                      {formatTRY(monthlyTotals.reduce((s, m) => s + m.amount, 0))}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setPreviewing(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Yeni Bahşiş Havuzu</DialogTitle>
          </DialogHeader>

          {!previewing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tarih</Label>
                  <Input
                    type="date"
                    value={form.pool_date}
                    onChange={(e) => setForm((f) => ({ ...f, pool_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Toplam Tutar (₺)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.total_amount || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, total_amount: Number(e.target.value) || 0 }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dağıtım Yöntemi</Label>
                <Select
                  value={form.distribution_method}
                  onValueChange={(v) => setForm((f) => ({ ...f, distribution_method: v as any }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DISTRIBUTION_METHODS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-ink-600">
                  {form.distribution_method === "equal" &&
                    "O gün çalışan herkes eşit pay alır"}
                  {form.distribution_method === "by_hours" &&
                    "O gün çalışılan saat oranında pay edilir"}
                  {form.distribution_method === "by_position" &&
                    "Pozisyona göre ağırlıklı dağıtılır (Şef 1.2, Garson 1.0, Komi 0.6...)"}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Açıklama</Label>
                <Textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
                <Button onClick={computePreview}>
                  <Eye className="h-4 w-4" />
                  Önizleme
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-ink-600">
                Toplam <strong className="text-cherry-700">{formatTRY(form.total_amount)}</strong>,{" "}
                <strong>{previewing.length}</strong> kişiye dağıtılacak
              </p>
              <div className="max-h-80 overflow-y-auto space-y-1.5">
                {previewing.map((p) => (
                  <div
                    key={p.employee.id}
                    className="flex items-center justify-between bg-cream-100 rounded-sm px-3 py-2 text-sm"
                  >
                    <div>
                      <p>{p.employee.full_name}</p>
                      <p className="text-xs text-ink-600">{p.employee.position}</p>
                    </div>
                    <span className="font-mono font-semibold text-cherry-700">
                      {formatTRY(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setPreviewing(null)}>Geri</Button>
                <Button onClick={confirmDistribution} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Onayla & Dağıt
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
