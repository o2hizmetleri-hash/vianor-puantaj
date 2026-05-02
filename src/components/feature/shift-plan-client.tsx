"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Copy,
  Save,
  Loader2,
  X,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Attendance, Employee, Shift } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Props {
  dates: string[];
  employees: Employee[];
  shifts: Shift[];
  attendance: Attendance[];
}

interface Assignment {
  employee_id: string;
  shift_id: string;
  date: string;
}

export function ShiftPlanClient({ dates, employees, shifts, attendance }: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  const [assignments, setAssignments] = useState<Assignment[]>(() =>
    attendance
      .filter((a) => !!a.shift_id)
      .map((a) => ({ employee_id: a.employee_id, shift_id: a.shift_id!, date: a.work_date }))
  );
  const [adding, setAdding] = useState<{ date: string; shift_id: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const empById = useMemo(() => {
    const m = new Map<string, Employee>();
    employees.forEach((e) => m.set(e.id, e));
    return m;
  }, [employees]);

  // Çakışma uyarısı (aynı kişi aynı gün 2 vardiyada)
  const conflicts = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assignments) {
      const key = `${a.employee_id}-${a.date}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return new Set(
      Array.from(map.entries())
        .filter(([, n]) => n > 1)
        .map(([k]) => k)
    );
  }, [assignments]);

  const goWeek = (delta: number) => {
    const next = new Date(dates[0] + "T00:00:00");
    next.setDate(next.getDate() + delta * 7);
    const params = new URLSearchParams(sp.toString());
    params.set("week", next.toISOString().slice(0, 10));
    router.push(`/vardiya?${params.toString()}`);
  };

  const removeAssignment = (a: Assignment) => {
    setAssignments((prev) =>
      prev.filter((x) => !(x.employee_id === a.employee_id && x.date === a.date && x.shift_id === a.shift_id))
    );
  };

  const addAssignment = (employee_id: string) => {
    if (!adding) return;
    setAssignments((prev) => [...prev, { ...adding, employee_id }]);
    setAdding(null);
  };

  const copyPreviousWeek = async () => {
    try {
      const supabase = createClient();
      const startPrev = new Date(dates[0] + "T00:00:00");
      startPrev.setDate(startPrev.getDate() - 7);
      const endPrev = new Date(startPrev);
      endPrev.setDate(startPrev.getDate() + 6);

      const { data, error } = await supabase
        .from("attendance")
        .select("employee_id, shift_id, work_date")
        .not("shift_id", "is", null)
        .gte("work_date", startPrev.toISOString().slice(0, 10))
        .lte("work_date", endPrev.toISOString().slice(0, 10));
      if (error) throw error;

      const newAssignments: Assignment[] = (data || []).map((a: any) => {
        const d = new Date(a.work_date + "T00:00:00");
        d.setDate(d.getDate() + 7);
        return {
          employee_id: a.employee_id,
          shift_id: a.shift_id,
          date: d.toISOString().slice(0, 10),
        };
      });
      setAssignments(newAssignments);
      toast.success("Geçen haftanın vardiyaları kopyalandı (taslak)");
    } catch (e: any) {
      toast.error(e?.message || "Hata");
    }
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const payload = assignments.map((a) => ({
        employee_id: a.employee_id,
        work_date: a.date,
        shift_id: a.shift_id,
        status: "present",
      }));
      // Tek tek upsert (employee_id, work_date)
      const { error } = await supabase
        .from("attendance")
        .upsert(payload, { onConflict: "employee_id,work_date" });
      if (error) throw error;
      toast.success("Vardiyalar kaydedildi");
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Hata");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => goWeek(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <p className="font-serif text-lg text-cherry-800">
                {formatDate(dates[0])} – {formatDate(dates[6])}
              </p>
              <Button variant="outline" size="sm" onClick={() => goWeek(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={copyPreviousWeek}>
                <Copy className="h-4 w-4" />
                Geçen Haftayı Kopyala
              </Button>
              <Button onClick={saveAll} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Kaydet
              </Button>
            </div>
          </div>

          {conflicts.size > 0 && (
            <div className="mb-3 flex items-start gap-2 p-3 bg-amber-50 border border-warning/30 rounded-sm text-sm">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              <p className="text-ink-900">
                <strong>{conflicts.size}</strong> personel aynı günde birden fazla vardiyaya atanmış.
                Lütfen kontrol edin.
              </p>
            </div>
          )}

          <div className="overflow-x-auto">
            <div className="grid grid-cols-7 gap-2 min-w-[1000px]">
              {dates.map((d) => {
                const dt = parseISO(d);
                return (
                  <div key={d} className="space-y-2">
                    <div className="px-2 py-1.5 bg-cherry-900 text-cream-50 rounded-sm text-center">
                      <p className="text-xs uppercase">{format(dt, "EEEE", { locale: tr })}</p>
                      <p className="font-mono text-sm">{format(dt, "dd MMM", { locale: tr })}</p>
                    </div>
                    {shifts.map((s) => {
                      const items = assignments.filter(
                        (a) => a.date === d && a.shift_id === s.id
                      );
                      return (
                        <div
                          key={s.id}
                          className="bg-white border border-cream-300 rounded-sm overflow-hidden"
                          style={{ borderTopColor: s.color, borderTopWidth: 3 }}
                        >
                          <div className="px-2 py-1 bg-cream-100 flex items-center justify-between">
                            <p className="text-xs font-medium text-ink-900">
                              {s.name}
                            </p>
                            <p className="text-[10px] font-mono text-ink-600">
                              {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                            </p>
                          </div>
                          <div className="p-1.5 min-h-[60px] space-y-1">
                            {items.map((a, i) => {
                              const e = empById.get(a.employee_id);
                              if (!e) return null;
                              const isConflict = conflicts.has(`${a.employee_id}-${a.date}`);
                              return (
                                <div
                                  key={`${a.employee_id}-${i}`}
                                  className={cn(
                                    "flex items-center gap-1.5 px-1.5 py-1 rounded-sm text-xs group",
                                    isConflict ? "bg-amber-100" : "bg-cream-100"
                                  )}
                                  style={{
                                    borderLeft: `3px solid ${e.department?.color || s.color}`,
                                  }}
                                >
                                  <Avatar className="h-5 w-5">
                                    {e.photo_url && <AvatarImage src={e.photo_url} alt="" />}
                                    <AvatarFallback className="text-[8px]">
                                      {e.full_name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="truncate flex-1">{e.full_name}</span>
                                  <button
                                    onClick={() => removeAssignment(a)}
                                    className="opacity-0 group-hover:opacity-100 text-ink-600 hover:text-danger"
                                    aria-label="Kaldır"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              );
                            })}
                            <button
                              onClick={() => setAdding({ date: d, shift_id: s.id })}
                              className="w-full text-xs text-ink-600 hover:text-cherry-700 hover:bg-cream-50 py-1 rounded-sm flex items-center justify-center gap-1 border border-dashed border-cream-300"
                            >
                              <Plus className="h-3 w-3" />
                              Ekle
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!adding} onOpenChange={(v) => !v && setAdding(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Personel Ata</DialogTitle>
          </DialogHeader>
          {adding && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {employees.map((e) => (
                <button
                  key={e.id}
                  onClick={() => addAssignment(e.id)}
                  className="w-full flex items-center gap-3 p-2 hover:bg-cream-100 rounded-sm transition-colors text-left"
                >
                  <Avatar className="h-8 w-8">
                    {e.photo_url && <AvatarImage src={e.photo_url} alt="" />}
                    <AvatarFallback className="text-xs">
                      {e.full_name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-900 truncate">{e.full_name}</p>
                    <p className="text-xs text-ink-600 truncate">
                      {e.position || "—"}
                      {e.department && ` · ${e.department.name}`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
