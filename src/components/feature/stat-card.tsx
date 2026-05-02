import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  variant?: "default" | "success" | "danger" | "warning" | "cherry";
  hint?: string;
  className?: string;
}

const variantStyles: Record<NonNullable<StatCardProps["variant"]>, { bg: string; iconBg: string; iconColor: string; valueColor: string }> = {
  default: {
    bg: "bg-white border-cream-300",
    iconBg: "bg-cream-200",
    iconColor: "text-cherry-700",
    valueColor: "text-ink-900",
  },
  success: {
    bg: "bg-white border-cream-300",
    iconBg: "bg-green-50",
    iconColor: "text-success",
    valueColor: "text-success",
  },
  danger: {
    bg: "bg-white border-cream-300",
    iconBg: "bg-red-50",
    iconColor: "text-danger",
    valueColor: "text-danger",
  },
  warning: {
    bg: "bg-white border-cream-300",
    iconBg: "bg-amber-50",
    iconColor: "text-warning",
    valueColor: "text-warning",
  },
  cherry: {
    bg: "bg-cherry-900 border-cherry-800",
    iconBg: "bg-cherry-700/40",
    iconColor: "text-cream-200",
    valueColor: "text-cream-50",
  },
};

export function StatCard({ label, value, icon: Icon, variant = "default", hint, className }: StatCardProps) {
  const s = variantStyles[variant];
  const isCherry = variant === "cherry";

  return (
    <div
      className={cn(
        "rounded-lg border p-5 shadow-soft transition-all hover:shadow-warm",
        s.bg,
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("text-xs uppercase tracking-wide font-medium", isCherry ? "text-cream-300" : "text-ink-600")}>
            {label}
          </p>
          <p className={cn("font-serif text-3xl mt-2 leading-tight font-semibold", s.valueColor)}>
            {value}
          </p>
          {hint && (
            <p className={cn("text-xs mt-1.5", isCherry ? "text-cream-300/80" : "text-ink-600")}>
              {hint}
            </p>
          )}
        </div>
        <div className={cn("p-2.5 rounded-md", s.iconBg)}>
          <Icon className={cn("h-5 w-5", s.iconColor)} />
        </div>
      </div>
    </div>
  );
}
