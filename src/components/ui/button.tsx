import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--btn-primary-bg,var(--primary))] text-[var(--btn-primary-text,var(--primary-foreground))] shadow hover:bg-[var(--btn-primary-hover,var(--primary)/90)]",
        destructive:
          "bg-[var(--btn-perigo-bg,var(--destructive))] text-[var(--btn-perigo-text,var(--destructive-foreground))] shadow-sm hover:bg-[var(--btn-perigo-hover,var(--destructive)/90)]",
        outline:
          "border border-[var(--btn-outline-border,var(--border)/80)] bg-[var(--btn-outline-bg,var(--background)/50)] text-[var(--btn-outline-text,var(--foreground))] font-semibold shadow-sm hover:bg-[var(--btn-outline-hover-bg,var(--accent))] hover:text-[var(--btn-outline-hover-text,var(--foreground))] hover:border-foreground/40",
        secondary:
          "bg-[var(--btn-secondary-bg,var(--secondary))] text-[var(--btn-secondary-text,var(--secondary-foreground))] shadow-sm hover:bg-[var(--btn-secondary-hover,var(--secondary)/80)]",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        "google-blue":
          "border border-transparent bg-[var(--btn-destaque-bg,var(--g-blue))] text-[var(--btn-destaque-text,white)] font-bold shadow-md hover:bg-[var(--btn-destaque-hover,var(--g-blue))] hover:brightness-110 active:scale-[0.98] transition-all",
        "google-red":
          "border border-transparent bg-[var(--btn-cat-setores-bg,var(--g-red))] text-[var(--btn-cat-setores-text,white)] font-bold shadow-md hover:bg-[var(--btn-cat-setores-hover,var(--g-red))] hover:brightness-110 active:scale-[0.98] transition-all",
        "google-yellow":
          "border border-transparent bg-[var(--btn-cat-prioridades-bg,var(--g-yellow))] text-[var(--btn-cat-prioridades-text,#09090b)] font-extrabold shadow-md hover:bg-[var(--btn-cat-prioridades-hover,var(--g-yellow))] hover:brightness-110 active:scale-[0.98] transition-all",
        "google-green":
          "border border-transparent bg-[var(--btn-sucesso-bg,var(--g-green))] text-[var(--btn-sucesso-text,white)] font-bold shadow-md hover:bg-[var(--btn-sucesso-hover,var(--g-green))] hover:brightness-110 active:scale-[0.98] transition-all",
        "google-purple":
          "border border-transparent bg-[var(--btn-cat-sla-bg,var(--g-purple))] text-[var(--btn-cat-sla-text,white)] font-bold shadow-md hover:bg-[var(--btn-cat-sla-hover,var(--g-purple))] hover:brightness-110 active:scale-[0.98] transition-all",
      },
      size: {
        default: "min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-4 py-2",
        sm: "min-h-[40px] sm:min-h-[32px] h-10 sm:h-8 rounded-xl px-3 text-xs",
        lg: "min-h-[48px] h-12 sm:h-10 rounded-xl px-8",
        icon: "min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] h-11 w-11 sm:h-9 sm:w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
