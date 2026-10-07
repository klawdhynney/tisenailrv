import { useState, type ReactNode } from "react";
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

  const actionClass =
    variant === "destructive" || variant === "google-red"
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
        <Button type="button" variant={variant} size={size} className={className} disabled={disabled || busy || isLoading}>
          {children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={busy}
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
            className={actionClass}
            onClick={async (event) => {
              event.preventDefault();
              if (busy || isLoading) return;
              setBusy(true);
              try {
                await wrapAsync(async () => {
                  await onConfirm();
                }, { text: loadingText });
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