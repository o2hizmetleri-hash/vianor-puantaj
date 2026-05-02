import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6", className)}>
      <div>
        <h1 className="font-serif text-3xl md:text-4xl text-ink-900 leading-tight">{title}</h1>
        {description && <p className="text-sm text-ink-600 mt-1.5">{description}</p>}
        <div className="gold-line w-32 mt-3" />
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
