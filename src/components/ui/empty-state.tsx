import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
      <div className="rounded-full bg-cream-200 p-5 mb-4">
        <Icon className="h-8 w-8 text-cherry-700" />
      </div>
      <h3 className="font-serif text-xl text-ink-900 mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-ink-600 max-w-md mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}
