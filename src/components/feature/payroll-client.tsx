"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calculator,
  ChevronLeft,
  ChevronRight,
  Save,
  FileDown,
  Eye,
  CheckCircle2,
  Loader2,
  Banknote,
  Pencil,
  Printer,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  PAYMENT_METHODS,
  formatNumber,
  formatTRY,
  monthLabel,
} from "@/lib/utils";
import type {
  Advance,
  AppSettings,
  Attendance,
  Employee,
  Leave,
  MonthlyPayroll,
  TipsDistribution,
} from "@/lib/types";
import { computePayrollForMonth, type PayrollComputed } from "@/lib/payroll";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { exportPayrollXlsx } from "@/lib/export";
import { exportPayrollSummaryPdf, exportPayslipPdf } from "@/lib/pdf";

interface Props {
  month: string;
  employees: Employee[];
  attendance: Attendance[];
  leaves: Leave[];
  advances: Advance[];
  tips: TipsDistribution[];
  existingPayroll: MonthlyPayroll[];
  settings: AppSettings;
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function PayrollClient({
  month,
  employees,
  attendance,
  leaves,
  advances,
  tips,
  existingPayroll,
  settings,
}: Props) {
  const router = useRouter();
  const [computed, setComputed] = useState<PayrollComputed[]>([]);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<PayrollComputed | null>(null);
  const [paying, setPaying] = useState<MonthlyPayroll | null>(null);
  const [editing, setEditing] = useState<PayrollComputed | null>(null);

  const goMonth = (delta: number) => {
    const next = shiftMonth(month, delta);
    router.push(`/maas?month=${next}`);
  };

  const compute = () => {
    const result = computePayrollForMonth({
      employees,
      attendance,
      leaves,
      advances,
      tips,
      settings,
      month,
    });
    setComputed(result);
    toast.success(`${result.length} personel için hesap yapıldı (taslak — kaydetmeyi unutmayın)`);
  };

  // Mevcut payroll kayıtlarını computed'a entegre et (override)
  const rows = useMemo<(PayrollComputed | (MonthlyPayroll & Partial<PayrollComputed>))[]>(() => {
    if (computed.length > 0) {
      // Ödeme durumu DB'den; tutarlar her zaman taze hesaptan (eski kayıt üzerine yazılmasın)
      return computed.map((c) => {
        const existing = existingPayroll.find((p) => p.employee_id === c.employee_id);
        if (!existing) return c;
        return {
          ...c,
          id: existing.id,
          is_paid: existing.is_paid,
          payment_date: existing.payment_date,
          payment_method: existing.payment_method,
          notes: existing.notes ?? c.notes,
          employee: c.employee,
        };
      });
    }
    // Sadece veritabanından
    return existingPayroll.map((p) => ({
      ...p,
      employee: employees.find((e) => e.id === p.employee_id),
      daily_rate: 0,
      hourly_rate: 0,
      late_minutes_total: 0,
      unpaid_leave_days: 0,
      period_accrued_gross: Number(p.base_salary || 0),
    }));
  }, [computed, existingPayroll, employees]);

  const saveAll = async () => {
    if (computed.length === 0) {
      toast.error("Önce hesaplayın");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const payload = computed.map((c) => ({
        employee_id: c.employee_id,
        payroll_month: c.payroll_month,
        base_salary: c.base_salary,
        worked_days: c.worked_days,
        total_worked_hours: c.total_worked_hours,
        overtime_hours: c.overtime_hours,
        overtime_amount: c.overtime_amount,
        late_deductions: c.late_deductions,
        absent_deductions: c.absent_deductions,
        unpaid_leave_deductions: c.unpaid_leave_deductions,
        advance_deductions: c.advance_deductions,
        tips_amount: c.tips_amount,
        bonus: c.bonus,
        net_salary: c.net_salary,
        is_paid: false,
      }));
      const { error } = await supabase
        .from("monthly_payroll")
        .upsert(payload, { onConflict: "employee_id,payroll_month" });
      if (error) throw error;
      toast.success("Bordro kayıtları kaydedildi");
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Hata");
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async (data: {
    payroll: MonthlyPayroll;
    payment_date: string;
    payment_method: string;
    notes?: string;
  }) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("monthly_payroll")
        .update({
          is_paid: true,
          payment_date: data.payment_date,
          payment_method: data.payment_method,
          notes: data.notes || null,
        })
        .eq("id", data.payroll.id);
      if (error) throw error;

      // Bağlı avansları işaretle
      await supabase
        .from("advances")
        .update({ is_deducted: true, deducted_in_month: month })
        .eq("employee_id", data.payroll.employee_id)
        .eq("is_deducted", false);

      // Tips ödendi
      await supabase
        .from("tips_distribution")
        .update({ is_paid: true, paid_in_month: month })
        .eq("employee_id", data.payroll.employee_id)
        .eq("is_paid", false);

      toast.success("Bordro ödendi olarak işaretlendi");
      setPaying(null);
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Hata");
    }
  };

  const totals = useMemo(() => {
    const arr = rows;
    return {
      base: arr.reduce((s, r) => s + Number(r.base_salary || 0), 0),
      net: arr.reduce((s, r) => s + Number(r.net_salary || 0), 0),
      overtime: arr.reduce((s, r) => s + Number(r.overtime_amount || 0), 0),
      tips: arr.reduce((s, r) => s + Number(r.tips_amount || 0), 0),
      deductions: arr.reduce(
        (s, r) =>
          s +
          Number(r.absent_deductions || 0) +
          Number(r.late_deductions || 0) +
          Number(r.unpaid_leave_deductions || 0) +
          Number(r.advance_deductions || 0),
        0
      ),
    };
  }, [rows]);

  return (
    <>
      {/* Toolbar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => goMonth(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Input
                type="month"
                value={month}
                onChange={(e) => router.push(`/maas?month=${e.target.value}`)}
                className="w-44 font-mono"
              />
              <Button variant="outline" size="icon" onClick={() => goMonth(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <p className="font-serif text-lg text-cherry-800 ml-2 hidden md:block">
                {monthLabel(month)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => exportPayrollXlsx(rows as any, month)}>
                <FileDown className="h-4 w-4" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportPayrollSummaryPdf(rows as any, month)}>
                <FileDown className="h-4 w-4" />
                Toplu PDF
              </Button>
              <Button onClick={saveAll} disabled={saving || computed.length === 0} variant="outline">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Kaydet
              </Button>
              <Button onClick={compute} size="lg">
                <Calculator className="h-4 w-4" />
                Maaşları Hesapla
              </Button>
            </div>
          </div>

          <p className="mt-3 text-xs text-ink-600">
            Günlük kazanım <strong>maktu maaş ÷ {settings.monthly_work_days}</strong>. Kesinti yalnızca{" "}
            <strong>iş günlerinde</strong> yapılır: <strong>Pazar</strong> ile{" "}
            <strong>resmi tatiller</strong> maaşa dahil kabul edilir, gelinmedi diye düşmez. İş gününde puantaj
            yok veya &quot;gelmedi&quot; ise ücret kesilir. Ücretli izin kayıtlı günlerde kesinti olmaz; ücretsiz
            iş günü izni ayrıca kesilir. Resmi tatilde puantaja <strong>&quot;geldi&quot;</strong> ise yasal 2 kat
            kapsamında <strong>+1 günlük ücret</strong> kadar Prim (tabloda) eklenir.{" "}
            <strong>Ay bitmeden</strong> hesaplama yapıyorsanız net maaş, tam aylık brüt yerine{" "}
            <strong>geçen iş günü × günlük ücret</strong> tavanına göre hesaplanır (ay sonunda tavan tam maaşa
            çıkar). Resmi tatil takvimi paket verisine dayanır.
          </p>

          {rows.length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
              <div className="bg-cream-100 rounded-sm p-3">
                <p className="text-ink-600">Brüt Toplam</p>
                <p className="font-mono font-semibold text-ink-900">{formatTRY(totals.base)}</p>
              </div>
              <div className="bg-cream-100 rounded-sm p-3">
                <p className="text-ink-600">Mesai</p>
                <p className="font-mono font-semibold text-success">+ {formatTRY(totals.overtime)}</p>
              </div>
              <div className="bg-cream-100 rounded-sm p-3">
                <p className="text-ink-600">Bahşiş</p>
                <p className="font-mono font-semibold text-success">+ {formatTRY(totals.tips)}</p>
              </div>
              <div className="bg-cream-100 rounded-sm p-3">
                <p className="text-ink-600">Kesinti</p>
                <p className="font-mono font-semibold text-danger">- {formatTRY(totals.deductions)}</p>
              </div>
              <div className="bg-cherry-900 text-cream-50 rounded-sm p-3">
                <p className="text-cream-300">NET TOPLAM</p>
                <p className="font-mono font-bold text-base">{formatTRY(totals.net)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tablo */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {rows.length === 0 ? (
            <div className="py-16 text-center">
              <Banknote className="h-12 w-12 text-cherry-700/50 mx-auto mb-3" />
              <p className="font-serif text-xl text-ink-900">Bordro hesaplanmadı</p>
              <p className="text-sm text-ink-600 mt-1 mb-4">
                Bu ay için bordro oluşturmak amacıyla "Maaşları Hesapla" butonuna tıklayın.
              </p>
              <Button onClick={compute} size="lg">
                <Calculator className="h-4 w-4" />
                Maaşları Hesapla
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm min-w-[1180px]">
              <thead className="bg-cream-100 text-ink-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Personel</th>
                  <th className="text-right px-2 py-3">Brüt</th>
                  <th className="text-right px-2 py-3">Mesai</th>
                  <th className="text-right px-2 py-3">Bahşiş</th>
                  <th className="text-right px-2 py-3">Prim (Resmi tat.)</th>
                  <th className="text-right px-2 py-3">Devam(-)</th>
                  <th className="text-right px-2 py-3">Ücr.İzin(-)</th>
                  <th className="text-right px-2 py-3">Geç(-)</th>
                  <th className="text-right px-2 py-3">Avans(-)</th>
                  <th className="text-right px-3 py-3">NET</th>
                  <th className="text-center px-2 py-3">Durum</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {rows.map((r: any) => (
                  <tr key={r.employee_id} className="hover:bg-cream-50">
                    <td className="px-4 py-3 font-medium text-ink-900">
                      {r.employee?.full_name || "—"}
                      {r.employee?.position && (
                        <span className="block text-xs text-ink-600">{r.employee.position}</span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-right font-mono">{formatTRY(r.base_salary)}</td>
                    <td className="px-2 py-3 text-right font-mono text-success">
                      {Number(r.overtime_amount) > 0 ? "+ " : ""}{formatTRY(r.overtime_amount)}
                    </td>
                    <td className="px-2 py-3 text-right font-mono text-success">
                      {Number(r.tips_amount) > 0 ? "+ " : ""}{formatTRY(r.tips_amount)}
                    </td>
                    <td className="px-2 py-3 text-right font-mono">{formatTRY(r.bonus)}</td>
                    <td className="px-2 py-3 text-right font-mono text-danger">
                      {Number(r.absent_deductions) > 0 ? "- " : ""}{formatTRY(r.absent_deductions)}
                    </td>
                    <td className="px-2 py-3 text-right font-mono text-danger">
                      {Number(r.unpaid_leave_deductions) > 0 ? "- " : ""}
                      {formatTRY(r.unpaid_leave_deductions)}
                    </td>
                    <td className="px-2 py-3 text-right font-mono text-danger">
                      {Number(r.late_deductions) > 0 ? "- " : ""}{formatTRY(r.late_deductions)}
                    </td>
                    <td className="px-2 py-3 text-right font-mono text-danger">
                      {Number(r.advance_deductions) > 0 ? "- " : ""}{formatTRY(r.advance_deductions)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-cherry-800 text-base">
                      {formatTRY(r.net_salary)}
                    </td>
                    <td className="px-2 py-3 text-center">
                      {r.is_paid ? (
                        <Badge variant="success">Ödendi</Badge>
                      ) : (
                        <Badge variant="warning">Bekliyor</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDetail(r)}
                          title="Detay"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => exportPayslipPdf(r as any, settings.restaurant_name)}
                          title="Bordro PDF"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        {!r.is_paid && r.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPaying(r as any)}
                            title="Ödendi olarak işaretle"
                            className="text-success hover:bg-green-50"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Detay modal */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bordro Detayı</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <p className="text-ink-600">
                {detail.employee?.full_name} · {monthLabel(detail.payroll_month)}
              </p>
              <div className="bg-cream-100 rounded-sm p-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-ink-600">Çalışılan Gün</p>
                  <p className="font-mono">{detail.worked_days}</p>
                </div>
                <div>
                  <p className="text-ink-600">Çalışılan Saat</p>
                  <p className="font-mono">{formatNumber(detail.total_worked_hours)}</p>
                </div>
                <div>
                  <p className="text-ink-600">Mesai Saat</p>
                  <p className="font-mono">{formatNumber(detail.overtime_hours)}</p>
                </div>
                <div>
                  <p className="text-ink-600">Geç Toplam (dk)</p>
                  <p className="font-mono">{detail.late_minutes_total}</p>
                </div>
                <div>
                  <p className="text-ink-600">Günlük Ücret</p>
                  <p className="font-mono">{formatTRY(detail.daily_rate)}</p>
                </div>
                <div>
                  <p className="text-ink-600">Saatlik Ücret</p>
                  <p className="font-mono">{formatTRY(detail.hourly_rate)}</p>
                </div>
                <div className="col-span-2 mt-1 pt-2 border-t border-cream-300 space-y-1">
                  <p className="text-ink-600">Bu dönem hak ediş tavanı (maaş/30 × geçen iş günü)</p>
                  <p className="font-mono font-semibold text-cherry-800">
                    {formatTRY(Number(detail.period_accrued_gross ?? detail.base_salary))}
                  </p>
                  <p className="text-ink-600 pt-1">Hak edilen brüt (devamsızlık & ücretsiz izin sonrası)</p>
                  <p className="font-mono font-semibold text-ink-900">
                    {formatTRY(
                      Math.max(
                        0,
                        Number(detail.period_accrued_gross ?? detail.base_salary) -
                          Number(detail.absent_deductions) -
                          Number(detail.unpaid_leave_deductions)
                      )
                    )}
                  </p>
                </div>
              </div>
              <div className="space-y-1 text-sm border-t pt-2">
                <Row label="Brüt Maaş" value={formatTRY(detail.base_salary)} />
                <Row label="Mesai" value={`+ ${formatTRY(detail.overtime_amount)}`} positive />
                <Row label="Bahşiş" value={`+ ${formatTRY(detail.tips_amount)}`} positive />
                <Row label="Prim (Resmi tatil)" value={`+ ${formatTRY(detail.bonus)}`} positive />
                <Row label="Devamsızlık" value={`- ${formatTRY(detail.absent_deductions)}`} negative />
                <Row label="Geç Kalma" value={`- ${formatTRY(detail.late_deductions)}`} negative />
                <Row label="Ücretsiz İzin" value={`- ${formatTRY(detail.unpaid_leave_deductions)}`} negative />
                <Row label="Avans" value={`- ${formatTRY(detail.advance_deductions)}`} negative />
              </div>
              <div className="bg-cherry-900 text-cream-50 rounded-sm px-4 py-3 flex items-center justify-between">
                <span className="font-medium">NET MAAŞ</span>
                <span className="font-mono font-bold text-lg">{formatTRY(detail.net_salary)}</span>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => detail && exportPayslipPdf(detail as any, settings.restaurant_name)}
            >
              <Printer className="h-4 w-4" />
              Bordro PDF
            </Button>
            <Button onClick={() => setDetail(null)}>Kapat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ödeme modal */}
      {paying && (
        <PayDialog
          payroll={paying}
          onClose={() => setPaying(null)}
          onConfirm={markPaid}
        />
      )}
    </>
  );
}

function Row({
  label,
  value,
  positive,
  negative,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-600">{label}</span>
      <span
        className={`font-mono ${positive ? "text-success" : negative ? "text-danger" : "text-ink-900"}`}
      >
        {value}
      </span>
    </div>
  );
}

function PayDialog({
  payroll,
  onClose,
  onConfirm,
}: {
  payroll: MonthlyPayroll;
  onClose: () => void;
  onConfirm: (data: {
    payroll: MonthlyPayroll;
    payment_date: string;
    payment_method: string;
    notes?: string;
  }) => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("bank");
  const [notes, setNotes] = useState("");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ödendi olarak işaretle</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-ink-600">
            Net <strong className="text-cherry-700">{formatTRY(payroll.net_salary)}</strong>{" "}
            tutarındaki bordro ödendi olarak işaretlenecek. Bağlı avans ve bahşişler de
            otomatik kapatılacak.
          </p>
          <div className="space-y-2">
            <Label>Ödeme Tarihi</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Ödeme Yöntemi</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Not (opsiyonel)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>İptal</Button>
          <Button
            onClick={() =>
              onConfirm({ payroll, payment_date: date, payment_method: method, notes })
            }
          >
            <CheckCircle2 className="h-4 w-4" />
            Onayla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
