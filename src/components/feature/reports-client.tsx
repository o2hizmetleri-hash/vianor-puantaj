"use client";

import { useState } from "react";
import {
  CalendarCheck,
  UserCheck,
  Building2,
  Clock,
  TrendingUp,
  Wine,
  FileText,
  FileDown,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ATTENDANCE_STATUS,
  formatDate,
  formatHours,
  formatNumber,
  formatTRY,
  monthEndIso,
  monthLabel,
  monthStr,
} from "@/lib/utils";
import type { Department, Employee } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  exportAttendanceXlsx,
  exportPayrollXlsx,
  exportLeavesXlsx,
} from "@/lib/export";
import { exportGenericTablePdf, exportPayrollSummaryPdf } from "@/lib/pdf";

interface Props {
  employees: Employee[];
  departments: Department[];
}

export function ReportsClient({ employees, departments }: Props) {
  return (
    <Tabs defaultValue="monthly">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="monthly">Aylık Puantaj</TabsTrigger>
        <TabsTrigger value="employee">Personel Yıllık</TabsTrigger>
        <TabsTrigger value="department">Departman</TabsTrigger>
        <TabsTrigger value="late">Geç Kalma</TabsTrigger>
        <TabsTrigger value="overtime">Mesai</TabsTrigger>
        <TabsTrigger value="tips">Bahşiş</TabsTrigger>
        <TabsTrigger value="payslips">Bordro Arşivi</TabsTrigger>
      </TabsList>

      <TabsContent value="monthly" className="mt-4">
        <MonthlyAttendanceReport employees={employees} />
      </TabsContent>

      <TabsContent value="employee" className="mt-4">
        <EmployeeYearlyReport employees={employees} />
      </TabsContent>

      <TabsContent value="department" className="mt-4">
        <DepartmentReport departments={departments} />
      </TabsContent>

      <TabsContent value="late" className="mt-4">
        <LateReport employees={employees} />
      </TabsContent>

      <TabsContent value="overtime" className="mt-4">
        <OvertimeReport employees={employees} />
      </TabsContent>

      <TabsContent value="tips" className="mt-4">
        <TipsReport employees={employees} />
      </TabsContent>

      <TabsContent value="payslips" className="mt-4">
        <PayslipsArchive />
      </TabsContent>
    </Tabs>
  );
}

