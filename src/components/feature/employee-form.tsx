"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, Trash2, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Department, Employee } from "@/lib/types";

const schema = z.object({
  full_name: z.string().min(2, "Ad soyad en az 2 karakter"),
  phone: z.string().optional().nullable(),
  email: z.string().email("Geçerli e-posta giriniz").optional().or(z.literal("")),
  national_id: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  department_id: z.string().optional().nullable(),
  monthly_salary: z.coerce.number().min(0, "0 veya üzeri"),
  hourly_overtime_rate: z.coerce.number().min(0, "0 veya üzeri"),
  start_date: z.string().min(1, "Tarih giriniz"),
  end_date: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  notes: z.string().optional().nullable(),
  photo_url: z.string().optional().nullable(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  departments: Department[];
  employee?: Employee;
}

const POSITIONS = ["Şef", "Sous Şef", "Şef Garson", "Garson", "Komi", "Barmen", "Bulaşıkçı", "Yönetici", "Diğer"];

export function EmployeeForm({ departments, employee }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: employee?.full_name || "",
      phone: employee?.phone || "",
      email: employee?.email || "",
      national_id: employee?.national_id || "",
      position: employee?.position || "",
      department_id: employee?.department_id || "",
      monthly_salary: employee?.monthly_salary || 0,
      hourly_overtime_rate: employee?.hourly_overtime_rate || 0,
      start_date: employee?.start_date || new Date().toISOString().slice(0, 10),
      end_date: employee?.end_date || "",
      is_active: employee?.is_active ?? true,
      notes: employee?.notes || "",
      photo_url: employee?.photo_url || "",
    },
  });

  const watchedDept = watch("department_id");
  const watchedPosition = watch("position");
  const watchedActive = watch("is_active");
  const watchedPhoto = watch("photo_url");
  const watchedName = watch("full_name");

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const supabase = createClient();
      const payload: any = {
        ...data,
        phone: data.phone || null,
        email: data.email || null,
        national_id: data.national_id || null,
        position: data.position || null,
        department_id: data.department_id || null,
        end_date: data.end_date || null,
        notes: data.notes || null,
        photo_url: data.photo_url || null,
      };
      if (employee) {
        const { error } = await supabase
          .from("employees")
          .update(payload)
          .eq("id", employee.id);
        if (error) throw error;
        toast.success("Personel güncellendi");
      } else {
        const { error } = await supabase.from("employees").insert(payload);
        if (error) throw error;
        toast.success("Personel eklendi");
      }
      router.push("/personel");
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Kayıt sırasında hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!employee) return;
    if (!confirm(`${employee.full_name} kaydı silinsin mi? Bu işlem geri alınamaz.`)) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from("employees").delete().eq("id", employee.id);
      if (error) throw error;
      toast.success("Personel silindi");
      router.push("/personel");
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Silme sırasında hata");
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Dosya 2 MB'tan büyük olamaz");
      return;
    }
    setPhotoUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("employee-photos")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("employee-photos").getPublicUrl(path);
      setValue("photo_url", data.publicUrl, { shouldDirty: true });
      toast.success("Fotoğraf yüklendi");
    } catch (e: any) {
      toast.error(
        "Fotoğraf yüklenemedi. 'employee-photos' adlı public bir Supabase Storage bucket'ı oluşturduğunuzdan emin olun."
      );
    } finally {
      setPhotoUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Kişisel Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="full_name">Ad Soyad *</Label>
                <Input id="full_name" {...register("full_name")} placeholder="örn. Mehmet Yılmaz" />
                {errors.full_name && <p className="text-xs text-danger">{errors.full_name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input id="phone" {...register("phone")} placeholder="0532 555 0000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input id="email" type="email" {...register("email")} placeholder="ornek@vianor.com" />
                {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="national_id">TC Kimlik No</Label>
                <Input id="national_id" {...register("national_id")} maxLength={11} placeholder="11 haneli" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Pozisyon</Label>
                <Select
                  value={watchedPosition || ""}
                  onValueChange={(v) => setValue("position", v, { shouldDirty: true })}
                >
                  <SelectTrigger><SelectValue placeholder="Pozisyon seçin" /></SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department_id">Departman</Label>
                <Select
                  value={watchedDept || ""}
                  onValueChange={(v) => setValue("department_id", v, { shouldDirty: true })}
                >
                  <SelectTrigger><SelectValue placeholder="Departman seçin" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">İşe Başlama *</Label>
                <Input id="start_date" type="date" {...register("start_date")} />
                {errors.start_date && <p className="text-xs text-danger">{errors.start_date.message}</p>}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthly_salary">Aylık Sabit Maaş (₺) *</Label>
                <Input
                  id="monthly_salary"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("monthly_salary")}
                />
                {errors.monthly_salary && (
                  <p className="text-xs text-danger">{errors.monthly_salary.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="hourly_overtime_rate">Mesai Saat Ücreti (₺/saat)</Label>
                <Input
                  id="hourly_overtime_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("hourly_overtime_rate")}
                />
              </div>
            </div>

            {employee && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="end_date">İşten Çıkış Tarihi</Label>
                  <Input id="end_date" type="date" {...register("end_date")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="is_active">Durum</Label>
                  <Select
                    value={watchedActive ? "active" : "passive"}
                    onValueChange={(v) => setValue("is_active", v === "active", { shouldDirty: true })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Aktif</SelectItem>
                      <SelectItem value="passive">Pasif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notlar</Label>
              <Textarea id="notes" rows={3} {...register("notes")} placeholder="Personel hakkında notlar..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fotoğraf</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-32 w-32 ring-4 ring-cherry-700/10">
                {watchedPhoto && <AvatarImage src={watchedPhoto} alt="" />}
                <AvatarFallback className="text-3xl">
                  {(watchedName || "??")
                    .split(" ")
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <Label htmlFor="photo" className="cursor-pointer">
                <div className="inline-flex items-center gap-2 text-sm text-cherry-700 hover:text-cherry-600 px-3 py-2 border border-cream-300 rounded-sm bg-cream-50 hover:bg-cream-100 transition">
                  {photoUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {photoUploading ? "Yükleniyor..." : "Fotoğraf Yükle"}
                </div>
                <input
                  id="photo"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={photoUploading}
                />
              </Label>
              {watchedPhoto && (
                <button
                  type="button"
                  onClick={() => setValue("photo_url", "", { shouldDirty: true })}
                  className="text-xs text-ink-600 hover:text-danger"
                >
                  Fotoğrafı kaldır
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {employee ? "Kaydet" : "Personel Ekle"}
        </Button>
        {employee && (
          <Button type="button" variant="outline" onClick={handleDelete} className="text-danger hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
            Sil
          </Button>
        )}
      </div>
    </form>
  );
}
