import type {
  Advance,
  AppSettings,
  Attendance,
  Employee,
  Leave,
  MonthlyPayroll,
  TipsDistribution,
} from "./types";
import {
  attendanceCountsAsWorkedDay,
  eachDateInclusive,
  isPaidWithoutAttendanceDay,
  qualifiesForHolidayWorkPremium,
} from "./tr-payroll-calendar";

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
  daily_rate: number;
  hourly_rate: number;
  late_minutes_total: number;
  /** Ücretsiz izin kayıtlarının iş günleri üzerindeki günü (Pazar/resmi tatil hariç) */
  unpaid_leave_days: number;
}

function leaveOverlapKind(empLeaves: Leave[], d: string): "paid" | "unpaid" | null {
  for (const l of empLeaves) {
    if (d < l.start_date || d > l.end_date) continue;
    return l.is_paid ? "paid" : "unpaid";
  }
  return null;
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
    const empStart = e.start_date && e.start_date > monthStart ? e.start_date : monthStart;
    const empEndRaw = e.end_date && e.end_date < monthEnd ? e.end_date : monthEnd;
    const empEnd = empEndRaw > today ? today : empEndRaw;

    const monthlyWorkDays = Math.max(1, settings.monthly_work_days);
    /** Maktu maaş: tam maaş / 30 gün ile günlük ücret — kesintiler günlük kazanımdan yapılır */
    const dailyRate = Number(e.monthly_salary) / monthlyWorkDays;
    const hourlyRate = dailyRate / Math.max(1, settings.daily_work_hours);
    const minuteRate = hourlyRate / 60;

    const empAtt = attendance.filter(
      (a) =>
        a.employee_id === e.id &&
        a.work_date >= empStart &&
        a.work_date <= empEnd
    );

    const attendanceByDate = new Map<string, Attendance>();
    for (const row of empAtt) attendanceByDate.set(row.work_date, row);

    const presentDays = empAtt.filter((a) => attendanceCountsAsWorkedDay(a.status)).length;
    const totalWorkedHours = empAtt.reduce((s, a) => s + Number(a.worked_hours || 0), 0);
    const overtimeHours = empAtt.reduce((s, a) => s + Number(a.overtime_hours || 0), 0);
    const lateMinutesTotal = empAtt.reduce((s, a) => s + (a.late_minutes || 0), 0);

    const empLeaves = leaves.filter((l) => l.employee_id === e.id);

    let absentDeductionDays = 0;
    let unpaidLeaveBusinessDays = 0;
    let holidayWorkPremium = 0;

    for (const dStr of eachDateInclusive(empStart, empEnd)) {
      if (isPaidWithoutAttendanceDay(dStr)) {
        const row = attendanceByDate.get(dStr);
        if (qualifiesForHolidayWorkPremium(dStr, row?.status)) {
          holidayWorkPremium += dailyRate;
        }
        continue;
      }

      const leaveKind = leaveOverlapKind(empLeaves, dStr);
      if (leaveKind === "unpaid") {
        unpaidLeaveBusinessDays += 1;
        continue;
      }
      if (leaveKind === "paid") {
        continue;
      }

      const att = attendanceByDate.get(dStr);
      if (!att || att.status === "absent") {
        absentDeductionDays += 1;
        continue;
      }
      /** present dışında (leave/sick/holiday/off vb.) iş günü kaydı — kesinti yok */
    }

    const overtimeAmount = overtimeHours * Number(e.hourly_overtime_rate || 0);
    const lateDeductions = lateMinutesTotal * minuteRate;
    const absentDeductions = absentDeductionDays * dailyRate;
    const unpaidLeaveDeductions = unpaidLeaveBusinessDays * dailyRate;

    const empAdvances = advances.filter(
      (a) =>
        a.employee_id === e.id &&
        (a.deducted_in_month === month ||
          (!a.is_deducted && a.advance_date <= monthEnd))
    );
    const advanceDeductions = empAdvances.reduce((s, a) => s + Number(a.amount || 0), 0);

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
    const bonus = round2(holidayWorkPremium);
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
      unpaid_leave_days: unpaidLeaveBusinessDays,
    };
  });
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
