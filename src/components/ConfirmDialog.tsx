import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  HelpCircle,
  Info,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { Button, type buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

export type ConfirmButtonVariant = NonNullable<
  VariantProps<typeof buttonVariants>["variant"]
>;

export type ConfirmIconType =
  | "warning"
  | "danger"
  | "destructive"
  | "info"
  | "question"
  | "success";

export interface ConfirmOptions {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  cancelText?: string;
  variant?: ConfirmButtonVariant;
  icon?: ConfirmIconType;
}

export interface PromptOptions extends ConfirmOptions {
  placeholder?: string;
  defaultValue?: string;
}

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmButtonVariant;
  icon?: ConfirmIconType;
  isPrompt?: boolean;
  promptPlaceholder?: string;
  promptDefaultValue?: string;
  onConfirm?: () => void | Promise<void>;
  onPromptSubmit?: (value: string) => void | Promise<void>;
  onCancel?: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant,
  icon,
  isPrompt = false,
  promptPlaceholder = "",
  promptDefaultValue = "",
  onConfirm,
  onPromptSubmit,
  onCancel,
}: ConfirmDialogProps) {
  const safeButtonRef = React.useRef<HTMLButtonElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [promptValue, setPromptValue] = React.useState(promptDefaultValue);

  // Sincroniza o valor inicial do prompt sempre que abrir
  React.useEffect(() => {
    if (open) {
      setPromptValue(promptDefaultValue || "");
    }
  }, [open, promptDefaultValue]);

  // Determina variante de ação e ícone inteligente
  const resolvedVariant: ConfirmButtonVariant = React.useMemo(() => {
    if (variant) return variant;
    if (icon === "danger" || icon === "destructive") return "destructive";
    if (icon === "warning") return "destructive";
    if (icon === "success") return "google-green";
    return "default";
  }, [variant, icon]);

  const resolvedIcon: ConfirmIconType = React.useMemo(() => {
    if (icon) return icon;
    if (
      resolvedVariant === "destructive" ||
      resolvedVariant === "google-red"
    ) {
      return "danger";
    }
    if (resolvedVariant === "google-green") return "success";
    if (resolvedVariant === "google-blue") return "info";
    return "warning";
  }, [icon, resolvedVariant]);

  const iconInfo = React.useMemo(() => {
    switch (resolvedIcon) {
      case "danger":
      case "destructive":
        return {
          icon: resolvedVariant === "google-red" ? Trash2 : AlertTriangle,
          badgeClass:
            "bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/20",
        };
      case "warning":
        return {
          icon: AlertTriangle,
          badgeClass:
            "bg-amber-500/10 text-amber-600 border-amber-500/25 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-500/20",
        };
      case "info":
        return {
          icon: Info,
          badgeClass:
            "bg-blue-500/10 text-blue-600 border-blue-500/25 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-500/20",
        };
      case "question":
        return {
          icon: HelpCircle,
          badgeClass:
            "bg-sky-500/10 text-sky-600 border-sky-500/25 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-500/20",
        };
      case "success":
        return {
          icon: CheckCircle2,
          badgeClass:
            "bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-500/20",
        };
    }
  }, [resolvedIcon, resolvedVariant]);

  const IconComponent = iconInfo.icon;
  const titleId = React.useId();
  const descId = React.useId();

  const handleCancelClick = () => {
    onOpenChange(false);
    onCancel?.();
  };

  const handleConfirmClick = () => {
    if (isPrompt) {
      onPromptSubmit?.(promptValue);
    } else {
      onConfirm?.();
    }
    onOpenChange(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Overlay escurecido com leve desfoque no fundo */}
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/60 backdrop-blur-xs",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "motion-reduce:animate-none duration-200",
          )}
        />

        {/* Conteúdo centralizado na horizontal e na vertical */}
        <DialogPrimitive.Content
          role="alertdialog"
          aria-labelledby={titleId}
          aria-describedby={descId}
          onEscapeKeyDown={() => handleCancelClick()}
          onPointerDownOutside={() => handleCancelClick()}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            if (isPrompt) {
              inputRef.current?.focus();
              inputRef.current?.select();
            } else {
              // Foco inicial sempre no botão seguro (o que não destrói dados)
              safeButtonRef.current?.focus();
            }
          }}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
            // Responsivo: quase toda a largura no celular com margens, max-w-md no desktop
            "w-[calc(100%-2rem)] max-w-md sm:max-w-[480px]",
            "grid gap-5 rounded-2xl border border-border/80 bg-card p-6 sm:p-7 shadow-2xl",
            "text-card-foreground",
            // Animação suave respeitando prefers-reduced-motion
            "duration-200",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "motion-reduce:animate-none",
          )}
        >
          {/* Ícone no topo com badge arredondado */}
          <div className="flex justify-center pt-1">
            <div
              className={cn(
                "flex size-14 items-center justify-center rounded-2xl border shadow-xs transition-transform duration-200",
                iconInfo.badgeClass,
              )}
            >
              <IconComponent className="size-7 shrink-0" aria-hidden="true" />
            </div>
          </div>

          {/* Título e mensagem descritiva */}
          <div className="space-y-2 text-center px-1">
            <DialogPrimitive.Title
              id={titleId}
              className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-snug"
            >
              {title}
            </DialogPrimitive.Title>

            {description && (
              <DialogPrimitive.Description
                id={descId}
                className="text-xs sm:text-sm text-muted-foreground leading-relaxed"
              >
                {description}
              </DialogPrimitive.Description>
            )}
          </div>

          {/* Campo de prompt para digitação, se aplicável */}
          {isPrompt && (
            <div className="px-1">
              <Input
                ref={inputRef}
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleConfirmClick();
                  }
                }}
                placeholder={promptPlaceholder}
                className="h-11 rounded-xl text-sm bg-background border-border"
              />
            </div>
          )}

          {/* Botões empilhados no celular e lado a lado no desktop */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3 pt-2">
            {/* Botão seguro (foco inicial) */}
            <Button
              ref={safeButtonRef}
              type="button"
              variant="outline"
              size="default"
              onClick={handleCancelClick}
              className="w-full sm:w-auto min-h-[44px] rounded-xl font-semibold border-border hover:bg-muted"
            >
              {cancelLabel}
            </Button>

            {/* Botão principal de ação */}
            <Button
              type="button"
              variant={resolvedVariant}
              size="default"
              onClick={handleConfirmClick}
              className="w-full sm:w-auto min-h-[44px] rounded-xl font-bold shadow-md"
            >
              {confirmLabel}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
