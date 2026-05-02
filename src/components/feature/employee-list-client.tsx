"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users, Pencil, Phone, Mail, FileDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatTRY, cn } from "@/lib/utils";
import type { Department, Employee } from "@/lib/types";
import { exportEmployeesXlsx } from "@/lib/export";

interface Props {
  initialEmployees: Employee[];
  departments: Department[];
}

export function EmployeeListClient({ initialEmployees, departments }: Props) {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "passive">("active");

  const filtered = useMemo(() => {
    let arr = [...initialEmployees];
    if (statusFilter === "active") arr = arr.filter((e) => e.is_active);
    else if (statusFilter === "passive") arr = arr.filter((e) => !e.is_active);
    if (deptFilter !== "all") arr = arr.filter((e) => e.department_id === deptFilter);
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      arr = arr.filter(
        (e) =>
          e.full_name.toLowerCase().includes(s) ||
          (e.phone || "").includes(s) ||
          (e.position || "").toLowerCase().includes(s)
      );
    }
    return arr;
  }, [initialEmployees, search, deptFilter, statusFilter]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-600/60" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ad, telefon veya pozisyon ara…"
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("active")}
              >
                Aktif
              </Button>
              <Button
                variant={statusFilter === "passive" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("passive")}
              >
                Pasif
              </Button>
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                Tümü
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportEmployeesXlsx(filtered)}
              >
                <FileDown className="h-4 w-4" />
                Excel
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setDeptFilter("all")}
              className={cn(
                "inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                deptFilter === "all"
                  ? "bg-cherry-700 text-cream-50 border-cherry-700"
                  : "bg-white border-cream-300 text-ink-900 hover:bg-cream-100"
              )}
            >
              Tüm Departmanlar
            </button>
            {departments.map((d) => (
              <button
                key={d.id}
                onClick={() => setDeptFilter(d.id)}
                className={cn(
                  "inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border transition-colors gap-2",
                  deptFilter === d.id
                    ? "text-cream-50 border-transparent"
                    : "bg-white border-cream-300 text-ink-900 hover:bg-cream-100"
                )}
                style={
                  deptFilter === d.id
                    ? { backgroundColor: d.color, borderColor: d.color }
                    : undefined
                }
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: deptFilter === d.id ? "#FDF8F0" : d.color }}
                />
                {d.name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Personel bulunamadı"
              description="Filtreleri sıfırlamayı veya yeni bir personel eklemeyi deneyin."
              action={
                <Button asChild>
                  <Link href="/personel/yeni">Yeni Personel Ekle</Link>
                </Button>
              }
            />
          ) : (
            <>
              {/* Desktop tablo */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-cream-100 text-ink-600 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-5 py-3">Personel</th>
                      <th className="text-left px-3 py-3">Pozisyon</th>
                      <th className="text-left px-3 py-3">Departman</th>
                      <th className="text-left px-3 py-3">Telefon</th>
                      <th className="text-right px-3 py-3">Maaş</th>
                      <th className="text-left px-3 py-3">Başlangıç</th>
                      <th className="text-left px-3 py-3">Durum</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-200">
                    {filtered.map((e) => (
                      <tr key={e.id} className="hover:bg-cream-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              {e.photo_url && <AvatarImage src={e.photo_url} alt={e.full_name} />}
                              <AvatarFallback>
                                {e.full_name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <Link
                              href={`/personel/${e.id}`}
                              className="font-medium text-ink-900 hover:text-cherry-700"
                            >
                              {e.full_name}
                            </Link>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-ink-600">{e.position || "—"}</td>
                        <td className="px-3 py-3">
                          {e.department ? (
                            <Badge
                              style={{ background: e.department.color + "22", color: e.department.color }}
                              className="border-0"
                            >
                              {e.department.name}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-3 text-ink-600 font-mono text-xs">{e.phone || "—"}</td>
                        <td className="px-3 py-3 text-right font-mono text-ink-900">
                          {formatTRY(e.monthly_salary)}
                        </td>
                        <td className="px-3 py-3 text-ink-600">{formatDate(e.start_date)}</td>
                        <td className="px-3 py-3">
                          {e.is_active ? (
                            <Badge variant="success">Aktif</Badge>
                          ) : (
                            <Badge variant="outline">Pasif</Badge>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Button asChild variant="ghost" size="icon">
                            <Link href={`/personel/${e.id}`} aria-label="Düzenle">
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile kart */}
              <div className="md:hidden divide-y divide-cream-200">
                {filtered.map((e) => (
                  <Link
                    key={e.id}
                    href={`/personel/${e.id}`}
                    className="block p-4 hover:bg-cream-50"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar className="h-10 w-10">
                        {e.photo_url && <AvatarImage src={e.photo_url} alt={e.full_name} />}
                        <AvatarFallback>
                          {e.full_name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink-900 truncate">{e.full_name}</p>
                        <p className="text-xs text-ink-600 truncate">{e.position || "—"}</p>
                      </div>
                      {e.is_active ? <Badge variant="success">Aktif</Badge> : <Badge variant="outline">Pasif</Badge>}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      {e.department && (
                        <Badge
                          style={{ background: e.department.color + "22", color: e.department.color }}
                          className="border-0"
                        >
                          {e.department.name}
                        </Badge>
                      )}
                      <span className="font-mono text-ink-900">{formatTRY(e.monthly_salary)}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-ink-600">
                      {e.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {e.phone}
                        </span>
                      )}
                      {e.email && (
                        <span className="inline-flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3" /> {e.email}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-ink-600">
        Toplam {filtered.length} personel listeleniyor.
      </p>
    </div>
  );
}
