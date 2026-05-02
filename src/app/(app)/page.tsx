import Link from "next/link";
import {
  UserCheck,
  UserX,
  Plane,
  Banknote,
  Users,
  CalendarPlus,
  Wallet,
  Wine,
  Calculator,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/feature/stat-card";
import { PageHeader } from "@/components/feature/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ATTENDANCE_STATUS,
  formatTRY,
  formatTime,
  monthStr,
  todayStr,
} from "@/lib/utils";
import { DashboardCharts } from "@/components/feature/dashboard-charts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const supabase = createClient();
  const today = todayStr();
  const month = monthStr();

  const [
    employeesRes,
    todayAttendanceRes,
    settingsRes,
    monthAttendanceRes,
    advancesRes,
    tipsRes,
  ] = await Promise.all([
    supabase
      .from("employees")
      .select("*, department:departments(*)")
      .eq("is_active", true)
      .order("full_name"),
    supabase
      .from("attendance")
      .select("*, employee:employees(*, department:departments(*))")
      .eq("work_date", today),
    supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
    supabase
      .from("attendance")
      .select("work_date, status")
      .gte("work_date", startOfWeekStr(7))
      .lte("work_date", today),
    supabase
      .from("advances")
      .select("amount, deducted_in_month, is_deducted")
      .eq("deducted_in_month", month)
      .eq("is_deducted", false),
    supabase
      .from("tips_distribution")
      .select("amount, paid_in_month")
      .eq("paid_in_month", month),
  ]);

  return {
    employees: employeesRes.data || [],
    todayAttendance: todayAttendanceRes.data || [],
    settings: settingsRes.data,
    weekAttendance: monthAttendanceRes.data || [],
    pendingAdvances: advancesRes.data || [],
    monthTips: tipsRes.data || [],
  };
}

