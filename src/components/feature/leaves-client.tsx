"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Loader2, Plane, FileDown } from "lucide-react";
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
import { LEAVE_TYPES, formatDate } from "@/lib/utils";
import type { Leave } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { exportLeavesXlsx } from "@/lib/export";

const schema = z
  .object({
    employee_id: z.string().min(1, "Personel seçin"),
    leave_type: z.enum(["annual", "sick", "unpaid", "maternity", "other"]),
    start_date: z.string().min(1),
    end_date: z.string().min(1),
    is_paid: z.boolean().default(true),
    reason: z.string().optional().nullable(),
  })
  .refine((d) => d.end_date >= d.start_date, {
    message: "Bitiş tarihi başlangıçtan sonra olmalı",
    path: ["end_date"],
  });

type FormData = z.infer<typeof schema>;

interface Props {
  initialLeaves: Leave[];
  employees: { id: string; full_name: string }[];
}

function daysBetween(a: string, b: string) {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export function LeavesClient({ initialLeaves, employees }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Leave | null>(null);
  const [loading, setLoading] = useState(false);

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
      leave_type: "annual",
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
      is_paid: true,
      reason: "",
    },
  });

  const w = watch();
  const totalDays = w.start_date && w.end_date ? daysBetween(w.start_date, w.end_date) : 0;

  const openNew = () => {
    setEditing(null);
    reset({
      employee_id: "",
      leave_type: "annual",
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
      is_paid: true,
      reason: "",
    });
    setOpen(true);
  };

  const openEdit = (l: Leave) => {
    setEditing(l);
    reset({
      employee_id: l.employee_id,
      leave_type: l.leave_type,
      start_date: l.start_date,
      end_date: l.end_date,
      is_paid: l.is_paid,
      reason: l.reason || "",
    });
    setOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const supabase = createClient();
      const total_days = daysBetween(data.start_date, data.end_date);
      const payload = { ...data, total_days, reason: data.reason || null };

      if (editing) {
        const { error } = await supabase.from("leaves").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("leaves").insert(payload);
        if (error) throw error;
      }

      // attendance senkronizasyonu — tarih aralığında kayıt aç/güncelle
      const dateList: string[] = [];
      const cur = new Date(data.start_date);
      const end = new Date(data.end_date);
      while (cur <= end) {
        dateList.push(cur.toISOString().slice(0, 10));
        cur.setDate(cur.getDate() + 1);
      }
      const status = data.leave_type === "sick" ? "sick" : "leave";
      const attPayload = dateList.map((d) => ({
        employee_id: data.employee_id,
        work_date: d,
        status,
      }));
      await supabase
        .from("attendance")
        .upsert(attPayload, { onConflict: "employee_id,work_date" });

      toast.success(editing ? "İzin güncellendi" : "İzin eklendi");
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Hata");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (l: Leave) => {
    if (!confirm("Bu izin kaydı silinsin mi?")) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from("leaves").delete().eq("id", l.id);
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
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-ink-600">
              Toplam {initialLeaves.length} izin/rapor kaydı
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => exportLeavesXlsx(initialLeaves)}>
                <FileDown className="h-4 w-4" />
                Excel
              </Button>
              <Button onClick={openNew}>
                <Plus className="h-4 w-4" />
                Yeni İzin
              </Button>
            </div>
          </div>

          {initialLeaves.length === 0 ? (
            <EmptyState
              icon={Plane}
              title="Henüz izin kaydı yok"
              description="İlk izin kaydını oluşturmak için 'Yeni İzin' butonuna tıklayın."
            />
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead className="bg-cream-100 text-ink-600 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-6 py-3">Personel</th>
                    <th className="text-left px-3 py-3">Tür</th>
                    <th className="text-left px-3 py-3">Başlangıç</th>
                    <th className="text-left px-3 py-3">Bitiş</th>
                    <th className="text-right px-3 py-3">Gün</th>
                    <th className="text-left px-3 py-3">Ücretli</th>
                    <th className="text-left px-3 py-3">Açıklama</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200">
                  {initialLeaves.map((l) => (
                    <tr key={l.id} className="hover:bg-cream-50">
                      <td className="px-6 py-3 font-medium text-ink-900">
                        {l.employee?.full_name || "—"}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant="secondary">{LEAVE_TYPES[l.leave_type]}</Badge>
                      </td>
                      <td className="px-3 py-3 text-ink-600">{formatDate(l.start_date)}</td>
                      <td className="px-3 py-3 text-ink-600">{formatDate(l.end_date)}</td>
                      <td className="px-3 py-3 text-right font-mono">{l.total_days}</td>
                      <td className="px-3 py-3">
                        {l.is_paid ? (
                          <Badge variant="success">Ücretli</Badge>
                        ) : (
                          <Badge variant="destructive">Ücretsiz</Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 text-ink-600 max-w-xs truncate">{l.reason || "—"}</td>
                      <td className="px-6 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(l)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-danger hover:bg-red-50"
                            onClick={() => handleDelete(l)}
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
            <DialogTitle>{editing ? "İzni Düzenle" : "Yeni İzin"}</DialogTitle>
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

            <div className="space-y-2">
              <Label>İzin Türü</Label>
              <Select
                value={w.leave_type}
                onValueChange={(v) => setValue("leave_type", v as any)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAVE_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Başlangıç</Label>
                <Input type="date" {...register("start_date")} />
              </div>
              <div className="space-y-2">
                <Label>Bitiş</Label>
                <Input type="date" {...register("end_date")} />
                {errors.end_date && (
                  <p className="text-xs text-danger">{errors.end_date.message}</p>
                )}
              </div>
            </div>

            <p className="text-sm text-ink-600">
              Toplam <span className="font-mono font-semibold text-cherry-700">{totalDays}</span> gün
            </p>

            <div className="space-y-2">
              <Label>Ücret Durumu</Label>
              <Select
                value={w.is_paid ? "paid" : "unpaid"}
                onValueChange={(v) => setValue("is_paid", v === "paid")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Ücretli izin</SelectItem>
                  <SelectItem value="unpaid">Ücretsiz izin (maaştan kesilir)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea rows={2} {...register("reason")} placeholder="Açıklama (opsiyonel)" />
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
