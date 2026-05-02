"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarDays,
  Plane,
  Wallet,
  Wine,
  Banknote,
  FileBarChart,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/personel", label: "Personel", icon: Users },
  { href: "/puantaj", label: "Puantaj", icon: CalendarCheck },
  { href: "/vardiya", label: "Vardiya", icon: CalendarDays },
  { href: "/izinler", label: "İzinler", icon: Plane },
  { href: "/avans", label: "Avans", icon: Wallet },
  { href: "/bahsis", label: "Bahşiş", icon: Wine },
  { href: "/maas", label: "Maaş", icon: Banknote },
  { href: "/raporlar", label: "Raporlar", icon: FileBarChart },
  { href: "/ayarlar", label: "Ayarlar", icon: Settings },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success("Çıkış yapıldı");
      window.location.href = "/login";
    } catch (e) {
      toast.error("Çıkış sırasında hata oluştu");
    }
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-cherry-900/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "bg-sidebar text-cream-100 fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform md:translate-x-0 md:relative md:inset-auto md:flex",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Yan menü"
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 md:hidden">
          <span className="font-serif text-xl text-cream-50">VIANOR</span>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-cream-100 hover:bg-cherry-800">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="hidden md:block px-6 pt-8 pb-6">
          <Link href="/" className="block">
            <h1 className="font-serif text-3xl text-cream-50 tracking-wide leading-none">
              VIANOR
            </h1>
            <p className="font-serif italic text-sm text-cream-400 mt-1">
              Maison de Viande
            </p>
            <div className="gold-line mt-3" />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm transition-colors group",
                  isActive
                    ? "bg-cherry-700 text-cream-50 shadow-sm"
                    : "text-cream-100 hover:bg-cherry-800 hover:text-cream-50"
                )}
              >
                <Icon className={cn("h-4 w-4 transition-transform", isActive && "scale-110")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-cherry-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-sm w-full text-sm text-cream-100 hover:bg-cherry-800 hover:text-cream-50 transition-colors"
            aria-label="Çıkış yap"
          >
            <LogOut className="h-4 w-4" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>
    </>
  );
}