function startOfWeekStr(daysBack = 7) {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  const { employees, todayAttendance, settings, weekAttendance } = data;

  const presentCount = todayAttendance.filter((a) => a.status === "present").length;
  const absentCount = todayAttendance.filter((a) => a.status === "absent").length;
  const leaveCount = todayAttendance.filter(
    (a) => a.status === "leave" || a.status === "sick"
  ).length;

  const totalMonthlyPayroll = employees.reduce(
    (sum, e: any) => sum + Number(e.monthly_salary || 0),
    0
  );

  // Bugün hiç kayıt girilmediyse aktif personeli "kayıt yok" olarak göster
  const attendanceMap = new Map(
    todayAttendance.map((a: any) => [a.employee_id, a])
  );

  const departmentDist: Record<string, { name: string; value: number; color: string }> = {};
  for (const e of employees as any[]) {
    const name = e.department?.name || "Atanmamış";
    const color = e.department?.color || "#722F37";
    if (!departmentDist[name]) departmentDist[name] = { name, value: 0, color };
    departmentDist[name].value += 1;
  }

  // Son 7 gün doluluk
  const weekStats: Record<string, { date: string; present: number; absent: number; leave: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    weekStats[key] = { date: key, present: 0, absent: 0, leave: 0 };
  }
  for (const a of weekAttendance as any[]) {
    if (!weekStats[a.work_date]) continue;
    if (a.status === "present") weekStats[a.work_date].present += 1;
    else if (a.status === "absent") weekStats[a.work_date].absent += 1;
    else if (a.status === "leave" || a.status === "sick")
      weekStats[a.work_date].leave += 1;
  }

  const restaurantName = settings?.restaurant_name || "Vianor Maison de Viande";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hoş geldiniz"
        description={`${restaurantName} — Bugünün özeti ve hızlı işlemler`}
      />

      {/* Üst metrik kartları */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Bugün Gelen"
          value={presentCount}
          hint={`${employees.length} aktif personelden`}
          icon={UserCheck}
          variant="success"
        />
        <StatCard
          label="Bugün Gelmeyen"
          value={absentCount}
          hint="Devamsızlık"
          icon={UserX}
          variant="danger"
        />
        <StatCard
          label="Bugün İzinli / Raporlu"
          value={leaveCount}
          hint="İzin & rapor"
          icon={Plane}
          variant="warning"
        />
        <StatCard
          label="Bu Ay Toplam Maaş"
          value={formatTRY(totalMonthlyPayroll)}
          hint="Aktif personel toplamı"
          icon={Banknote}
          variant="cherry"
        />
      </div>

      {/* Ana grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bugünün durumu */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Bugünün Puantajı</CardTitle>
              <p className="text-sm text-ink-600 mt-0.5">
                Tüm aktif personelin günlük durumu
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/puantaj">Detay</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {employees.length === 0 ? (
              <div className="py-8 text-center text-sm text-ink-600">
                Aktif personel bulunmuyor.{" "}
                <Link href="/personel/yeni" className="text-cherry-700 underline">
                  Yeni personel ekle
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-cream-200 max-h-[400px] overflow-y-auto -mx-2">
                {(employees as any[]).map((e) => {
                  const att = attendanceMap.get(e.id) as any;
                  const status = att?.status || "absent";
                  const meta = ATTENDANCE_STATUS[status];
                  return (
                    <div
                      key={e.id}
                      className="flex items-center justify-between gap-3 py-2.5 px-2 hover:bg-cream-50 rounded-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9">
                          {e.photo_url && <AvatarImage src={e.photo_url} alt={e.full_name} />}
                          <AvatarFallback>
                            {e.full_name
                              .split(" ")
                              .map((s: string) => s[0])
                              .slice(0, 2)
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink-900 truncate">
                            {e.full_name}
                          </p>
                          <p className="text-xs text-ink-600 truncate">
                            {e.position || "—"}
                            {e.department && (
                              <span className="ml-1.5 inline-flex items-center">
                                · <span
                                  className="inline-block w-1.5 h-1.5 rounded-full mx-1.5"
                                  style={{ background: e.department.color }}
                                />
                                {e.department.name}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {att?.check_in && (
                          <span className="text-xs font-mono text-ink-600 hidden sm:inline">
                            {formatTime(att.check_in)}
                            {att.check_out && ` → ${formatTime(att.check_out)}`}
                          </span>
                        )}
                        <Badge
                          style={{
                            background: meta.bg,
                            color: meta.color,
                          }}
                          className="border-0"
                        >
                          {meta.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Departman dağılımı */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Departman Dağılımı</CardTitle>
            <p className="text-sm text-ink-600">Aktif personelin departmanlara göre dağılımı</p>
          </CardHeader>
          <CardContent>
            <DashboardCharts
              departments={Object.values(departmentDist)}
              week={Object.values(weekStats)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Hızlı işlemler */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Hızlı İşlemler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" size="lg" className="h-auto py-4 flex-col items-start gap-2">
              <Link href="/puantaj">
                <CalendarPlus className="h-5 w-5 text-cherry-700" />
                <div className="text-left">
                  <div className="font-medium">Bugünün Puantajı</div>
                  <div className="text-xs text-ink-600 font-normal">Toplu giriş yap</div>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-auto py-4 flex-col items-start gap-2">
              <Link href="/avans">
                <Wallet className="h-5 w-5 text-cherry-700" />
                <div className="text-left">
                  <div className="font-medium">Yeni Avans</div>
                  <div className="text-xs text-ink-600 font-normal">Personele avans ver</div>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-auto py-4 flex-col items-start gap-2">
              <Link href="/bahsis">
                <Wine className="h-5 w-5 text-cherry-700" />
                <div className="text-left">
                  <div className="font-medium">Bahşiş Ekle</div>
                  <div className="text-xs text-ink-600 font-normal">Havuz oluştur ve dağıt</div>
                </div>
              </Link>
            </Button>
            <Button asChild size="lg" className="h-auto py-4 flex-col items-start gap-2">
              <Link href="/maas">
                <Calculator className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Maaşları Hesapla</div>
                  <div className="text-xs text-cream-100 font-normal">Bu ayın bordrosu</div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
