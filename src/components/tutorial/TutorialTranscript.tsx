import React, { useState } from "react";
import { ChevronDown, FileText, CheckCircle2 } from "lucide-react";
import type { TutorialStep } from "@/content/tutorial-abrir-chamado";

interface TutorialTranscriptProps {
  steps: TutorialStep[];
  currentStepIndex: number;
  onSelectStep: (index: number) => void;
}

export function TutorialTranscript({
  steps,
  currentStepIndex,
  onSelectStep,
}: TutorialTranscriptProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-muted/40 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5">
          <FileText className="size-4 text-purple-600 dark:text-purple-400" />
          <span className="text-sm font-semibold text-foreground">
            Ler o passo a passo em texto
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            (Roteiro completo da narração para leitura acessível)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">
            {isOpen ? "Recolher" : "Expandir"}
          </span>
          <ChevronDown
            className={`size-4 text-muted-foreground transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="p-4 sm:p-5 border-t border-border/60 bg-muted/20 space-y-4 animate-in fade-in duration-200">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Abaixo você encontra a transcrição literal de cada etapa do tutorial de abertura de chamados da Central de TI SENAI Lucas do Rio Verde:
          </p>

          <div className="grid gap-3 sm:gap-3.5">
            {steps.map((st, idx) => {
              const isSelected = idx === currentStepIndex;
              return (
                <div
                  key={st.id}
                  onClick={() => onSelectStep(idx)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-purple-500/80 bg-purple-500/10 shadow-xs"
                      : "border-border/60 bg-background/80 hover:border-purple-300 dark:hover:border-purple-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isSelected
                            ? "bg-purple-600 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {st.id}
                      </span>
                      <h4 className="text-xs font-bold text-foreground">
                        {st.titulo}
                      </h4>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      ~{st.duracaoSegundos}s
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed pl-7">
                    &ldquo;{st.narracao}&rdquo;
                  </p>
                </div>
              );
            })}
          </div>

          <div className="pt-2 text-[11px] text-muted-foreground flex items-center gap-1.5 border-t border-border/40">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            <span>
              Ao concluir o chamado, o status será atualizado pela TI e você poderá registrar sua nota de satisfação de 1 a 5 estrelas.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
