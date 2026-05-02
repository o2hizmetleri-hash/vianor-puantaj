import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let restaurantName = "Vianor Maison de Viande";

  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("app_settings")
      .select("restaurant_name")
      .eq("id", 1)
      .maybeSingle();
    if (data?.restaurant_name) restaurantName = data.restaurant_name;
  } catch {
    // Veritabanı henüz hazır değilse varsayılan adı kullan
  }

  return <AppShell restaurantName={restaurantName}>{children}</AppShell>;
}
