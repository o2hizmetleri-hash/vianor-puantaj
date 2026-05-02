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

  return employees.map((e) => {
    const dailyRate = Number(e.monthly_salary) / Math.max(1, settings.monthly_work_days);
    const hourlyRate = dailyRate / Math.max(1, settings.daily_work_hours);
    const minuteRate = hourlyRate / 60;

    const empAtt = attendance.filter(
      (a) => a.employee_id === e.id && a.work_date >= monthStart && a.work_date <= monthEnd
    );

    const presentDays = empAtt.filter((a) => a.status === "present").length;
    const absentDays = empAtt.filter((a) => a.status === "absent").length;
    const totalWorkedHours = empAtt.reduce((s, a) => s + Number(a.worked_hours || 0), 0);
    const overtimeHours = empAtt.reduce((s, a) => s + Number(a.overtime_hours || 0), 0);
    const lateMinutesTotal = empAtt.reduce((s, a) => s + (a.late_minutes || 0), 0);

    // Ücretsiz izin gün sayısı
    const empLeaves = leaves.filter((l) => l.employee_id === e.id);
    let unpaidLeaveDays = 0;
    for (const l of empLeaves) {
      if (l.is_paid) continue;
      // Ay aralığı ile kesişim
      const ls = l.start_date < monthStart ? monthStart : l.start_date;
      const le = l.end_date > monthEnd ? monthEnd : l.end_date;
      if (ls > le) continue;
      const dStart = new Date(ls);
      const dEnd = new Date(le);
      const days = Math.round((dEnd.getTime() - dStart.getTime()) / 86400000) + 1;
      unpaidLeaveDays += days;
    }

    const overtimeAmount = overtimeHours * Number(e.hourly_overtime_rate || 0);
    const lateDeductions = lateMinutesTotal * minuteRate;
    const absentDeductions = absentDays * dailyRate;
    const unpaidLeaveDeductions = unpaidLeaveDays * dailyRate;

    const empAdvances = advances.filter(
      (a) => a.employee_id === e.id && (a.deducted_in_month === month || (!a.is_deducted && a.advance_date <= monthEnd))
    );
    // Bu ay için işaretlenmiş veya henüz düşülmemiş ve bu ay/öncesinde verilmiş
    const advanceDeductions = empAdvances.reduce((s, a) => s + Number(a.amount || 0), 0);

    const tipsAmount = tips
      .filter((t) => t.employee_id === e.id && t.pool?.pool_date && t.pool.pool_date >= monthStart && t.pool.pool_date <= monthEnd)
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const baseSalary = Number(e.monthly_salary || 0);
    const bonus = 0;
    const netSalary =
      baseSalary +
      overtimeAmount +
      tipsAmount +
      bonus -
      absentDeductions -
      lateDeductions -
      unpaidLeaveDeductions -
      advanceDeductions;

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

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
