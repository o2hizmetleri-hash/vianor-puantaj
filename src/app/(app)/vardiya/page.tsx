import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/feature/page-header";
import { ShiftPlanClient } from "@/components/feature/shift-plan-client";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { week?: string };
}

function getWeekDates(anchor?: string) {
  const d = anchor ? new Date(anchor + "T00:00:00") : new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return Array.from({ length: 7 }).map((_, i) => {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    return x.toISOString().slice(0, 10);
  });
}

export default async function VardiyaPage({ searchParams }: Props) {
  const dates = getWeekDates(searchParams.week);
  const supabase = createClient();

  const [empRes, shiftsRes, attRes] = await Promise.all([
    supabase
      .from("employees")
      .select("*, department:departments(*)")
      .eq("is_active", true)
      .order("full_name"),
    supabase.from("shifts").select("*").order("start_time"),
    supabase
      .from("attendance")
      .select("*")
      .gte("work_date", dates[0])
      .lte("work_date", dates[6]),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vardiya Planlama"
        description="Haftalık vardiya takvimi — personeli vardiyalara atayın"
      />
      <ShiftPlanClient
        key={dates[0]}
        dates={dates}
        employees={(empRes.data as any[]) || []}
        shifts={(shiftsRes.data as any[]) || []}
        attendance={(attRes.data as any[]) || []}
      />
    </div>
  );
}
