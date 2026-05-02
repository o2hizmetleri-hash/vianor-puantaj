import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/feature/page-header";
import { TipsClient } from "@/components/feature/tips-client";

export const dynamic = "force-dynamic";

export default async function BahsisPage() {
  const supabase = createClient();

  const [poolsRes, distRes, empRes] = await Promise.all([
    supabase.from("tips_pool").select("*").order("pool_date", { ascending: false }),
    supabase
      .from("tips_distribution")
      .select("*, employee:employees(*, department:departments(*)), pool:tips_pool(*)")
      .order("created_at", { ascending: false }),
    supabase
      .from("employees")
      .select("*, department:departments(*)")
      .eq("is_active", true)
      .order("full_name"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bahşiş"
        description="Bahşiş havuzu oluşturun ve farklı yöntemlerle dağıtın"
      />
      <TipsClient
        pools={(poolsRes.data as any[]) || []}
        distributions={(distRes.data as any[]) || []}
        employees={(empRes.data as any[]) || []}
      />
    </div>
  );
}
