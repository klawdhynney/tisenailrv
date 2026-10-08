import { useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, HelpCircle, Info, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useLoading } from "@/lib/loading-context";
import { cn } from "@/lib/utils";

export function ConfirmAction({
  children,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Voltar",
  onConfirm,
  onCancel,
  variant = "google-green",
  size,
  className,
  disabled = false,
  loadingText = "Processando...",
}: {
  children: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<unknown>;
  onCancel?: () => void | Promise<unknown>;
  variant?:
    | "default"
    | "outline"
    | "destructive"
    | "secondary"
    | "google-blue"
    | "google-red"
    | "google-yellow"
    | "google-green"
    | "google-purple";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  disabled?: boolean;
  loadingText?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const { wrapAsync, resetLoading, isLoading } = useLoading();

  const isDestructive = variant === "destructive" || variant === "google-red";

  const actionClass = isDestructive
    ? "bg-g-red text-white hover:bg-g-red/90 font-bold"
    : variant === "google-green" || variant === "default"
    ? "bg-g-green text-white hover:bg-g-green/90 font-bold"
    : variant === "google-blue"
    ? "bg-g-blue text-white hover:bg-g-blue/90 font-bold"
    : "";

  return (
    <AlertDialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) {
          setBusy(false);
          resetLoading();
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          className={className}
          disabled={disabled || busy || isLoading}
        >
          {children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md sm:max-w-[480px] p-6 sm:p-7 rounded-2xl gap-5 bg-card text-card-foreground border-border/80 shadow-2xl">
        {/* Ícone no topo */}
        <div className="flex justify-center pt-1">
          {isDestructive ? (
            <div className="flex size-14 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive shadow-xs dark:bg-destructive/20">
              <AlertTriangle className="size-7 shrink-0" aria-hidden="true" />
            </div>
          ) : variant === "google-green" || variant === "default" ? (
            <div className="flex size-14 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 shadow-xs dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="size-7 shrink-0" aria-hidden="true" />
            </div>
          ) : variant === "google-blue" ? (
            <div className="flex size-14 items-center justify-center rounded-2xl border border-blue-500/25 bg-blue-500/10 text-blue-600 shadow-xs dark:bg-blue-950/40 dark:text-blue-400">
              <Info className="size-7 shrink-0" aria-hidden="true" />
            </div>
          ) : (
            <div className="flex size-14 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10 text-amber-600 shadow-xs dark:bg-amber-950/40 dark:text-amber-400">
              <HelpCircle className="size-7 shrink-0" aria-hidden="true" />
            </div>
          )}
        </div>

        <AlertDialogHeader className="space-y-2 text-center sm:text-center px-1">
          <AlertDialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground text-center">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground text-center leading-relaxed">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3 pt-2">
          <AlertDialogCancel
            disabled={busy}
            className="w-full sm:w-auto min-h-[44px] rounded-xl font-semibold border-border hover:bg-muted mt-0 sm:mt-0"
            onClick={async () => {
              resetLoading();
              if (onCancel) {
                try {
                  await onCancel();
                } catch (e) {
                  console.error(e);
                }
              }
            }}
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={busy || isLoading}
            className={cn(
              "w-full sm:w-auto min-h-[44px] rounded-xl font-bold shadow-md",
              actionClass,
            )}
            onClick={async (event) => {
              event.preventDefault();
              if (busy || isLoading) return;
              setBusy(true);
              try {
                await wrapAsync(
                  async () => {
                    await onConfirm();
                  },
                  { text: loadingText },
                );
                setOpen(false);
              } catch (err) {
                console.error(err);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy || isLoading ? "Aguarde…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}