function ReportShell({
  title,
  description,
  icon: Icon,
  controls,
  onRun,
  loading,
  children,
}: {
  title: string;
  description: string;
  icon: any;
  controls: React.ReactNode;
  onRun: () => void;
  loading: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cherry-100 rounded-md">
            <Icon className="h-5 w-5 text-cherry-700" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="text-sm text-ink-600">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-end">
          {controls}
          <Button onClick={onRun} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Önizle
          </Button>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function MonthlyAttendanceReport({ employees }: { employees: Employee[] }) {
  const [month, setMonth] = useState(monthStr());
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const monthEnd = monthEndIso(month);
      const { data, error } = await supabase
        .from("attendance")
        .select("*, employee:employees(*, department:departments(*)), shift:shifts(*)")
        .gte("work_date", month + "-01")
        .lte("work_date", monthEnd)
        .order("work_date");
      if (error) throw error;
      setData(data || []);
    } catch (e: any) {
      toast.error(e?.message || "Hata");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ReportShell
      title="Aylık Puantaj Raporu"
      description="Tüm personelin aylık puantaj kayıtları"
      icon={CalendarCheck}
      loading={loading}
      onRun={run}
      controls={
        <div className="space-y-2">
          <Label>Ay</Label>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
      }
    >
      {data && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-ink-600">{data.length} kayıt — {monthLabel(month)}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => exportAttendanceXlsx(data as any, month)}>
                <FileDown className="h-4 w-4" />
                Excel
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  exportGenericTablePdf(
                    "Aylik Puantaj Raporu",
                    monthLabel(month),
                    ["Tarih", "Personel", "Departman", "Vardiya", "Gelis", "Cikis", "Calisilan", "Durum"],
                    data.map((a: any) => [
                      formatDate(a.work_date),
                      a.employee?.full_name || "",
                      a.employee?.department?.name || "",
                      a.shift?.name || "",
                      a.check_in?.slice(0, 5) || "-",
                      a.check_out?.slice(0, 5) || "-",
                      formatNumber(a.worked_hours, 2),
                      ATTENDANCE_STATUS[a.status]?.label || a.status,
                    ]),
                    `aylik-puantaj-${month}.pdf`
                  )
                }
              >
                <FileDown className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
          <div className="max-h-96 overflow-auto border border-cream-300 rounded-sm">
            <table className="w-full text-xs">
              <thead className="bg-cream-100 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2">Tarih</th>
                  <th className="text-left px-3 py-2">Personel</th>
                  <th className="text-left px-3 py-2">Vardiya</th>
                  <th className="text-right px-3 py-2">Saat</th>
                  <th className="text-left px-3 py-2">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {data.slice(0, 100).map((a: any) => (
                  <tr key={a.id}>
                    <td className="px-3 py-2 font-mono">{formatDate(a.work_date)}</td>
                    <td className="px-3 py-2">{a.employee?.full_name}</td>
                    <td className="px-3 py-2">{a.shift?.name || "—"}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatNumber(a.worked_hours, 2)}</td>
                    <td className="px-3 py-2">{ATTENDANCE_STATUS[a.status]?.label || a.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length > 100 && (
              <p className="text-xs text-ink-600 p-2 text-center">İlk 100 kayıt gösteriliyor — tamamı için indirin</p>
            )}
          </div>
        </div>
      )}
    </ReportShell>
  );
}

function EmployeeYearlyReport({ employees }: { employees: Employee[] }) {
  const [empId, setEmpId] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!empId) {
      toast.error("Personel seçin");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const start = `${year}-01-01`;
      const end = `${year}-12-31`;
      const [att, payroll] = await Promise.all([
        supabase.from("attendance").select("*").eq("employee_id", empId).gte("work_date", start).lte("work_date", end),
        supabase
          .from("monthly_payroll")
          .select("*")
          .eq("employee_id", empId)
          .gte("payroll_month", `${year}-01`)
          .lte("payroll_month", `${year}-12`),
      ]);
      const totalWorkedHours = (att.data || []).reduce((s, a: any) => s + Number(a.worked_hours || 0), 0);
      const totalOvertime = (att.data || []).reduce((s, a: any) => s + Number(a.overtime_hours || 0), 0);
      const totalLate = (att.data || []).reduce((s, a: any) => s + (a.late_minutes || 0), 0);
      const presentDays = (att.data || []).filter((a: any) => a.status === "present").length;
      const totalNet = (payroll.data || []).reduce((s, p: any) => s + Number(p.net_salary || 0), 0);
      setData({ att: att.data, payroll: payroll.data, totalWorkedHours, totalOvertime, totalLate, presentDays, totalNet });
    } catch (e: any) {
      toast.error(e?.message || "Hata");
    } finally {
      setLoading(false);
    }
  };

  const employee = employees.find((e) => e.id === empId);

  return (
    <ReportShell
      title="Personel Yıllık Özet"
      description="Bir personelin yıllık çalışma ve maaş özeti"
      icon={UserCheck}
      loading={loading}
      onRun={run}
      controls={
        <>
          <div className="space-y-2 flex-1 min-w-[200px]">
            <Label>Personel</Label>
            <Select value={empId} onValueChange={setEmpId}>
              <SelectTrigger><SelectValue placeholder="Personel seç" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Yıl</Label>
            <Input value={year} onChange={(e) => setYear(e.target.value)} type="number" min="2020" max="2099" />
          </div>
        </>
      }
    >
      {data && employee && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stat label="Çalışılan Gün" value={data.presentDays} />
            <Stat label="Toplam Saat" value={formatHours(data.totalWorkedHours)} />
            <Stat label="Mesai Saat" value={formatHours(data.totalOvertime)} />
            <Stat label="Geç (dk)" value={data.totalLate} />
            <Stat label="Toplam Net" value={formatTRY(data.totalNet)} highlight />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              exportGenericTablePdf(
                "Personel Yillik Ozet",
                `${employee.full_name} - ${year}`,
                ["Ay", "Calisilan Gun", "Toplam Saat", "Mesai", "NET Maas"],
                (data.payroll || []).map((p: any) => [
                  monthLabel(p.payroll_month),
                  p.worked_days,
                  formatNumber(p.total_worked_hours, 2),
                  formatNumber(p.overtime_hours, 2),
                  formatTRY(p.net_salary),
                ]),
                `yillik-${employee.full_name.replace(/\s+/g, "-")}-${year}.pdf`,
                "portrait"
              )
            }
          >
            <FileDown className="h-4 w-4" />
            PDF
          </Button>
        </div>
      )}
    </ReportShell>
  );
}

