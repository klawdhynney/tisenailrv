import { useState, useMemo, useRef, useEffect } from "react";
import { Filter, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { obterDataHojeCuiaba } from "@/lib/types";

export const NOMES_MESES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export function formatarChaveMes(chave: string): string {
  if (!chave || chave === "todos") return "Todos os meses";
  const [anoStr, mesStr] = chave.split("-");
  const ano = parseInt(anoStr, 10);
  const mes = parseInt(mesStr, 10);
  if (!ano || !mes || mes < 1 || mes > 12) return chave;
  return `${NOMES_MESES_PT[mes - 1]}/${ano}`;
}

export function obterMesesParaFiltro(tickets?: { abertoEm?: string }[]): { key: string; label: string }[] {
  // Mês atual calculado no fuso de Lucas do Rio Verde (America/Cuiaba)
  const mesAtualKey = obterDataHojeCuiaba().slice(0, 7);
  const keysSet = new Set<string>();
  keysSet.add(mesAtualKey);

  if (Array.isArray(tickets)) {
    for (const t of tickets) {
      if (t?.abertoEm && /^\d{4}-\d{2}/.test(t.abertoEm)) {
        keysSet.add(t.abertoEm.slice(0, 7));
      }
    }
  }

  // Ordenar decrescente: do mais recente para o mais antigo
  const ordenados = Array.from(keysSet).sort((a, b) => b.localeCompare(a));

  return ordenados.map((key) => ({
    key,
    label: formatarChaveMes(key),
  }));
}

export interface FiltroMesProps {
  valor: string; // "todos" ou "YYYY-MM"
  onChange: (mes: string) => void;
  tickets?: { abertoEm?: string }[];
  className?: string;
  id?: string;
}

export function FiltroMes({
  valor,
  onChange,
  tickets,
  className,
  id = "filtro-mes",
}: FiltroMesProps) {
  const [aberto, setAberto] = useState(false);
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const listaMeses = useMemo(() => obterMesesParaFiltro(tickets), [tickets]);

  // Rótulo exibido dentro do botão
  const rotuloExibido =
    valor === "todos"
      ? "Mês: Todos"
      : `Mês: ${listaMeses.find((m) => m.key === valor)?.label || formatarChaveMes(valor)}`;

  const totalOpcoes = listaMeses.length + 1; // "todos" + lista de meses

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = (index + 1) % totalOpcoes;
      itemsRef.current[nextIndex]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = (index - 1 + totalOpcoes) % totalOpcoes;
      itemsRef.current[prevIndex]?.focus();
    }
  };

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-label="Filtrar por mês"
          aria-haspopup="dialog"
          aria-expanded={aberto}
          className={cn(
            "h-9 px-3 rounded-xl text-xs font-semibold border border-input bg-background hover:bg-muted text-foreground shadow-2xs gap-1.5 shrink-0 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-g-blue focus-visible:ring-offset-1",
            valor !== "todos" && "border-g-blue/60 bg-g-blue/5 text-g-blue font-bold",
            className
          )}
          title={`Filtrar por mês (selecionado: ${formatarChaveMes(valor)})`}
        >
          <Filter className="size-3.5 text-g-blue shrink-0" />
          <span className="truncate">{rotuloExibido}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-60 p-2.5 space-y-2 rounded-xl border border-border bg-popover text-popover-foreground shadow-lg z-50 animate-in fade-in-50 zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between pb-2 border-b border-border/80 px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Filtrar por mês
          </span>
          {valor !== "todos" && (
            <button
              type="button"
              onClick={() => {
                onChange("todos");
                setAberto(false);
              }}
              className="text-xs text-g-blue hover:underline font-semibold cursor-pointer focus-visible:ring-1 focus-visible:ring-g-blue rounded px-1"
            >
              Todos
            </button>
          )}
        </div>

        <div className="space-y-0.5 max-h-56 overflow-y-auto pr-1" role="listbox" aria-label="Lista de meses">
          {/* Opção Todos os meses */}
          <button
            ref={(el) => {
              itemsRef.current[0] = el;
            }}
            type="button"
            role="option"
            aria-selected={valor === "todos"}
            onClick={() => {
              onChange("todos");
              setAberto(false);
            }}
            onKeyDown={(e) => handleKeyDown(e, 0)}
            className={cn(
              "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-between outline-none focus-visible:ring-2 focus-visible:ring-g-blue",
              valor === "todos"
                ? "bg-g-blue/10 text-g-blue font-bold"
                : "hover:bg-muted text-foreground"
            )}
          >
            <span>Todos os meses</span>
            {valor === "todos" && <Check className="size-3.5 text-g-blue shrink-0" />}
          </button>

          {/* Meses ordenados do mais recente para o mais antigo */}
          {listaMeses.map((m, idx) => {
            const index = idx + 1;
            const isAtivo = valor === m.key;
            return (
              <button
                key={m.key}
                ref={(el) => {
                  itemsRef.current[index] = el;
                }}
                type="button"
                role="option"
                aria-selected={isAtivo}
                onClick={() => {
                  onChange(m.key);
                  setAberto(false);
                }}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={cn(
                  "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-between outline-none focus-visible:ring-2 focus-visible:ring-g-blue",
                  isAtivo
                    ? "bg-g-blue/10 text-g-blue font-bold"
                    : "hover:bg-muted text-foreground"
                )}
              >
                <span>{m.label}</span>
                {isAtivo && <Check className="size-3.5 text-g-blue shrink-0" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
