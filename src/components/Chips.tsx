import { Pause } from "lucide-react";
import {
  CORES_PRIORIDADE,
  CORES_SLA,
  CORES_STATUS,
  obterRotuloStatus,
  type Prioridade,
  type Status,
} from "@/lib/types";
import { useStore } from "@/lib/store-context";

function Chip({ cor, children }: { cor: { bg: string; text: string }; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap shadow-xs gap-1"
      style={{ backgroundColor: cor.bg, color: cor.text }}
    >
      {children}
    </span>
  );
}

const NEUTRO = { bg: "#5F6368", text: "#FFFFFF" };

export function PrioridadeChip({ valor }: { valor: Prioridade | string }) {
  const store = useStore();
  const param = store?.regras?.parametrosPrioridade?.find(
    (p) => p.nome.toLowerCase() === String(valor).toLowerCase(),
  );
  const cor = param ? { bg: param.bg, text: param.text } : CORES_PRIORIDADE[valor] ?? NEUTRO;
  return <Chip cor={cor}>{valor}</Chip>;
}

export function StatusChip({ valor }: { valor: Status | string }) {
  const store = useStore();
  const label = obterRotuloStatus(valor, store?.regras);
  const param = store?.regras?.parametrosStatus?.find(
    (s) =>
      s.nome.toLowerCase() === String(label).toLowerCase() ||
      s.nome.toLowerCase() === String(valor).toLowerCase() ||
      (s.id === "s5" && (valor === "Resolvido" || valor === "Finalizado")),
  );
  const cor =
    param ? { bg: param.bg, text: param.text } :
    CORES_STATUS[label] ?? CORES_STATUS[valor] ?? NEUTRO;
  return <Chip cor={cor}>{label}</Chip>;
}

export function SlaChip({ valor }: { valor: string }) {
  const store = useStore();
  const param = store?.regras?.parametrosSla?.find(
    (s) =>
      s.nome.toLowerCase() === String(valor).toLowerCase() ||
      (s.nome === "Estourado" && valor === "Vencido") ||
      (s.nome === "Vencido" && valor === "Estourado"),
  );
  const cor = param ? { bg: param.bg, text: param.text } : CORES_SLA[valor] ?? NEUTRO;
  const isPausado = valor.toLowerCase().includes("pausado");
  return (
    <Chip cor={cor}>
      {isPausado && <Pause className="size-3 shrink-0" />}
      {valor}
    </Chip>
  );
}
