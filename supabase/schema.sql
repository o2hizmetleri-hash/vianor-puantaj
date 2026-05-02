-- ============================================================================
-- VIANOR MAISON DE VIANDE — Personel Puantaj & Maaş Sistemi
-- Supabase SQL Editor'a yapıştırın ve çalıştırın
-- ============================================================================

-- ============ DEPARTMANLAR ============
create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text default '#722F37',
  created_at timestamptz default now()
);

insert into departments (name, color) values
  ('Mutfak', '#8B3A47'),
  ('Servis', '#722F37'),
  ('Bar', '#A04757'),
  ('Yönetim', '#4A1C24')
on conflict (name) do nothing;

-- ============ PERSONEL ============
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  national_id text,
  position text,
  department_id uuid references departments(id) on delete set null,
  monthly_salary numeric(10,2) not null default 0,
  hourly_overtime_rate numeric(10,2) default 0,
  start_date date not null,
  end_date date,
  is_active boolean default true,
  notes text,
  photo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_employees_department on employees(department_id);
create index if not exists idx_employees_active on employees(is_active);

-- ============ VARDİYALAR ============
create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_time time not null,
  end_time time not null,
  expected_hours numeric(4,2) not null,
  color text default '#722F37',
  created_at timestamptz default now()
);

insert into shifts (name, start_time, end_time, expected_hours, color) values
  ('Sabah', '09:00', '17:00', 8, '#C77D3A'),
  ('Akşam', '17:00', '01:00', 8, '#722F37'),
  ('Kapanış', '20:00', '03:00', 7, '#4A1C24'),
  ('Tam Gün', '11:00', '23:00', 12, '#8B3A47')
on conflict do nothing;

-- ============ PUANTAJ ============
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  work_date date not null,
  shift_id uuid references shifts(id) on delete set null,
  check_in time,
  check_out time,
  expected_check_in time,
  expected_check_out time,
  worked_hours numeric(4,2) default 0,
  overtime_hours numeric(4,2) default 0,
  late_minutes int default 0,
  early_leave_minutes int default 0,
  status text not null default 'present',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(employee_id, work_date)
);

create index if not exists idx_attendance_employee on attendance(employee_id);
create index if not exists idx_attendance_date on attendance(work_date);
create index if not exists idx_attendance_status on attendance(status);

-- ============ İZİNLER ============
create table if not exists leaves (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  leave_type text not null,
  start_date date not null,
  end_date date not null,
  total_days int not null,
  is_paid boolean default true,
  reason text,
  document_url text,
  approved boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_leaves_employee on leaves(employee_id);
create index if not exists idx_leaves_dates on leaves(start_date, end_date);

-- ============ AVANSLAR ============
create table if not exists advances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  amount numeric(10,2) not null,
  advance_date date not null default current_date,
  payment_method text default 'cash',
  description text,
  is_deducted boolean default false,
  deducted_in_month text,
  created_at timestamptz default now()
);

create index if not exists idx_advances_employee on advances(employee_id);
create index if not exists idx_advances_date on advances(advance_date);

-- ============ BAHŞİŞ ============
create table if not exists tips_pool (
  id uuid primary key default gen_random_uuid(),
  pool_date date not null,
  total_amount numeric(10,2) not null,
  distribution_method text default 'equal',
  notes text,
  created_at timestamptz default now()
);

create table if not exists tips_distribution (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references tips_pool(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  amount numeric(10,2) not null,
  is_paid boolean default false,
  paid_in_month text,
  created_at timestamptz default now()
);

create index if not exists idx_tips_pool_date on tips_pool(pool_date);
create index if not exists idx_tips_distribution_employee on tips_distribution(employee_id);

-- ============ AYLIK MAAŞ ============
create table if not exists monthly_payroll (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  payroll_month text not null,
  base_salary numeric(10,2) not null,
  worked_days int not null,
  total_worked_hours numeric(6,2) default 0,
  overtime_hours numeric(6,2) default 0,
  overtime_amount numeric(10,2) default 0,
  late_deductions numeric(10,2) default 0,
  absent_deductions numeric(10,2) default 0,
  unpaid_leave_deductions numeric(10,2) default 0,
  advance_deductions numeric(10,2) default 0,
  tips_amount numeric(10,2) default 0,
  bonus numeric(10,2) default 0,
  net_salary numeric(10,2) not null,
  is_paid boolean default false,
  payment_date date,
  payment_method text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(employee_id, payroll_month)
);

create index if not exists idx_payroll_month on monthly_payroll(payroll_month);
create index if not exists idx_payroll_employee on monthly_payroll(employee_id);

-- ============ AYARLAR ============
create table if not exists app_settings (
  id int primary key default 1,
  restaurant_name text default 'Vianor Maison de Viande',
  monthly_work_days int default 30,
  daily_work_hours numeric(4,2) default 8,
  late_tolerance_minutes int default 5,
  overtime_threshold_minutes int default 30,
  currency text default 'TRY',
  logo_url text,
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);

insert into app_settings (id) values (1) on conflict do nothing;

-- ============ TRIGGER: worked_hours otomatik ============
create or replace function calc_worked_hours()
returns trigger as $$
begin
  if new.check_in is not null and new.check_out is not null then
    if new.check_out < new.check_in then
      new.worked_hours := extract(epoch from
        (new.check_out + interval '24 hours' - new.check_in)) / 3600.0;
    else
      new.worked_hours := extract(epoch from
        (new.check_out - new.check_in)) / 3600.0;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_attendance_calc on attendance;
create trigger trg_attendance_calc
before insert or update on attendance
for each row execute function calc_worked_hours();

-- ============ RLS ============
alter table departments enable row level security;
alter table employees enable row level security;
alter table shifts enable row level security;
alter table attendance enable row level security;
alter table leaves enable row level security;
alter table advances enable row level security;
alter table tips_pool enable row level security;
alter table tips_distribution enable row level security;
alter table monthly_payroll enable row level security;
alter table app_settings enable row level security;

drop policy if exists "auth_all" on departments;
drop policy if exists "auth_all" on employees;
drop policy if exists "auth_all" on shifts;
drop policy if exists "auth_all" on attendance;
drop policy if exists "auth_all" on leaves;
drop policy if exists "auth_all" on advances;
drop policy if exists "auth_all" on tips_pool;
drop policy if exists "auth_all" on tips_distribution;
drop policy if exists "auth_all" on monthly_payroll;
drop policy if exists "auth_all" on app_settings;

create policy "auth_all" on departments for all to authenticated using (true) with check (true);
create policy "auth_all" on employees for all to authenticated using (true) with check (true);
create policy "auth_all" on shifts for all to authenticated using (true) with check (true);
create policy "auth_all" on attendance for all to authenticated using (true) with check (true);
create policy "auth_all" on leaves for all to authenticated using (true) with check (true);
create policy "auth_all" on advances for all to authenticated using (true) with check (true);
create policy "auth_all" on tips_pool for all to authenticated using (true) with check (true);
create policy "auth_all" on tips_distribution for all to authenticated using (true) with check (true);
create policy "auth_all" on monthly_payroll for all to authenticated using (true) with check (true);
create policy "auth_all" on app_settings for all to authenticated using (true) with check (true);
