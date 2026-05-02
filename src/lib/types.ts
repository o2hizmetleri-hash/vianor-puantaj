export type AttendanceStatus =
  | "present"
  | "absent"
  | "leave"
  | "sick"
  | "holiday"
  | "off";

export type LeaveType = "annual" | "sick" | "unpaid" | "maternity" | "other";
export type PaymentMethod = "cash" | "bank" | "other";
export type DistributionMethod = "equal" | "by_hours" | "by_position";

export interface Department {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Employee {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  national_id: string | null;
  position: string | null;
  department_id: string | null;
  monthly_salary: number;
  hourly_overtime_rate: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
  department?: Department | null;
}

export interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  expected_hours: number;
  color: string;
  created_at: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  work_date: string;
  shift_id: string | null;
  check_in: string | null;
  check_out: string | null;
  expected_check_in: string | null;
  expected_check_out: string | null;
  worked_hours: number;
  overtime_hours: number;
  late_minutes: number;
  early_leave_minutes: number;
  status: AttendanceStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  employee?: Employee | null;
  shift?: Shift | null;
}

export interface Leave {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  total_days: number;
  is_paid: boolean;
  reason: string | null;
  document_url: string | null;
  approved: boolean;
  created_at: string;
  employee?: Employee | null;
}

export interface Advance {
  id: string;
  employee_id: string;
  amount: number;
  advance_date: string;
  payment_method: PaymentMethod;
  description: string | null;
  is_deducted: boolean;
  deducted_in_month: string | null;
  created_at: string;
  employee?: Employee | null;
}

export interface TipsPool {
  id: string;
  pool_date: string;
  total_amount: number;
  distribution_method: DistributionMethod;
  notes: string | null;
  created_at: string;
}

export interface TipsDistribution {
  id: string;
  pool_id: string;
  employee_id: string;
  amount: number;
  is_paid: boolean;
  paid_in_month: string | null;
  created_at: string;
  employee?: Employee | null;
  pool?: TipsPool | null;
}

export interface MonthlyPayroll {
  id: string;
  employee_id: string;
  payroll_month: string;
  base_salary: number;
  worked_days: number;
  total_worked_hours: number;
  overtime_hours: number;
  overtime_amount: number;
  late_deductions: number;
  absent_deductions: number;
  unpaid_leave_deductions: number;
  advance_deductions: number;
  tips_amount: number;
  bonus: number;
  net_salary: number;
  is_paid: boolean;
  payment_date: string | null;
  payment_method: PaymentMethod | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  employee?: Employee | null;
}

export interface AppSettings {
  id: number;
  restaurant_name: string;
  monthly_work_days: number;
  daily_work_hours: number;
  late_tolerance_minutes: number;
  overtime_threshold_minutes: number;
  currency: string;
  logo_url: string | null;
  updated_at: string;
}
