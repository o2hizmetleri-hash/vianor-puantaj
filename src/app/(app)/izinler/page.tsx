import { Plane, Stethoscope, FileX2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/feature/page-header";
import { LeavesClient } from "@/components/feature/leaves-client";
import { StatCard } from "@/components/feature/stat-card";
import { monthStr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function IzinlerPage() {
  const supabase = createClient();
  const month = monthStr();
  const monthStart = month + "-01";
  const monthEnd = month + "-31";

  const [leavesRes, empRes] = await Promise.all([
    supabase
      .from("leaves")
      .select("*, employee:employees(*, department:departments(*))")
      .order("start_date", { ascending: false }),
    supabase
      .from("employees")
      .select("id, full_name")
      .eq("is_active", true)
      .order("full_name"),
  ]);

  const allLeaves = (leavesRes.data as any[]) || [];
  const monthLeaves = allLeaves.filter(
    (l) => l.start_date <= monthEnd && l.end_date >= monthStart
  );

  const counts = {
    annual: monthLeaves.filter((l) => l.leave_type === "annual").length,
    sick: monthLeaves.filter((l) => l.leave_type === "sick").length,
    unpaid: monthLeaves.filter((l) => l.leave_type === "unpaid").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="İzinler & Raporlar"
        description="Personel izin ve rapor takibi"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Bu Ay Yıllık İzinli" value={counts.annual} icon={Plane} variant="warning" />
        <StatCard label="Bu Ay Raporlu" value={counts.sick} icon={Stethoscope} variant="danger" />
        <StatCard label="Bu Ay Ücretsiz İzin" value={counts.unpaid} icon={FileX2} />
      </div>

      <LeavesClient
        initialLeaves={allLeaves}
        employees={(empRes.data as any[]) || []}
      />
    </div>
  );
}
