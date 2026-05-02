"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Check, X, Plane, Stethoscope, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ATTENDANCE_STATUS, cn, formatDate, formatTime } from "@/lib/utils";
import type { Attendance, Employee } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

interface Props {
  dates: string[];
  employees: Employee[];
  attendance: Attendance[];
}

const ICON: Record<string, any> = {
  present: Check,
  absent: X,
  leave: Plane,
  sick: Stethoscope,
  holiday: Calendar,
  off: Calendar,
};

export function WeeklyAttendanceClient({ dates, employees, attendance }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [detail, setDetail] = useState<Attendance | null>(null);

  const map = useMemo(() => {
    const m = new Map<string, Attendance>();
    for (const a of attendance) {
      m.set(`${a.employee_id}-${a.work_date}`, a);
    }
    return m;
  }, [attendance]);

  const goWeek = (delta: number) => {
    const next = new Date(dates[0] + "T00:00:00");
    next.setDate(next.getDate() + delta * 7);
    const params = new URLSearchParams(sp.toString());
    params.set("week", next.toISOString().slice(0, 10));
    router.push(`/puantaj/haftalik?${params.toString()}`);
  };

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" size="sm" onClick={() => goWeek(-1)}>
              <ChevronLeft className="h-4 w-4" />
              Önceki
            </Button>
            <p className="font-serif text-lg text-cherry-800">
              {formatDate(dates[0])} – {formatDate(dates[6])}
            </p>
            <Button variant="outline" size="sm" onClick={() => goWeek(1)}>
              Sonraki
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-cream-100 text-ink-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3 sticky left-0 bg-cream-100 z-10">Personel</th>
                  {dates.map((d) => {
                    const dt = parseISO(d);
                    return (
                      <th key={d} className="text-center px-2 py-3 min-w-[80px]">
                        <div>{format(dt, "EEE", { locale: tr })}</div>
                        <div className="font-mono normal-case font-normal text-[10px]">
                          {format(dt, "dd MMM", { locale: tr })}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {employees.map((e) => (
                  <tr key={e.id} className="hover:bg-cream-50">
                    <td className="px-4 py-2 sticky left-0 bg-white z-[1]">
                      <div className="flex items-center gap-2 min-w-[180px]">
                        <Avatar className="h-7 w-7">
                          {e.photo_url && <AvatarImage src={e.photo_url} alt="" />}
                          <AvatarFallback className="text-xs">
                            {e.full_name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-sm font-medium text-ink-900 truncate">{e.full_name}</p>
                      </div>
                    </td>
                    {dates.map((d) => {
                      const a = map.get(`${e.id}-${d}`);
                      const status = a?.status || "absent";
                      const meta = ATTENDANCE_STATUS[status];
                      const Ico = ICON[status] || X;
                      return (
                        <td key={d} className="px-2 py-2 text-center">
                          <button
                            onClick={() => a && setDetail(a)}
                            disabled={!a}
                            className={cn(
                              "inline-flex flex-col items-center gap-0.5 mx-auto rounded-sm px-2 py-1.5 transition-colors w-full",
                              a ? "hover:opacity-80 cursor-pointer" : "opacity-50"
                            )}
                            style={{ background: meta.bg, color: meta.color }}
                            title={`${meta.label}${a?.check_in ? ` · ${formatTime(a.check_in)}-${formatTime(a.check_out)}` : ""}`}
                          >
                            <Ico className="h-4 w-4" />
                            {a?.check_in && (
                              <span className="text-[10px] font-mono">
                                {formatTime(a.check_in)}
                              </span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Puantaj Detayı</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <p className="text-ink-600">
                {employees.find((e) => e.id === detail.employee_id)?.full_name} ·{" "}
                {formatDate(detail.work_date)}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-ink-600">Geliş</p>
                  <p className="font-mono">{formatTime(detail.check_in)}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-600">Çıkış</p>
                  <p className="font-mono">{formatTime(detail.check_out)}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-600">Çalışılan</p>
                  <p className="font-mono">{Number(detail.worked_hours).toFixed(2)} sa</p>
                </div>
                <div>
                  <p className="text-xs text-ink-600">Mesai</p>
                  <p className="font-mono">{Number(detail.overtime_hours).toFixed(2)} sa</p>
                </div>
                <div>
                  <p className="text-xs text-ink-600">Geç (dk)</p>
                  <p className="font-mono">{detail.late_minutes}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-600">Erken Çıkış (dk)</p>
                  <p className="font-mono">{detail.early_leave_minutes}</p>
                </div>
              </div>
              {detail.notes && (
                <div>
                  <p className="text-xs text-ink-600">Not</p>
                  <p>{detail.notes}</p>
                </div>
              )}
              <Button asChild variant="outline" className="w-full" onClick={() => setDetail(null)}>
                <a href={`/puantaj?date=${detail.work_date}`}>O günün puantajını aç</a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
