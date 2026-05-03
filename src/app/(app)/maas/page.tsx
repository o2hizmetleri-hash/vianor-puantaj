import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/feature/page-header";
import { PayrollClient } from "@/components/feature/payroll-client";
import { monthStr } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { month?: string };
}

function previousMonth() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return monthStr(d);
}

export default async function MaasPage({ searchParams }: Props) {
  const month = searchParams.month || previousMonth();
  const monthStart = month + "-01";
  const lastDay = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5, 7)),
    0
  ).getDate();
  const monthEnd = `${month}-${String(lastDay).padStart(2, "0")}`;

  const supabase = createClient();

  const [
    empRes,
    attRes,
    leavesRes,
    advancesRes,
    tipsRes,
    payrollRes,
    settingsRes,
  ] = await Promise.all([
    supabase
      .from("employees")
      .select("*, department:departments(*)")
      .eq("is_active", true)
      .order("full_name"),
    supabase
      .from("attendance")
      .select("*")
      .gte("work_date", monthStart)
      .lte("work_date", monthEnd),
    supabase.from("leaves").select("*"),
    supabase.from("advances").select("*"),
    supabase
      .from("tips_distribution")
      .select("*, pool:tips_pool(*)"),
    supabase.from("monthly_payroll").select("*").eq("payroll_month", month),
    supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maaş & Bordro"
        description="Aylık maaş hesaplama, ödeme takibi ve bordro çıktıları"
      />
      <PayrollClient
        month={month}
        employees={(empRes.data as any[]) || []}
        attendance={(attRes.data as any[]) || []}
        leaves={(leavesRes.data as any[]) || []}
        advances={(advancesRes.data as any[]) || []}
        tips={(tipsRes.data as any[]) || []}
        existingPayroll={(payrollRes.data as any[]) || []}
        settings={(settingsRes.data as any) || {
          monthly_work_days: 30,
          daily_work_hours: 9,
          late_tolerance_minutes: 5,
          overtime_threshold_minutes: 30,
          restaurant_name: "Vianor Maison de Viande",
        }}
      />
    </div>
  );
}
