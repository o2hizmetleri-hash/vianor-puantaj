"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Save,
  Copy,
  CheckSquare,
  FileDown,
  Loader2,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ATTENDANCE_STATUS,
  DEFAULT_SHIFT_HOURS,
  addHoursToTime,
  cn,
  diffHoursOvernight,
  diffMinutes,
  formatDate,
} from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { AppSettings, Attendance, Employee, Shift } from "@/lib/types";
import { exportAttendanceXlsx } from "@/lib/export";
import { exportAttendancePdf } from "@/lib/pdf";

interface Props {
  date: string;
  employees: Employee[];
  shifts: Shift[];
  initialAttendance: Attendance[];
  settings: AppSettings | null;
}

interface RowState {
  employee_id: string;
  shift_id: string | null;
  check_in: string | null;
  check_out: string | null;
  worked_hours: number;
  overtime_hours: number;
  late_minutes: number;
  early_leave_minutes: number;
  status: string;
  notes: string | null;
  dirty: boolean;
}

function buildInitialRows(
  employees: Employee[],
  attendance: Attendance[]
): Record<string, RowState> {
  const map: Record<string, RowState> = {};
  for (const e of employees) {
    const a = attendance.find((x) => x.employee_id === e.id);
    map[e.id] = {
      employee_id: e.id,
      shift_id: a?.shift_id || null,
      check_in: a?.check_in?.slice(0, 5) || null,
      check_out: a?.check_out?.slice(0, 5) || null,
      worked_hours: Number(a?.worked_hours || 0),
      overtime_hours: Number(a?.overtime_hours || 0),
      late_minutes: a?.late_minutes || 0,
      early_leave_minutes: a?.early_leave_minutes || 0,
      status: a?.status || (a ? "present" : "absent"),
      notes: a?.notes || null,
      dirty: false,
    };
  }
  return map;
}

