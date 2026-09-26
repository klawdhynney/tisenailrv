import { CORES_PRIORIDADE, CORES_SLA, CORES_STATUS, type Prioridade, type Status } from "@/lib/types";

function Chip({ cor, children }: { cor: { bg: string; text: string }; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: cor.bg, color: cor.text }}
    >
      {children}
    </span>
  );
}

export function PrioridadeChip({ valor }: { valor: Prioridade }) {
  return <Chip cor={CORES_PRIORIDADE[valor] ?? CORES_SLA["—"]}>{valor}</Chip>;
}

export function StatusChip({ valor }: { valor: Status }) {
  return <Chip cor={CORES_STATUS[valor] ?? CORES_SLA["—"]}>{valor}</Chip>;
}

export function SlaChip({ valor }: { valor: string }) {
  return <Chip cor={CORES_SLA[valor] ?? CORES_SLA["—"]}>{valor}</Chip>;
}
