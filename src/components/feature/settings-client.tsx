"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Plus,
  Trash2,
  Loader2,
  Database,
  KeyRound,
  Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { AppSettings, Department, Shift } from "@/lib/types";

interface Props {
  settings: AppSettings | null;
  departments: Department[];
  shifts: Shift[];
}

export function SettingsClient({ settings, departments, shifts }: Props) {
  return (
    <Tabs defaultValue="general">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="general">Genel</TabsTrigger>
        <TabsTrigger value="departments">Departmanlar</TabsTrigger>
        <TabsTrigger value="shifts">Vardiyalar</TabsTrigger>
        <TabsTrigger value="security">Güvenlik</TabsTrigger>
        <TabsTrigger value="data">Veri</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="mt-4">
        <GeneralSettings settings={settings} />
      </TabsContent>
      <TabsContent value="departments" className="mt-4">
        <DepartmentsSettings departments={departments} />
      </TabsContent>
      <TabsContent value="shifts" className="mt-4">
        <ShiftsSettings shifts={shifts} />
      </TabsContent>
      <TabsContent value="security" className="mt-4">
        <SecuritySettings />
      </TabsContent>
      <TabsContent value="data" className="mt-4">
        <DataSettings />
      </TabsContent>
    </Tabs>
  );
}

function GeneralSettings({ settings }: { settings: AppSettings | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    restaurant_name: settings?.restaurant_name || "Vianor Maison de Viande",
    monthly_work_days: settings?.monthly_work_days ?? 30,
    daily_work_hours: settings?.daily_work_hours ?? 9,
    late_tolerance_minutes: settings?.late_tolerance_minutes ?? 5,
    overtime_threshold_minutes: settings?.overtime_threshold_minutes ?? 30,
    currency: settings?.currency || "TRY",
  });

  const save = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("app_settings")
        .update(form)
        .eq("id", 1);
      if (error) throw error;
      toast.success("Ayarlar güncellendi");
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Hata");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Genel Ayarlar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Restoran Adı</Label>
          <Input
            value={form.restaurant_name}
            onChange={(e) => setForm({ ...form, restaurant_name: e.target.value })}
          />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Aylık İş Günü</Label>
            <Input
              type="number"
              min="1"
              max="31"
              value={form.monthly_work_days}
              onChange={(e) => setForm({ ...form, monthly_work_days: Number(e.target.value) })}
            />
            <p className="text-xs text-ink-600">Maaş bu sayıya bölünerek günlük ücret hesaplanır</p>
          </div>
          <div className="space-y-2">
            <Label>Günlük Çalışma Saati</Label>
            <Input
              type="number"
              min="1"
              max="24"
              step="0.5"
              value={form.daily_work_hours}
              onChange={(e) => setForm({ ...form, daily_work_hours: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Geç Kalma Toleransı (dk)</Label>
            <Input
              type="number"
              min="0"
              value={form.late_tolerance_minutes}
              onChange={(e) => setForm({ ...form, late_tolerance_minutes: Number(e.target.value) })}
            />
            <p className="text-xs text-ink-600">Bu kadar geç kalma dikkate alınmaz</p>
          </div>
          <div className="space-y-2">
            <Label>Mesai Eşiği (dk)</Label>
            <Input
              type="number"
              min="0"
              value={form.overtime_threshold_minutes}
              onChange={(e) =>
                setForm({ ...form, overtime_threshold_minutes: Number(e.target.value) })
              }
            />
            <p className="text-xs text-ink-600">Vardiya bitiminden bu kadar fazla çalışmak mesai sayılır</p>
          </div>
          <div className="space-y-2">
            <Label>Para Birimi</Label>
            <Input
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            />
          </div>
        </div>
        <Button onClick={save} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Kaydet
        </Button>
      </CardContent>
    </Card>
  );
}

function DepartmentsSettings({ departments }: { departments: Department[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: "", color: "#722F37" });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", color: "#722F37" });
    setOpen(true);
  };

  const openEdit = (d: Department) => {
    setEditing(d);
    setForm({ name: d.name, color: d.color });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name) return toast.error("Ad gerekli");
    try {
      const supabase = createClient();
      if (editing) {
        const { error } = await supabase
          .from("departments")
          .update(form)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("departments").insert(form);
        if (error) throw error;
      }
      toast.success("Departman kaydedildi");
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Hata");
    }
  };

  const del = async (d: Department) => {
    if (!confirm(`${d.name} departmanı silinsin mi?`)) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from("departments").delete().eq("id", d.id);
      if (error) throw error;
      toast.success("Silindi");
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Hata");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Departmanlar</CardTitle>
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4" />
          Yeni Departman
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {departments.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between p-3 bg-cream-100 rounded-sm"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-sm"
                  style={{ background: d.color }}
                />
                <span className="text-ink-900 font-medium">{d.name}</span>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-danger hover:bg-red-50"
                  onClick={() => del(d)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Departmanı Düzenle" : "Yeni Departman"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Ad</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Renk</Label>
                <Input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="h-12"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
              <Button onClick={save}>Kaydet</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function ShiftsSettings({ shifts }: { shifts: Shift[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [form, setForm] = useState({
    name: "",
    start_time: "09:00",
    end_time: "17:00",
    expected_hours: 8,
    color: "#722F37",
  });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", start_time: "09:00", end_time: "17:00", expected_hours: 8, color: "#722F37" });
    setOpen(true);
  };

  const openEdit = (s: Shift) => {
    setEditing(s);
    setForm({
      name: s.name,
      start_time: s.start_time.slice(0, 5),
      end_time: s.end_time.slice(0, 5),
      expected_hours: s.expected_hours,
      color: s.color,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name) return toast.error("Ad gerekli");
    try {
      const supabase = createClient();
      if (editing) {
        const { error } = await supabase.from("shifts").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("shifts").insert(form);
        if (error) throw error;
      }
      toast.success("Vardiya kaydedildi");
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Hata");
    }
  };

  const del = async (s: Shift) => {
    if (!confirm(`${s.name} vardiyası silinsin mi?`)) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from("shifts").delete().eq("id", s.id);
      if (error) throw error;
      toast.success("Silindi");
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Hata");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Vardiyalar</CardTitle>
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4" />
          Yeni Vardiya
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {shifts.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-3 bg-cream-100 rounded-sm"
              style={{ borderLeft: `4px solid ${s.color}` }}
            >
              <div>
                <p className="font-medium text-ink-900">{s.name}</p>
                <p className="text-xs text-ink-600 font-mono">
                  {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)} · {s.expected_hours} saat
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-danger hover:bg-red-50"
                  onClick={() => del(s)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Vardiyayı Düzenle" : "Yeni Vardiya"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Ad</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Başlangıç</Label>
                  <Input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bitiş</Label>
                  <Input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Beklenen Saat</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.expected_hours}
                    onChange={(e) => setForm({ ...form, expected_hours: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Renk</Label>
                  <Input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="h-10"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
              <Button onClick={save}>Kaydet</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function SecuritySettings() {
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const change = async () => {
    if (newPwd.length < 6) return toast.error("Şifre en az 6 karakter olmalı");
    if (newPwd !== confirm) return toast.error("Şifreler eşleşmiyor");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      toast.success("Şifre güncellendi");
      setOldPwd("");
      setNewPwd("");
      setConfirm("");
    } catch (e: any) {
      toast.error(e?.message || "Hata");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-cherry-700" />
          Şifre Değiştir
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-w-md">
        <div className="space-y-2">
          <Label>Yeni Şifre</Label>
          <Input
            type="password"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            placeholder="En az 6 karakter"
          />
        </div>
        <div className="space-y-2">
          <Label>Yeni Şifre (Tekrar)</Label>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <Button onClick={change} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Şifreyi Güncelle
        </Button>
      </CardContent>
    </Card>
  );
}

function DataSettings() {
  const [loading, setLoading] = useState(false);

  const backup = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const tables = [
        "departments",
        "employees",
        "shifts",
        "attendance",
        "leaves",
        "advances",
        "tips_pool",
        "tips_distribution",
        "monthly_payroll",
        "app_settings",
      ];
      const data: Record<string, any> = {};
      for (const t of tables) {
        const { data: rows, error } = await supabase.from(t).select("*");
        if (error) throw error;
        data[t] = rows;
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vianor-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Yedek indirildi");
    } catch (e: any) {
      toast.error(e?.message || "Yedek alınamadı");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-cherry-700" />
          Veri Yönetimi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-cream-100 rounded-sm p-4 space-y-2">
          <p className="text-sm text-ink-900 font-medium">Veritabanı Yedeği</p>
          <p className="text-xs text-ink-600">
            Tüm tabloları (personel, puantaj, izinler, avans, bahşiş, maaş, ayarlar) tek bir
            JSON dosyası olarak indirir.
          </p>
          <Button onClick={backup} disabled={loading} variant="outline">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            Yedek İndir (JSON)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
