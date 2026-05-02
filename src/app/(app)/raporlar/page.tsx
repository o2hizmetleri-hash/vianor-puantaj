import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/feature/page-header";
import { ReportsClient } from "@/components/feature/reports-client";

export const dynamic = "force-dynamic";

export default async function RaporlarPage() {
  const supabase = createClient();
  const [empRes, deptRes] = await Promise.all([
    supabase
      .from("employees")
      .select("*, department:departments(*)")
      .order("full_name"),
    supabase.from("departments").select("*").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Raporlar"
        description="Çeşitli raporları önizleyin ve PDF/Excel olarak indirin"
      />
      <ReportsClient
        employees={(empRes.data as any[]) || []}
        departments={(deptRes.data as any[]) || []}
      />
    </div>
  );
}
