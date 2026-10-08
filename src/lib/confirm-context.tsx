import React, { createContext, useContext, useState, useRef, useCallback } from "react";
import {
  ConfirmDialog,
  type ConfirmOptions,
  type PromptOptions,
  type ConfirmButtonVariant,
  type ConfirmIconType,
} from "@/components/ConfirmDialog";

export interface ConfirmFn {
  (optionsOrTitle: string | ConfirmOptions, description?: string): Promise<boolean>;
  confirm: (optionsOrTitle: string | ConfirmOptions, description?: string) => Promise<boolean>;
  prompt: (optionsOrTitle: string | PromptOptions, defaultValue?: string) => Promise<string | null>;
}

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isPrompt, setIsPrompt] = useState(false);
  const [dialogOptions, setDialogOptions] = useState<{
    title: string;
    description?: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: ConfirmButtonVariant;
    icon?: ConfirmIconType;
    promptPlaceholder?: string;
    promptDefaultValue?: string;
  }>({
    title: "Confirmar ação",
  });

  const resolverRef = useRef<((val: any) => void) | null>(null);

  const showConfirm = useCallback(
    (optionsOrTitle: string | ConfirmOptions, maybeDescription?: string): Promise<boolean> => {
      const opts: ConfirmOptions =
        typeof optionsOrTitle === "string"
          ? {
              title: optionsOrTitle,
              description: maybeDescription,
              confirmLabel: "Confirmar",
              cancelLabel: "Cancelar",
            }
          : optionsOrTitle;

      return new Promise<boolean>((resolve) => {
        // Se já havia um diálogo pendente, resolve como cancelado antes de abrir o novo
        if (resolverRef.current) {
          resolverRef.current(false);
        }
        resolverRef.current = resolve;

        setDialogOptions({
          title: opts.title,
          description: opts.description,
          confirmLabel: opts.confirmLabel || opts.confirmText || "Confirmar",
          cancelLabel: opts.cancelLabel || opts.cancelText || "Cancelar",
          variant: opts.variant,
          icon: opts.icon,
        });
        setIsPrompt(false);
        setOpen(true);
      });
    },
    [],
  );

  const showPrompt = useCallback(
    (optionsOrTitle: string | PromptOptions, maybeDefault?: string): Promise<string | null> => {
      const opts: PromptOptions =
        typeof optionsOrTitle === "string"
          ? {
              title: optionsOrTitle,
              defaultValue: maybeDefault,
              confirmLabel: "OK",
              cancelLabel: "Cancelar",
            }
          : optionsOrTitle;

      return new Promise<string | null>((resolve) => {
        if (resolverRef.current) {
          resolverRef.current(null);
        }
        resolverRef.current = resolve;

        setDialogOptions({
          title: opts.title,
          description: opts.description,
          confirmLabel: opts.confirmLabel || opts.confirmText || "Confirmar",
          cancelLabel: opts.cancelLabel || opts.cancelText || "Cancelar",
          variant: opts.variant || "default",
          icon: opts.icon || "question",
          promptPlaceholder: opts.placeholder,
          promptDefaultValue: opts.defaultValue || "",
        });
        setIsPrompt(true);
        setOpen(true);
      });
    },
    [],
  );

  const handleConfirm = useCallback(() => {
    setOpen(false);
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  }, []);

  const handlePromptSubmit = useCallback((value: string) => {
    setOpen(false);
    if (resolverRef.current) {
      resolverRef.current(value);
      resolverRef.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    setOpen(false);
    if (resolverRef.current) {
      resolverRef.current(isPrompt ? null : false);
      resolverRef.current = null;
    }
  }, [isPrompt]);

  const confirmFn = React.useMemo(() => {
    const fn = ((optionsOrTitle: string | ConfirmOptions, desc?: string) =>
      showConfirm(optionsOrTitle, desc)) as ConfirmFn;
    fn.confirm = showConfirm;
    fn.prompt = showPrompt;
    return fn;
  }, [showConfirm, showPrompt]);

  return (
    <ConfirmContext.Provider value={confirmFn}>
      {children}
      <ConfirmDialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleCancel();
        }}
        title={dialogOptions.title}
        description={dialogOptions.description}
        confirmLabel={dialogOptions.confirmLabel}
        cancelLabel={dialogOptions.cancelLabel}
        variant={dialogOptions.variant}
        icon={dialogOptions.icon}
        isPrompt={isPrompt}
        promptPlaceholder={dialogOptions.promptPlaceholder}
        promptDefaultValue={dialogOptions.promptDefaultValue}
        onConfirm={handleConfirm}
        onPromptSubmit={handlePromptSubmit}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm deve ser utilizado dentro de um ConfirmProvider");
  }
  return context;
}
