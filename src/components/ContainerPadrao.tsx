import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ContainerPadraoProps extends HTMLAttributes<HTMLDivElement> {
  as?: "div" | "header" | "main" | "section" | "footer" | "nav";
}

/**
 * Contêiner unificado oficial do TI SENAI LRV.
 * Garante rigorosamente a mesma largura máxima (max-w-6xl) e o mesmo espaçamento lateral
 * (px-4 sm:px-6 lg:px-8) para o cabeçalho, a capa/banner, o corpo e o rodapé.
 */
export const ContainerPadrao = forwardRef<HTMLDivElement, ContainerPadraoProps>(
  ({ className, as: Component = "div", children, ...props }, ref) => {
    return (
      <Component
        ref={ref as any}
        className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

ContainerPadrao.displayName = "ContainerPadrao";
