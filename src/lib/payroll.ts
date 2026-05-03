import type {
  Advance,
  AppSettings,
  Attendance,
  Employee,
  Leave,
  MonthlyPayroll,
  TipsDistribution,
} from "./types";

export interface PayrollInput {
  employees: Employee[];
  attendance: Attendance[];
  leaves: Leave[];
  advances: Advance[];
  tips: TipsDistribution[];
  settings: AppSettings;
  month: string; // YYYY-MM
}

export interface PayrollComputed extends Omit<MonthlyPayroll, "id" | "created_at" | "updated_at"> {
  // helper fields for UI
  daily_rate: number;
  hourly_rate: number;
  late_minutes_total: number;
  unpaid_leave_days: number;
}

export function computePayrollForMonth(input: PayrollInput): PayrollComputed[] {
  const { employees, attendance, leaves, advances, tips, settings, month } = input;
  const monthStart = month + "-01";
  const lastDay = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5, 7)),
    0
  ).getDate();
  const monthEnd = `${month}-${String(lastDay).padStart(2, "0")}`;
  const today = new Date().toISOString().slice(0, 10);

  return employees.map((e) => {
    // Personelin bu aydaki "geçerli aralığı": işe başlama / ayrılma + ay sonu / bugün ile sınırlı
    const empStart = e.start_date && e.start_date > monthStart ? e.start_date : monthStart;
    const empEndRaw = e.end_date && e.end_date < monthEnd ? e.end_date : monthEnd;
    // Geleceği maaş hesabına dahil etme — bugüne kadar olan günleri say
    const empEnd = empEndRaw > today ? today : empEndRaw;

    // O personel için ay içindeki "beklenen iş günleri" (her gün açık restoran varsayımı)
    const expectedDaysInRange = Math.max(
      0,
      diffDays(empStart, empEnd) + 1
    );
    const monthlyWorkDays = Math.max(1, settings.monthly_work_days);
    // Aylık baz: 30 (settings) gün üzerinden günlük ücret
    const dailyRate = Number(e.monthly_salary) / monthlyWorkDays;
    const hourlyRate = dailyRate / Math.max(1, settings.daily_work_hours);
    const minuteRate = hourlyRate / 60;

    const empAtt = attendance.filter(
      (a) =>
        a.employee_id === e.id &&
        a.work_date >= empStart &&
        a.work_date <= empEnd
    );

    const presentDays = empAtt.filter(
      (a) => a.status === "present" || a.status === "leave" || a.status === "sick"
    ).length;
    const explicitAbsentDays = empAtt.filter((a) => a.status === "absent").length;
    const totalWorkedHours = empAtt.reduce(
      (s, a) => s + Number(a.worked_hours || 0),
      0
    );
    const overtimeHours = empAtt.reduce(
      (s, a) => s + Number(a.overtime_hours || 0),
      0
    );
    const lateMinutesTotal = empAtt.reduce(
      (s, a) => s + (a.late_minutes || 0),
      0
    );

    // Ücretsiz izin gün sayısı (ay aralığı ile kesişim)
    const empLeaves = leaves.filter((l) => l.employee_id === e.id);
    let unpaidLeaveDays = 0;
    let paidLeaveDays = 0;
    for (const l of empLeaves) {
      const ls = l.start_date < empStart ? empStart : l.start_date;
      const le = l.end_date > empEnd ? empEnd : l.end_date;
      if (ls > le) continue;
      const days = diffDays(ls, le) + 1;
      if (l.is_paid) paidLeaveDays += days;
      else unpaidLeaveDays += days;
    }

    // 🔑 Vianor: kayıt olmayan günleri de devamsızlık say (oransal maaş)
    // missingDays = beklenen - (puantajı girilmiş günler) - (izin günleri)
    const recordedAttendanceDays = empAtt.length;
    const missingDays = Math.max(
      0,
      expectedDaysInRange -
        recordedAttendanceDays -
        paidLeaveDays -
        unpaidLeaveDays
    );
    // Toplam devamsızlık = explicit "gelmedi" + "kayıt yok" günler
    const totalAbsentDays = explicitAbsentDays + missingDays;

    const overtimeAmount = overtimeHours * Number(e.hourly_overtime_rate || 0);
    const lateDeductions = lateMinutesTotal * minuteRate;
    const absentDeductions = totalAbsentDays * dailyRate;
    const unpaidLeaveDeductions = unpaidLeaveDays * dailyRate;

    const empAdvances = advances.filter(
      (a) =>
        a.employee_id === e.id &&
        (a.deducted_in_month === month ||
          (!a.is_deducted && a.advance_date <= monthEnd))
    );
    const advanceDeductions = empAdvances.reduce(
      (s, a) => s + Number(a.amount || 0),
      0
    );

    const tipsAmount = tips
      .filter(
        (t) =>
          t.employee_id === e.id &&
          t.pool?.pool_date &&
          t.pool.pool_date >= monthStart &&
          t.pool.pool_date <= monthEnd
      )
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const baseSalary = Number(e.monthly_salary || 0);
    const bonus = 0;
    const netSalary = Math.max(
      0,
      baseSalary +
        overtimeAmount +
        tipsAmount +
        bonus -
        absentDeductions -
        lateDeductions -
        unpaidLeaveDeductions -
        advanceDeductions
    );

    return {
      employee_id: e.id,
      payroll_month: month,
      base_salary: baseSalary,
      worked_days: presentDays,
      total_worked_hours: round2(totalWorkedHours),
      overtime_hours: round2(overtimeHours),
      overtime_amount: round2(overtimeAmount),
      late_deductions: round2(lateDeductions),
      absent_deductions: round2(absentDeductions),
      unpaid_leave_deductions: round2(unpaidLeaveDeductions),
      advance_deductions: round2(advanceDeductions),
      tips_amount: round2(tipsAmount),
      bonus,
      net_salary: round2(netSalary),
      is_paid: false,
      payment_date: null,
      payment_method: null,
      notes: null,
      employee: e,
      daily_rate: round2(dailyRate),
      hourly_rate: round2(hourlyRate),
      late_minutes_total: lateMinutesTotal,
      unpaid_leave_days: unpaidLeaveDays,
    };
  });
}

function diffDays(start: string, end: string): number {
  const a = new Date(start + "T00:00:00").getTime();
  const b = new Date(end + "T00:00:00").getTime();
  return Math.round((b - a) / 86400000);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
