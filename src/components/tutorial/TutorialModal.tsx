import React, { useEffect, useRef } from "react";
import { X, Sparkles } from "lucide-react";
import { TutorialPlayer } from "./TutorialPlayer";

import { tutorialAudio } from "./tutorial-audio-manager";

interface TutorialModalProps {
  open: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

export function TutorialModal({ open, onClose, triggerRef }: TutorialModalProps) {
  const modalContentRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const handleClose = () => {
    tutorialAudio.releaseOwner("tutorial-modal");
    onClose();
  };

  // Garante liberação imediata do áudio da janela modal ao fechar ou desmontar
  useEffect(() => {
    if (!open) {
      tutorialAudio.releaseOwner("tutorial-modal");
    }
    return () => {
      tutorialAudio.releaseOwner("tutorial-modal");
    };
  }, [open]);

  // Fecha com a tecla ESC e prende o foco
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Gerenciamento de foco: ao fechar, devolve o foco para o botão de origem
  useEffect(() => {
    if (!open && triggerRef?.current) {
      triggerRef.current.focus();
    }
  }, [open, triggerRef]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        // Fecha com clique fora
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        ref={modalContentRef}
        className="relative w-full max-w-4xl max-h-[92vh] rounded-3xl border border-border/80 bg-background/95 p-4 sm:p-6 shadow-2xl backdrop-blur-md overflow-y-auto animate-in zoom-in-95 duration-200 flex flex-col space-y-3"
      >
        {/* Cabeçalho do Diálogo */}
        <div className="flex items-center justify-between pb-2 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-purple-600/10 text-purple-600 dark:text-purple-400">
              <Sparkles className="size-4" />
            </span>
            <h2 id="tutorial-modal-title" className="text-base sm:text-lg font-bold text-foreground">
              Demonstração: Como abrir um chamado de TI
            </h2>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            className="size-8 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fechar tutorial"
            title="Fechar (Esc)"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Player interativo com início imediato ao abrir modal */}
        <div className="w-full flex-1 min-h-0">
          <TutorialPlayer autoStart={true} isModal={true} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
export default TutorialModal;
