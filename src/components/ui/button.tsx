import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-border/80 bg-background/50 text-foreground font-semibold shadow-sm hover:bg-accent hover:text-foreground hover:border-foreground/40",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        "google-blue":
          "border border-transparent bg-g-blue text-white font-bold shadow-md hover:brightness-110 active:scale-[0.98] transition-all",
        "google-red":
          "border border-transparent bg-g-red text-white font-bold shadow-md hover:brightness-110 active:scale-[0.98] transition-all",
        "google-yellow":
          "border border-transparent bg-g-yellow text-zinc-950 font-extrabold shadow-md hover:brightness-110 active:scale-[0.98] transition-all",
        "google-green":
          "border border-transparent bg-g-green text-white font-bold shadow-md hover:brightness-110 active:scale-[0.98] transition-all",
        "google-purple":
          "border border-transparent bg-g-purple text-white font-bold shadow-md hover:brightness-110 active:scale-[0.98] transition-all",
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
