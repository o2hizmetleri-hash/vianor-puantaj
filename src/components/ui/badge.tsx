import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-cherry-100 text-cherry-800",
        secondary: "bg-cream-200 text-ink-900",
        destructive: "bg-red-100 text-danger",
        success: "bg-green-100 text-success",
        warning: "bg-amber-100 text-warning",
        outline: "border border-cream-300 text-ink-900",
        cherry: "bg-cherry-700 text-cream-50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
