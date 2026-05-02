import { Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/feature/page-header";
import { AdvancesClient } from "@/components/feature/advances-client";
import { StatCard } from "@/components/feature/stat-card";
import { formatTRY, monthStr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AvansPage() {
  const supabase = createClient();
  const month = monthStr();

  const [advancesRes, empRes] = await Promise.all([
    supabase
      .from("advances")
      .select("*, employee:employees(*, department:departments(*))")
      .order("advance_date", { ascending: false }),
    supabase.from("employees").select("id, full_name").eq("is_active", true).order("full_name"),
  ]);

  const all = (advancesRes.data as any[]) || [];
  const monthTotal = all
    .filter((a) => a.advance_date.startsWith(month))
    .reduce((s, a) => s + Number(a.amount || 0), 0);
  const pendingTotal = all
    .filter((a) => !a.is_deducted)
    .reduce((s, a) => s + Number(a.amount || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Avans" description="Personel avans takibi ve maaştan kesinti durumu" />

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard label="Bu Ay Verilen Avans" value={formatTRY(monthTotal)} icon={Wallet} variant="cherry" />
        <StatCard label="Henüz Düşülmemiş" value={formatTRY(pendingTotal)} icon={Wallet} variant="warning" />
      </div>

      <AdvancesClient
        initialAdvances={all}
        employees={(empRes.data as any[]) || []}
      />
    </div>
  );
}
