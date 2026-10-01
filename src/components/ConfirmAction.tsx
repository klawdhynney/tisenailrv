import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function ConfirmAction({
  children,
  title,
  description,
  confirmLabel = "Confirmar",
  onConfirm,
  variant = "google-green",
  disabled = false,
}: {
  children: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<unknown>;
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
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const actionClass =
    variant === "destructive" || variant === "google-red"
      ? "bg-g-red text-white hover:bg-g-red/90 font-bold"
      : variant === "google-green" || variant === "default"
      ? "bg-g-green text-white hover:bg-g-green/90 font-bold"
      : variant === "google-blue"
      ? "bg-g-blue text-white hover:bg-g-blue/90 font-bold"
      : "";

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant={variant} disabled={disabled}>
          {children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Voltar</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            className={actionClass}
            onClick={async (event) => {
              event.preventDefault();
              if (busy) return;
              setBusy(true);
              try {
                await onConfirm();
                setOpen(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Aguarde…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}