function Stat({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) {
  return (
    <div className={`rounded-sm p-3 ${highlight ? "bg-cherry-900 text-cream-50" : "bg-cream-100"}`}>
      <p className={`text-xs ${highlight ? "text-cream-300" : "text-ink-600"}`}>{label}</p>
      <p className={`font-mono font-semibold ${highlight ? "text-cream-50" : "text-ink-900"}`}>{value}</p>
    </div>
  );
}

function DepartmentReport({ departments }: { departments: Department[] }) {
  const [month, setMonth] = useState(monthStr());
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const start = month + "-01";
      const end = monthEndIso(month);
      const [att, emp] = await Promise.all([
        supabase
          .from("attendance")
          .select("*, employee:employees(department_id, monthly_salary, hourly_overtime_rate)")
          .gte("work_date", start)
          .lte("work_date", end),
        supabase.from("employees").select("*").eq("is_active", true),
      ]);

      const result = departments.map((d) => {
        const empOfDept = (emp.data || []).filter((e: any) => e.department_id === d.id);
        const attOfDept = (att.data || []).filter((a: any) => a.employee?.department_id === d.id);
        const totalHours = attOfDept.reduce((s, a: any) => s + Number(a.worked_hours || 0), 0);
        const totalOT = attOfDept.reduce((s, a: any) => s + Number(a.overtime_hours || 0), 0);
        const presentDays = attOfDept.filter((a: any) => a.status === "present").length;
        const monthlyCost = empOfDept.reduce((s, e: any) => s + Number(e.monthly_salary || 0), 0);
        return {
          name: d.name,
          color: d.color,
          empCount: empOfDept.length,
          totalHours,
          totalOT,
          presentDays,
          monthlyCost,
        };
      });
      setData(result);
    } catch (e: any) {
      toast.error(e?.message || "Hata");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ReportShell
      title="Departman Performansı"
      description="Departman bazında toplam saat, devam ve maliyet"
      icon={Building2}
      loading={loading}
      onRun={run}
      controls={
        <div className="space-y-2">
          <Label>Ay</Label>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
      }
    >
      {data && (
        <div>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              exportGenericTablePdf(
                "Departman Performans",
                monthLabel(month),
                ["Departman", "Personel", "Calisilan Gun", "Toplam Saat", "Mesai Saat", "Aylik Maliyet"],
                data.map((r: any) => [
                  r.name,
                  r.empCount,
                  r.presentDays,
                  formatNumber(r.totalHours, 2),
                  formatNumber(r.totalOT, 2),
                  formatTRY(r.monthlyCost),
                ]),
                `departman-${month}.pdf`
              )
            }
            className="mb-3"
          >
            <FileDown className="h-4 w-4" />
            PDF
          </Button>
          <table className="w-full text-sm">
            <thead className="bg-cream-100 text-xs">
              <tr>
                <th className="text-left px-3 py-2">Departman</th>
                <th className="text-right px-3 py-2">Personel</th>
                <th className="text-right px-3 py-2">Çalışılan Gün</th>
                <th className="text-right px-3 py-2">Toplam Saat</th>
                <th className="text-right px-3 py-2">Mesai</th>
                <th className="text-right px-3 py-2">Aylık Maliyet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {data.map((r: any) => (
                <tr key={r.name}>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                      {r.name}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{r.empCount}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.presentDays}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatNumber(r.totalHours, 2)}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatNumber(r.totalOT, 2)}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-cherry-700">
                    {formatTRY(r.monthlyCost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReportShell>
  );
}

function LateReport({ employees }: { employees: Employee[] }) {
  const [month, setMonth] = useState(monthStr());
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const start = month + "-01";
      const end = monthEndIso(month);
      const { data, error } = await supabase
        .from("attendance")
        .select("employee_id, late_minutes")
        .gte("work_date", start)
        .lte("work_date", end);
      if (error) throw error;
      const map = new Map<string, { total: number; days: number }>();
      for (const a of data || []) {
        if ((a as any).late_minutes > 0) {
          const c = map.get((a as any).employee_id) || { total: 0, days: 0 };
          c.total += (a as any).late_minutes;
          c.days += 1;
          map.set((a as any).employee_id, c);
        }
      }
      const result = Array.from(map.entries())
        .map(([id, v]) => ({
          employee: employees.find((e) => e.id === id),
          ...v,
        }))
        .filter((r) => r.employee)
        .sort((a, b) => b.total - a.total);
      setData(result);
    } catch (e: any) {
      toast.error(e?.message || "Hata");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ReportShell
      title="Geç Kalma Raporu"
      description="Kim ne kadar geç kalmış"
      icon={Clock}
      loading={loading}
      onRun={run}
      controls={
        <div className="space-y-2">
          <Label>Ay</Label>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
      }
    >
      {data && data.length > 0 && (
        <table className="w-full text-sm">
          <thead className="bg-cream-100 text-xs">
            <tr>
              <th className="text-left px-3 py-2">Personel</th>
              <th className="text-right px-3 py-2">Geç Kaldığı Gün</th>
              <th className="text-right px-3 py-2">Toplam Dk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-200">
            {data.map((r: any) => (
              <tr key={r.employee.id}>
                <td className="px-3 py-2">{r.employee.full_name}</td>
                <td className="px-3 py-2 text-right font-mono">{r.days}</td>
                <td className="px-3 py-2 text-right font-mono text-warning">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data && data.length === 0 && (
        <p className="text-sm text-ink-600 text-center py-6">Bu ay için geç kalma kaydı yok 🎉</p>
      )}
    </ReportShell>
  );
}

function OvertimeReport({ employees }: { employees: Employee[] }) {
  const [month, setMonth] = useState(monthStr());
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const start = month + "-01";
      const end = monthEndIso(month);
      const { data, error } = await supabase
        .from("attendance")
        .select("employee_id, overtime_hours")
        .gte("work_date", start)
        .lte("work_date", end);
      if (error) throw error;
      const map = new Map<string, number>();
      for (const a of data || []) {
        const ot = Number((a as any).overtime_hours || 0);
        if (ot > 0) {
          map.set((a as any).employee_id, (map.get((a as any).employee_id) || 0) + ot);
        }
      }
      const result = Array.from(map.entries())
        .map(([id, v]) => {
          const e = employees.find((x) => x.id === id);
          return {
            employee: e,
            hours: v,
            amount: v * Number(e?.hourly_overtime_rate || 0),
          };
        })
        .filter((r) => r.employee)
        .sort((a, b) => b.hours - a.hours);
      setData(result);
    } catch (e: any) {
      toast.error(e?.message || "Hata");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ReportShell
      title="Mesai Raporu"
      description="Kim ne kadar fazla mesai yapmış"
      icon={TrendingUp}
      loading={loading}
      onRun={run}
      controls={
        <div className="space-y-2">
          <Label>Ay</Label>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
      }
    >
      {data && data.length > 0 && (
        <table className="w-full text-sm">
          <thead className="bg-cream-100 text-xs">
            <tr>
              <th className="text-left px-3 py-2">Personel</th>
              <th className="text-right px-3 py-2">Mesai Saat</th>
              <th className="text-right px-3 py-2">Tutar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-200">
            {data.map((r: any) => (
              <tr key={r.employee.id}>
                <td className="px-3 py-2">{r.employee.full_name}</td>
                <td className="px-3 py-2 text-right font-mono">{formatNumber(r.hours, 2)}</td>
                <td className="px-3 py-2 text-right font-mono text-success">+ {formatTRY(r.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data && data.length === 0 && (
        <p className="text-sm text-ink-600 text-center py-6">Bu ay için mesai kaydı yok</p>
      )}
    </ReportShell>
  );
}

function TipsReport({ employees }: { employees: Employee[] }) {
  const [month, setMonth] = useState(monthStr());
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const start = month + "-01";
      const end = monthEndIso(month);
      const { data, error } = await supabase
        .from("tips_distribution")
        .select("*, pool:tips_pool(*)")
        .gte("pool.pool_date", start)
        .lte("pool.pool_date", end);
      if (error) throw error;
      const map = new Map<string, number>();
      for (const t of data || []) {
        if ((t as any).pool?.pool_date >= start && (t as any).pool?.pool_date <= end) {
          map.set((t as any).employee_id, (map.get((t as any).employee_id) || 0) + Number((t as any).amount));
        }
      }
      const result = Array.from(map.entries())
        .map(([id, v]) => ({
          employee: employees.find((e) => e.id === id),
          amount: v,
        }))
        .filter((r) => r.employee)
        .sort((a, b) => b.amount - a.amount);
      setData(result);
    } catch (e: any) {
      toast.error(e?.message || "Hata");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ReportShell
      title="Bahşiş Raporu"
      description="Aylık personel bazında bahşiş dağılımı"
      icon={Wine}
      loading={loading}
      onRun={run}
      controls={
        <div className="space-y-2">
          <Label>Ay</Label>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
      }
    >
      {data && data.length > 0 && (
        <table className="w-full text-sm">
          <thead className="bg-cream-100 text-xs">
            <tr>
              <th className="text-left px-3 py-2">Personel</th>
              <th className="text-right px-3 py-2">Toplam Bahşiş</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-200">
            {data.map((r: any) => (
              <tr key={r.employee.id}>
                <td className="px-3 py-2">{r.employee.full_name}</td>
                <td className="px-3 py-2 text-right font-mono text-cherry-700 font-semibold">
                  {formatTRY(r.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ReportShell>
  );
}

function PayslipsArchive() {
  const [month, setMonth] = useState(monthStr());
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("monthly_payroll")
        .select("*, employee:employees(*, department:departments(*))")
        .eq("payroll_month", month)
        .order("created_at");
      if (error) throw error;
      setData(data || []);
    } catch (e: any) {
      toast.error(e?.message || "Hata");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ReportShell
      title="Bordro Arşivi"
      description="Geçmiş ayların bordrolarını indirin"
      icon={FileText}
      loading={loading}
      onRun={run}
      controls={
        <div className="space-y-2">
          <Label>Ay</Label>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
      }
    >
      {data && data.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-ink-600">{data.length} bordro</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => exportPayrollXlsx(data as any, month)}>
                <FileDown className="h-4 w-4" />
                Excel
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportPayrollSummaryPdf(data as any, month)}>
                <FileDown className="h-4 w-4" />
                Toplu PDF
              </Button>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-cream-100 text-xs">
              <tr>
                <th className="text-left px-3 py-2">Personel</th>
                <th className="text-right px-3 py-2">NET</th>
                <th className="text-left px-3 py-2">Durum</th>
                <th className="text-left px-3 py-2">Ödeme Tarihi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {data.map((p: any) => (
                <tr key={p.id}>
                  <td className="px-3 py-2">{p.employee?.full_name}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-cherry-800">
                    {formatTRY(p.net_salary)}
                  </td>
                  <td className="px-3 py-2">
                    {p.is_paid ? (
                      <span className="text-success">Ödendi</span>
                    ) : (
                      <span className="text-warning">Bekliyor</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-ink-600">{formatDate(p.payment_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReportShell>
  );
}
