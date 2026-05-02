import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/feature/page-header";
import { Button } from "@/components/ui/button";
import { EmployeeForm } from "@/components/feature/employee-form";

export const dynamic = "force-dynamic";

export default async function NewEmployeePage() {
  const supabase = createClient();
  const { data: departments } = await supabase
    .from("departments")
    .select("*")
    .order("name");

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/personel">
          <ArrowLeft className="h-4 w-4" />
          Personel listesine dön
        </Link>
      </Button>
      <PageHeader
        title="Yeni Personel"
        description="Restoran kadronuza yeni bir çalışan ekleyin"
      />
      <EmployeeForm departments={(departments as any[]) || []} />
    </div>
  );
}
