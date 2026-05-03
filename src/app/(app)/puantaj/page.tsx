import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/feature/page-header";
import { AttendanceClient } from "@/components/feature/attendance-client";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { date?: string };
}

export default async function PuantajPage({ searchParams }: Props) {
  const date = searchParams.date || new Date().toISOString().slice(0, 10);
  const supabase = createClient();

  const [empRes, shiftsRes, attRes, settingsRes] = await Promise.all([
    supabase
      .from("employees")
      .select("*, department:departments(*)")
      .eq("is_active", true)
      .order("full_name"),
    supabase.from("shifts").select("*").order("start_time"),
    supabase
      .from("attendance")
      .select("*")
      .eq("work_date", date),
    supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Günlük Puantaj"
        description="Personelin günlük geliş-çıkış, mesai ve durum bilgilerini girin"
      >
        <Button asChild variant="outline">
          <Link href="/puantaj/haftalik">Haftalık Görünüm</Link>
        </Button>
      </PageHeader>

      <AttendanceClient
        key={date}
        date={date}
        employees={(empRes.data as any[]) || []}
        shifts={(shiftsRes.data as any[]) || []}
        initialAttendance={(attRes.data as any[]) || []}
        settings={settingsRes.data as any}
      />
    </div>
  );
}
