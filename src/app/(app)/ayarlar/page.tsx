import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/feature/page-header";
import { SettingsClient } from "@/components/feature/settings-client";

export const dynamic = "force-dynamic";

export default async function AyarlarPage() {
  const supabase = createClient();
  const [settingsRes, deptRes, shiftsRes] = await Promise.all([
    supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("departments").select("*").order("name"),
    supabase.from("shifts").select("*").order("start_time"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ayarlar"
        description="Restoran, departman, vardiya ve hesap ayarları"
      />
      <SettingsClient
        settings={settingsRes.data as any}
        departments={(deptRes.data as any[]) || []}
        shifts={(shiftsRes.data as any[]) || []}
      />
    </div>
  );
}
