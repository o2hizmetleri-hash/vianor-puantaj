import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-cherry-700 text-cream-50 hover:bg-cherry-600 active:bg-cherry-800 shadow-sm",
        destructive:
          "bg-danger text-cream-50 hover:bg-danger/90",
        outline:
          "border border-cream-300 bg-white hover:bg-cream-100 text-ink-900",
        secondary:
          "bg-cream-200 text-ink-900 hover:bg-cream-300",
        ghost:
          "hover:bg-cream-200 text-ink-900",
        link:
          "text-cherry-700 underline-offset-4 hover:underline",
        sidebar:
          "text-cream-100 hover:bg-cherry-800 hover:text-cream-50 justify-start",
        sidebarActive:
          "bg-cherry-700 text-cream-50 justify-start shadow-sm",
        success:
          "bg-success text-cream-50 hover:bg-success/90",
        warning:
          "bg-warning text-cream-50 hover:bg-warning/90",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-sm px-3 text-xs",
        lg: "h-11 rounded-sm px-6 text-base",
        xl: "h-12 rounded-sm px-8 text-base font-semibold",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
