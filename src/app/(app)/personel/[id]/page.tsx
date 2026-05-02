import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Phone, Mail, IdCard, Banknote } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/feature/page-header";
import { Button } from "@/components/ui/button";
import { EmployeeForm } from "@/components/feature/employee-form";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate, formatTRY } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [empRes, deptRes] = await Promise.all([
    supabase
      .from("employees")
      .select("*, department:departments(*)")
      .eq("id", params.id)
      .maybeSingle(),
    supabase.from("departments").select("*").order("name"),
  ]);

  const employee = empRes.data as any;
  if (!employee) notFound();

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/personel">
          <ArrowLeft className="h-4 w-4" />
          Personel listesine dön
        </Link>
      </Button>

      <Card className="bg-gradient-to-br from-white to-cream-100">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <Avatar className="h-24 w-24 md:h-28 md:w-28 ring-4 ring-cherry-700/15">
              {employee.photo_url && <AvatarImage src={employee.photo_url} alt={employee.full_name} />}
              <AvatarFallback className="text-3xl">
                {employee.full_name
                  .split(" ")
                  .map((s: string) => s[0])
                  .slice(0, 2)
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="font-serif text-3xl text-ink-900">{employee.full_name}</h1>
                {employee.is_active ? (
                  <Badge variant="success">Aktif</Badge>
                ) : (
                  <Badge variant="outline">Pasif</Badge>
                )}
              </div>
              <p className="text-ink-600">
                {employee.position || "—"}
                {employee.department && (
                  <span className="ml-2">
                    ·{" "}
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: employee.department.color }}
                      />
                      {employee.department.name}
                    </span>
                  </span>
                )}
              </p>
              <div className="gold-line w-32 mt-3 mb-4" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {employee.phone && (
                  <div>
                    <p className="text-xs text-ink-600 mb-0.5 flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Telefon
                    </p>
                    <p className="text-ink-900 font-mono">{employee.phone}</p>
                  </div>
                )}
                {employee.email && (
                  <div>
                    <p className="text-xs text-ink-600 mb-0.5 flex items-center gap-1">
                      <Mail className="h-3 w-3" /> E-posta
                    </p>
                    <p className="text-ink-900 truncate">{employee.email}</p>
                  </div>
                )}
                {employee.national_id && (
                  <div>
                    <p className="text-xs text-ink-600 mb-0.5 flex items-center gap-1">
                      <IdCard className="h-3 w-3" /> TC No
                    </p>
                    <p className="text-ink-900 font-mono">{employee.national_id}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-ink-600 mb-0.5 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> İşe Başlama
                  </p>
                  <p className="text-ink-900">{formatDate(employee.start_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-600 mb-0.5 flex items-center gap-1">
                    <Banknote className="h-3 w-3" /> Aylık Maaş
                  </p>
                  <p className="text-cherry-800 font-mono font-semibold">
                    {formatTRY(employee.monthly_salary)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <PageHeader title="Personel Bilgilerini Düzenle" />
      <EmployeeForm departments={(deptRes.data as any[]) || []} employee={employee} />
    </div>
  );
}
