import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/feature/page-header";
import { Button } from "@/components/ui/button";
import { WeeklyAttendanceClient } from "@/components/feature/weekly-attendance-client";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { week?: string };
}

function getWeekDates(anchor?: string) {
  const d = anchor ? new Date(anchor + "T00:00:00") : new Date();
  // Pazartesi'yi başlangıç al
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    dates.push(x.toISOString().slice(0, 10));
  }
  return dates;
}

export default async function HaftalikPuantajPage({ searchParams }: Props) {
  const dates = getWeekDates(searchParams.week);
  const supabase = createClient();

  const [empRes, attRes] = await Promise.all([
    supabase
      .from("employees")
      .select("*, department:departments(*)")
      .eq("is_active", true)
      .order("full_name"),
    supabase
      .from("attendance")
      .select("*")
      .gte("work_date", dates[0])
      .lte("work_date", dates[6]),
  ]);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/puantaj">
          <ArrowLeft className="h-4 w-4" />
          Günlük puantaja dön
        </Link>
      </Button>
      <PageHeader
        title="Haftalık Puantaj"
        description="Tüm personelin 7 günlük puantaj özeti"
      />
      <WeeklyAttendanceClient
        dates={dates}
        employees={(empRes.data as any[]) || []}
        attendance={(attRes.data as any[]) || []}
      />
    </div>
  );
}
