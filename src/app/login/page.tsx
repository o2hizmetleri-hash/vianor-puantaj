"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Wine, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().email("Geçerli bir e-posta giriniz"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) throw error;
      toast.success("Giriş başarılı, hoş geldiniz");
      // Hard reload — cookie'lerin server'a ulaşmasını garanti eder
      window.location.href = "/";
    } catch (err: any) {
      toast.error(err?.message || "Giriş başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-grain p-4">
      {/* Decorative corners */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-cherry-700/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-cherry-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white rounded-lg shadow-warm border-2 border-cherry-700/20 overflow-hidden">
          <div className="bg-cherry-900 px-8 py-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-cherry-500/40 blur-2xl" />
            </div>
            <Wine className="relative mx-auto h-10 w-10 text-cream-300 mb-3" />
            <h1 className="relative font-serif text-4xl text-cream-50 tracking-wide">VIANOR</h1>
            <p className="relative font-serif italic text-sm text-cream-300 mt-1">
              Maison de Viande
            </p>
            <div className="relative gold-line mt-4 mx-auto w-32" />
            <p className="relative text-xs uppercase tracking-[0.25em] text-cream-200 mt-3">
              Personel Yönetim Sistemi
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-8 space-y-5">
            <div className="text-center mb-2">
              <h2 className="font-serif text-2xl text-ink-900">Hoş Geldiniz</h2>
              <p className="text-sm text-ink-600 mt-1">Yönetici hesabınız ile giriş yapın</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-600/50" />
                <Input
                  id="email"
                  type="email"
                  placeholder="ornek@vianor.com"
                  className="pl-9"
                  autoComplete="email"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-danger">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-600/50" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  autoComplete="current-password"
                  {...register("password")}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-danger">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" size="xl" className="w-full mt-2" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Giriş yapılıyor…
                </>
              ) : (
                "Giriş Yap"
              )}
            </Button>

            <div className="gold-line mt-6" />
            <p className="text-center text-xs text-ink-600 font-serif italic">
              "Her ayrıntı, her dakika önemlidir."
            </p>
          </form>
        </div>

        <p className="text-center text-xs text-ink-600 mt-4">
          © {new Date().getFullYear()} Vianor Maison de Viande
        </p>
      </div>
    </div>
  );
}