function shiftDate(date: string, days: number) {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function AttendanceClient({
  date,
  employees,
  shifts,
  initialAttendance,
  settings,
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    buildInitialRows(employees, initialAttendance)
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRows(buildInitialRows(employees, initialAttendance));
  }, [employees, initialAttendance]);

  const lateTolerance = settings?.late_tolerance_minutes ?? 5;
  const overtimeThresholdMin = settings?.overtime_threshold_minutes ?? 30;

  const goDate = (d: string) => {
    const params = new URLSearchParams(sp.toString());
    params.set("date", d);
    router.push(`/puantaj?${params.toString()}`);
  };

  const updateRow = (id: string, patch: Partial<RowState>) => {
    setRows((prev) => {
      const next = { ...prev[id], ...patch, dirty: true };

      // ⚡ Geliş saati DEĞİŞTİ → çıkış otomatik geliş + 9 saat (mola dahil)
      // Vardiya seçili ise vardiyanın expected_hours'ı kullanılır, yoksa varsayılan 9.
      // Kullanıcı ayrıca çıkışı manuel girmediyse otomatik atılır.
      if (patch.check_in !== undefined && patch.check_in && patch.check_out === undefined) {
        const hoursToAdd = next.shift_id
          ? shifts.find((s) => s.id === next.shift_id)?.expected_hours || DEFAULT_SHIFT_HOURS
          : DEFAULT_SHIFT_HOURS;
        next.check_out = addHoursToTime(patch.check_in, hoursToAdd);
      }

      // Otomatik hesaplamalar (vardiya tabanlı geç/erken)
      if (
        next.shift_id &&
        (patch.shift_id !== undefined || patch.check_in !== undefined || patch.check_out !== undefined)
      ) {
        const shift = shifts.find((s) => s.id === next.shift_id);
        if (shift) {
          if (next.check_in) {
            const lateMin = diffMinutes(shift.start_time.slice(0, 5), next.check_in);
            next.late_minutes = lateMin > lateTolerance ? lateMin : 0;
          }
          if (next.check_out) {
            const earlyMin = diffMinutes(next.check_out, shift.end_time.slice(0, 5));
            // Gece yarısını geçmeyi handle etmek için negatifse 0
            next.early_leave_minutes = earlyMin > 0 ? earlyMin : 0;
          }
        }
      }
      if (next.check_in && next.check_out) {
        next.worked_hours = Math.max(
          0,
          Number(diffHoursOvernight(next.check_in, next.check_out).toFixed(2))
        );
        const expected = shifts.find((s) => s.id === next.shift_id)?.expected_hours || 0;
        const overtimeMin = (next.worked_hours - expected) * 60;
        next.overtime_hours =
          overtimeMin > overtimeThresholdMin
            ? Number((overtimeMin / 60).toFixed(2))
            : 0;
      } else if (!next.check_in || !next.check_out) {
        next.worked_hours = 0;
      }
      // Status auto-correction
      if (patch.check_in !== undefined && patch.check_in && next.status === "absent") {
        next.status = "present";
      }
      return { ...prev, [id]: next };
    });
  };

  const markAllPresent = () => {
    setRows((prev) => {
      const next = { ...prev };
      const defaultShift = shifts[0];
      Object.keys(next).forEach((id) => {
        const r = next[id];
        if (r.status === "absent") {
          next[id] = {
            ...r,
            status: "present",
            shift_id: r.shift_id || defaultShift?.id || null,
            check_in: r.check_in || defaultShift?.start_time.slice(0, 5) || null,
            check_out: r.check_out || defaultShift?.end_time.slice(0, 5) || null,
            dirty: true,
          };
        }
      });
      return next;
    });
    toast.success("Tüm personel 'geldi' olarak işaretlendi (taslak)");
  };

  const copyPreviousDay = async () => {
    try {
      const supabase = createClient();
      const prev = shiftDate(date, -1);
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("work_date", prev);
      if (error) throw error;
      setRows((prev) => {
        const next = { ...prev };
        for (const r of (data as Attendance[]) || []) {
          if (next[r.employee_id]) {
            next[r.employee_id] = {
              ...next[r.employee_id],
              shift_id: r.shift_id,
              check_in: r.check_in?.slice(0, 5) || null,
              check_out: r.check_out?.slice(0, 5) || null,
              status: r.status,
              worked_hours: Number(r.worked_hours || 0),
              overtime_hours: Number(r.overtime_hours || 0),
              late_minutes: r.late_minutes || 0,
              early_leave_minutes: r.early_leave_minutes || 0,
              notes: r.notes || null,
              dirty: true,
            };
          }
        }
        return next;
      });
      toast.success("Önceki gün kopyalandı (taslak — kaydetmeyi unutmayın)");
    } catch (e: any) {
      toast.error(e?.message || "Önceki gün alınamadı");
    }
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const dirtyRows = Object.values(rows).filter((r) => r.dirty);
      if (dirtyRows.length === 0) {
        toast.info("Kaydedilecek değişiklik yok");
        setSaving(false);
        return;
      }
      const payload = dirtyRows.map((r) => ({
        employee_id: r.employee_id,
        work_date: date,
        shift_id: r.shift_id,
        check_in: r.check_in ? r.check_in + ":00" : null,
        check_out: r.check_out ? r.check_out + ":00" : null,
        worked_hours: r.worked_hours,
        overtime_hours: r.overtime_hours,
        late_minutes: r.late_minutes,
        early_leave_minutes: r.early_leave_minutes,
        status: r.status,
        notes: r.notes,
      }));
      const { error } = await supabase
        .from("attendance")
        .upsert(payload, { onConflict: "employee_id,work_date" });
      if (error) throw error;
      toast.success(`${dirtyRows.length} kayıt kaydedildi`);
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Kaydetme sırasında hata");
    } finally {
      setSaving(false);
    }
  };

  const summary = useMemo(() => {
    const arr = Object.values(rows);
    return {
      present: arr.filter((r) => r.status === "present").length,
      absent: arr.filter((r) => r.status === "absent").length,
      leave: arr.filter((r) => r.status === "leave" || r.status === "sick").length,
      late: arr.filter((r) => r.late_minutes > 0).length,
    };
  }, [rows]);

  const employeesById = useMemo(() => {
    const m = new Map<string, Employee>();
    employees.forEach((e) => m.set(e.id, e));
    return m;
  }, [employees]);

  const shiftsById = useMemo(() => {
    const m = new Map<string, Shift>();
    shifts.forEach((s) => m.set(s.id, s));
    return m;
  }, [shifts]);

  const handleExportXlsx = () => {
    const list: Attendance[] = Object.values(rows).map((r) => ({
      id: "",
      employee_id: r.employee_id,
      work_date: date,
      shift_id: r.shift_id,
      check_in: r.check_in,
      check_out: r.check_out,
      expected_check_in: null,
      expected_check_out: null,
      worked_hours: r.worked_hours,
      overtime_hours: r.overtime_hours,
      late_minutes: r.late_minutes,
      early_leave_minutes: r.early_leave_minutes,
      status: r.status as any,
      notes: r.notes,
      created_at: "",
      updated_at: "",
      employee: employeesById.get(r.employee_id) || null,
      shift: r.shift_id ? shiftsById.get(r.shift_id) || null : null,
    }));
    exportAttendanceXlsx(list, date);
  };

  const handleExportPdf = () => {
    const list: Attendance[] = Object.values(rows).map((r) => ({
      id: "",
      employee_id: r.employee_id,
      work_date: date,
      shift_id: r.shift_id,
      check_in: r.check_in,
      check_out: r.check_out,
      expected_check_in: null,
      expected_check_out: null,
      worked_hours: r.worked_hours,
      overtime_hours: r.overtime_hours,
      late_minutes: r.late_minutes,
      early_leave_minutes: r.early_leave_minutes,
      status: r.status as any,
      notes: r.notes,
      created_at: "",
      updated_at: "",
      employee: employeesById.get(r.employee_id) || null,
      shift: r.shift_id ? shiftsById.get(r.shift_id) || null : null,
    }));
    exportAttendancePdf(list, date);
  };

  return (
    <div className="space-y-4">
      {/* Üst toolbar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => goDate(shiftDate(date, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-600/60" />
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => goDate(e.target.value)}
                  className="pl-9 pr-3 w-44 font-mono"
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => goDate(shiftDate(date, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="hidden md:block ml-2">
                <p className="font-serif text-lg text-cherry-800">{formatDate(date)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={markAllPresent}>
                <CheckSquare className="h-4 w-4" />
                Tümü Geldi
              </Button>
              <Button variant="outline" size="sm" onClick={copyPreviousDay}>
                <Copy className="h-4 w-4" />
                Önceki Günü Kopyala
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportXlsx}>
                <FileDown className="h-4 w-4" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPdf}>
                <FileDown className="h-4 w-4" />
                PDF
              </Button>
              <Button onClick={saveAll} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Kaydet
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Badge variant="success">Geldi: {summary.present}</Badge>
            <Badge variant="destructive">Gelmedi: {summary.absent}</Badge>
            <Badge variant="warning">İzinli/Raporlu: {summary.leave}</Badge>
            <Badge variant="outline">Geç kalan: {summary.late}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tablo */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-cream-100 text-ink-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 sticky left-0 bg-cream-100 z-10">Personel</th>
                <th className="text-left px-2 py-3">Vardiya</th>
                <th className="text-left px-2 py-3">Geliş</th>
                <th className="text-left px-2 py-3">Çıkış</th>
                <th className="text-right px-2 py-3">Çalışılan</th>
                <th className="text-right px-2 py-3">Geç (dk)</th>
                <th className="text-right px-2 py-3">Erken (dk)</th>
                <th className="text-right px-2 py-3">Mesai (sa)</th>
                <th className="text-left px-2 py-3">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {employees.map((e) => {
                const r = rows[e.id];
                if (!r) return null;
                const meta = ATTENDANCE_STATUS[r.status];
                const rowBg =
                  r.status === "present"
                    ? "bg-cream-50"
                    : r.status === "absent"
                    ? "bg-red-50/60"
                    : r.status === "leave" || r.status === "sick"
                    ? "bg-amber-50/40"
                    : "";
                return (
                  <tr key={e.id} className={cn(rowBg, "hover:bg-cream-100")}>
                    <td className="px-4 py-2 sticky left-0 bg-inherit z-[1]">
                      <div className="flex items-center gap-2 min-w-[200px]">
                        <Avatar className="h-8 w-8">
                          {e.photo_url && <AvatarImage src={e.photo_url} alt="" />}
                          <AvatarFallback className="text-xs">
                            {e.full_name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-ink-900 truncate flex items-center gap-1.5">
                            {e.full_name}
                            {r.late_minutes > 0 && (
                              <span title="Geç kaldı" className="inline-block w-1.5 h-1.5 rounded-full bg-warning" />
                            )}
                          </p>
                          {e.department && (
                            <p className="text-xs text-ink-600 truncate flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: e.department.color }} />
                              {e.department.name}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <Select
                        value={r.shift_id || "none"}
                        onValueChange={(v) => {
                          const shiftId = v === "none" ? null : v;
                          const shift = shiftId ? shifts.find((s) => s.id === shiftId) : null;
                          // Vardiya seçildiğinde: geliş = vardiya başlangıcı,
                          // çıkış = geliş + 9 saat (mola dahil)
                          const newCheckIn = shift && !r.check_in
                            ? shift.start_time.slice(0, 5)
                            : r.check_in;
                          const newCheckOut = newCheckIn && (!r.check_out || shift)
                            ? addHoursToTime(
                                newCheckIn,
                                shift?.expected_hours || DEFAULT_SHIFT_HOURS
                              )
                            : r.check_out;
                          updateRow(e.id, {
                            shift_id: shiftId,
                            check_in: newCheckIn,
                            check_out: newCheckOut,
                          });
                        }}
                      >
                        <SelectTrigger className="h-8 w-[120px]"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Yok —</SelectItem>
                          {shifts.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="time"
                        value={r.check_in || ""}
                        onChange={(ev) => updateRow(e.id, { check_in: ev.target.value || null })}
                        className="h-8 w-[110px] font-mono"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="time"
                        value={r.check_out || ""}
                        onChange={(ev) => updateRow(e.id, { check_out: ev.target.value || null })}
                        className="h-8 w-[110px] font-mono"
                      />
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-ink-900">
                      {r.worked_hours.toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Input
                        type="number"
                        min="0"
                        value={r.late_minutes}
                        onChange={(ev) => updateRow(e.id, { late_minutes: Number(ev.target.value) || 0 })}
                        className="h-8 w-[70px] text-right font-mono"
                      />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Input
                        type="number"
                        min="0"
                        value={r.early_leave_minutes}
                        onChange={(ev) =>
                          updateRow(e.id, { early_leave_minutes: Number(ev.target.value) || 0 })
                        }
                        className="h-8 w-[70px] text-right font-mono"
                      />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Input
                        type="number"
                        min="0"
                        step="0.25"
                        value={r.overtime_hours}
                        onChange={(ev) => updateRow(e.id, { overtime_hours: Number(ev.target.value) || 0 })}
                        className="h-8 w-[80px] text-right font-mono"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Select
                        value={r.status}
                        onValueChange={(v) => updateRow(e.id, { status: v })}
                      >
                        <SelectTrigger
                          className="h-8 w-[140px]"
                          style={{ background: meta.bg, color: meta.color, borderColor: meta.color + "44" }}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ATTENDANCE_STATUS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>
                              {v.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <p className="text-xs text-ink-600 flex items-center gap-2">
        <Clock className="h-3 w-3" />
        Standart vardiya: {DEFAULT_SHIFT_HOURS} saat (7.5 sa çalışma + 1.5 sa mola) · Geliş saati
        seçilince çıkış otomatik hesaplanır · Mesai eşiği: {overtimeThresholdMin} dk · Geç kalma
        toleransı: {lateTolerance} dk · Tüm değerler manuel düzenlenebilir.
      </p>
    </div>
  );
}
