"use client";

import { useEffect, useState } from "react";
import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface TopbarProps {
  restaurantName?: string;
  onMenuClick?: () => void;
}

export function Topbar({ restaurantName = "Vianor Maison de Viande", onMenuClick }: TopbarProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const i = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(i);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/85 backdrop-blur border-b border-cream-300 flex items-center justify-between px-4 md:px-8 shadow-soft">
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
          aria-label="Menüyü aç"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <p className="text-xs text-ink-600 leading-none">Hoş geldiniz</p>
          <h2 className="font-serif text-lg text-cherry-800 truncate leading-tight">
            {restaurantName}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {now && (
          <div className="text-right hidden sm:block">
            <p className="font-serif text-sm text-cherry-800 leading-none">
              {format(now, "dd MMMM yyyy", { locale: tr })}
            </p>
            <p className="text-xs text-ink-600 mt-0.5 font-mono">
              {format(now, "HH:mm")}
            </p>
          </div>
        )}
        <div className="relative">
          <Button variant="ghost" size="icon" aria-label="Bildirimler">
            <Bell className="h-5 w-5 text-ink-900" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-cherry-700" />
          </Button>
        </div>
      </div>
    </header>
  );
}
