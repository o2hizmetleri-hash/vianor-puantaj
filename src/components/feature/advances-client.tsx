"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Loader2, Wallet, FileDown, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { EmptyState } from "@/components/ui/empty-state";
import { PAYMENT_METHODS, formatDate, formatTRY, monthStr } from "@/lib/utils";
import type { Advance } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { exportAdvancesXlsx } from "@/lib/export";

const schema = z.object({
  employee_id: z.string().min(1, "Personel seçin"),
  amount: z.coerce.number().positive("Pozitif olmalı"),
  advance_date: z.string().min(1),
  payment_method: z.enum(["cash", "bank", "other"]),
  description: z.string().optional().nullable(),
  is_deducted: z.boolean().default(false),
  deducted_in_month: z.string().optional().nullable(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  initialAdvances: Advance[];
  employees: { id: string; full_name: string }[];
}

export function AdvancesClient({ initialAdvances, employees }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Advance | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState<string>("");
  const [filterPending, setFilterPending] = useState(false);

  const filtered = useMemo(() => {
    let arr = [...initialAdvances];
    if (search.trim()) {
      const s = search.toLowerCase();
      arr = arr.filter((a) => (a.employee?.full_name || "").toLowerCase().includes(s));
    }
    if (filterMonth) {
      arr = arr.filter((a) => a.advance_date.startsWith(filterMonth));
    }
    if (filterPending) arr = arr.filter((a) => !a.is_deducted);
    return arr;
  }, [initialAdvances, search, filterMonth, filterPending]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      employee_id: "",
      amount: 0,
      advance_date: new Date().toISOString().slice(0, 10),
      payment_method: "cash",
      description: "",
      is_deducted: false,
      deducted_in_month: monthStr(),
    },
  });
  const w = watch();

  const openNew = () => {
    setEditing(null);
    reset({
      employee_id: "",
      amount: 0,
      advance_date: new Date().toISOString().slice(0, 10),
      payment_method: "cash",
      description: "",
      is_deducted: false,
      deducted_in_month: monthStr(),
    });
    setOpen(true);
  };

  const openEdit = (a: Advance) => {
    setEditing(a);
    reset({
      employee_id: a.employee_id,
      amount: Number(a.amount),
      advance_date: a.advance_date,
      payment_method: a.payment_method,
      description: a.description || "",
      is_deducted: a.is_deducted,
      deducted_in_month: a.deducted_in_month || monthStr(),
    });
    setOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const supabase = createClient();
      const payload = {
        ...data,
        description: data.description || null,
        deducted_in_month: data.deducted_in_month || null,
      };
      if (editing) {
        const { error } = await supabase.from("advances").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("advances").insert(payload);
        if (error) throw error;
      }
      toast.success(editing ? "Avans güncellendi" : "Avans eklendi");
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Hata");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (a: Advance) => {
    if (!confirm("Bu avans kaydı silinsin mi?")) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from("advances").delete().eq("id", a.id);
      if (error) throw error;
      toast.success("Silindi");
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Hata");
    }
  };

  return (
    <>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-600/60" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Personel ara…"
                  className="pl-9"
                />
              </div>
              <Input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-44"
              />
              <Button
                variant={filterPending ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterPending((v) => !v)}
              >
                Düşülmemişler
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => exportAdvancesXlsx(filtered)}>
                <FileDown className="h-4 w-4" />
                Excel
              </Button>
              <Button onClick={openNew}>
                <Plus className="h-4 w-4" />
                Yeni Avans
              </Button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="Avans kaydı bulunamadı"
              description="Filtreleri değiştirin veya yeni bir avans ekleyin."
            />
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead className="bg-cream-100 text-ink-600 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-6 py-3">Personel</th>
                    <th className="text-left px-3 py-3">Tarih</th>
                    <th className="text-right px-3 py-3">Tutar</th>
                    <th className="text-left px-3 py-3">Yöntem</th>
                    <th className="text-left px-3 py-3">Açıklama</th>
                    <th className="text-left px-3 py-3">Düşüldü mü?</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200">
                  {filtered.map((a) => (
                    <tr key={a.id} className="hover:bg-cream-50">
                      <td className="px-6 py-3 font-medium text-ink-900">
                        {a.employee?.full_name || "—"}
                      </td>
                      <td className="px-3 py-3 text-ink-600">{formatDate(a.advance_date)}</td>
                      <td className="px-3 py-3 text-right font-mono text-cherry-700 font-semibold">
                        {formatTRY(a.amount)}
                      </td>
                      <td className="px-3 py-3 text-ink-600">{PAYMENT_METHODS[a.payment_method]}</td>
                      <td className="px-3 py-3 text-ink-600 max-w-xs truncate">{a.description || "—"}</td>
                      <td className="px-3 py-3">
                        {a.is_deducted ? (
                          <Badge variant="success">{a.deducted_in_month || "Düşüldü"}</Badge>
                        ) : (
                          <Badge variant="warning">Bekliyor</Badge>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(a)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-danger hover:bg-red-50"
                            onClick={() => handleDelete(a)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Avansı Düzenle" : "Yeni Avans"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Personel</Label>
              <Select
                value={w.employee_id}
                onValueChange={(v) => setValue("employee_id", v, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Personel seçin" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.employee_id && (
                <p className="text-xs text-danger">{errors.employee_id.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tutar (₺)</Label>
                <Input type="number" step="0.01" min="0" {...register("amount")} />
                {errors.amount && (
                  <p className="text-xs text-danger">{errors.amount.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Tarih</Label>
                <Input type="date" {...register("advance_date")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ödeme Yöntemi</Label>
              <Select
                value={w.payment_method}
                onValueChange={(v) => setValue("payment_method", v as any)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea rows={2} {...register("description")} placeholder="Açıklama (opsiyonel)" />
            </div>

            <div className="bg-cream-100 rounded-sm p-3 space-y-2 border border-cream-300">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Maaştan kesildi mi?</Label>
                <Select
                  value={w.is_deducted ? "yes" : "no"}
                  onValueChange={(v) => setValue("is_deducted", v === "yes")}
                >
                  <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">Hayır</SelectItem>
                    <SelectItem value="yes">Evet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {w.is_deducted && (
                <div className="space-y-2">
                  <Label className="text-xs">Hangi ay maaşından?</Label>
                  <Input type="month" {...register("deducted_in_month")} />
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Güncelle" : "Ekle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
