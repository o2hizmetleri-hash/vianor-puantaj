import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/feature/page-header";
import { Button } from "@/components/ui/button";
import { EmployeeListClient } from "@/components/feature/employee-list-client";

export const dynamic = "force-dynamic";

export default async function PersonelPage() {
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
        title="Personel"
        description="Restoran kadrosunun tüm kayıtları, departman ve durumları"
      >
        <Button asChild size="lg">
          <Link href="/personel/yeni">
            <Plus className="h-4 w-4" />
            Yeni Personel
          </Link>
        </Button>
      </PageHeader>

      <EmployeeListClient
        initialEmployees={(empRes.data as any[]) || []}
        departments={(deptRes.data as any[]) || []}
      />
    </div>
  );
}
