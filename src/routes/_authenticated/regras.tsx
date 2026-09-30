import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ConfirmAction";
import { useStore } from "@/lib/store-context";
import { COLUNAS_PLANILHA, FILTROS_PLANILHA, PRIORIDADES, REGRAS_PADRAO, type Periodo } from "@/lib/types";
import { CORES_PRIORIDADE } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/regras")({
  head: () => ({
    meta: [
      { title: "Regras e prioridades | TI Senai LRV" },
      { name: "description", content: "Configure prazos por prioridade, horário de atendimento, feriados, férias e pausas automáticas do SLA." },
      { property: "og:title", content: "Regras e Prioridades do SLA" },
      { property: "og:description", content: "O gestor edita aqui os prazos e as pausas; o dashboard recalcula tudo na hora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Regras,
});

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function Regras() {
  const { regras: regrasSalvas, setRegras } = useStore();
  const [regras, setDraft] = useState(regrasSalvas);
  useEffect(() => setDraft(regrasSalvas), [regrasSalvas]);
  const salvar = (patch: Partial<typeof regras>) => setDraft(prev => ({ ...prev, ...patch }));
  const alterado = JSON.stringify(regras) !== JSON.stringify(regrasSalvas);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Regras e prioridades</h1>
          <p className="mt-1 text-muted-foreground">As alterações entram em vigor depois de salvar.</p>
        </div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setDraft(REGRAS_PADRAO)}><RotateCcw className="mr-2 h-4 w-4" /> Restaurar padrão</Button>
        <ConfirmAction title="Salvar alterações nas regras?" description="Os prazos e as pausas de SLA serão atualizados após sua confirmação." confirmLabel="Sim, salvar regras" disabled={!alterado} onConfirm={async () => { const ok = await setRegras(regras); toast[ok ? "success" : "error"](ok ? "Regras salvas." : "Não foi possível salvar as regras."); }}>Salvar alterações</ConfirmAction></div>
      </div>

      <Card>
        <CardHeader><CardTitle>Prazos por prioridade (horas úteis)</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          {PRIORIDADES.map((p) => (
            <div key={p}>
              <div className="mb-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: CORES_PRIORIDADE[p].bg, color: CORES_PRIORIDADE[p].text }}>
                {p}
              </div>
              <Input
                type="number"
                min={1}
                value={regras.prazos[p]}
                onChange={(e) => salvar({ prazos: { ...regras.prazos, [p]: Number(e.target.value) } })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Horário de atendimento</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">Início</Label>
              <Input type="time" value={regras.expediente.inicio} onChange={(e) => salvar({ expediente: { ...regras.expediente, inicio: e.target.value } })} />
            </div>
            <div>
              <Label className="mb-2 block">Fim</Label>
              <Input type="time" value={regras.expediente.fim} onChange={(e) => salvar({ expediente: { ...regras.expediente, fim: e.target.value } })} />
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Dias de atendimento</Label>
            <div className="flex flex-wrap gap-2">
              {DIAS.map((d, i) => {
                const ativo = regras.expediente.dias.includes(i);
                return (
                  <button
                    key={d}
                    onClick={() =>
                      salvar({
                        expediente: {
                          ...regras.expediente,
                          dias: ativo ? regras.expediente.dias.filter((x) => x !== i) : [...regras.expediente.dias, i].sort(),
                        },
                      })
                    }
                    className="rounded-full border-2 px-3 py-1 text-sm font-semibold"
                    style={{
                      borderColor: "var(--g-blue)",
                      backgroundColor: ativo ? "var(--g-blue)" : "transparent",
                      color: ativo ? "#fff" : undefined,
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Fora desses dias e horários o SLA não acumula tempo útil (sábados, domingos e madrugadas não contam).
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Feriados</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {regras.feriados.map((f) => (
              <div key={f.id} className="flex gap-2">
                <Input type="date" value={f.data} onChange={(e) => salvar({ feriados: regras.feriados.map((x) => (x.id === f.id ? { ...x, data: e.target.value } : x)) })} />
                <Input value={f.nome} onChange={(e) => salvar({ feriados: regras.feriados.map((x) => (x.id === f.id ? { ...x, nome: e.target.value } : x)) })} />
                <Button variant="ghost" size="icon" onClick={() => salvar({ feriados: regras.feriados.filter((x) => x.id !== f.id) })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={() => salvar({ feriados: [...regras.feriados, { id: crypto.randomUUID(), data: "2026-12-25", nome: "Novo feriado" }] })}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar feriado
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Férias, viagens e atestados</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {regras.periodos.map((p) => (
              <div key={p.id} className="grid gap-2 rounded-lg border border-border p-3">
                <div className="flex gap-2">
                  <select
                    className="h-10 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                    value={p.tipo}
                    onChange={(e) => salvar({ periodos: regras.periodos.map((x) => (x.id === p.id ? { ...x, tipo: e.target.value as Periodo["tipo"] } : x)) })}
                  >
                    {["Férias coletivas", "Férias", "Viagem a serviço", "Atestado médico", "Outro"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <Button variant="ghost" size="icon" onClick={() => salvar({ periodos: regras.periodos.filter((x) => x.id !== p.id) })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Input value={p.descricao} placeholder="Descrição / responsável" onChange={(e) => salvar({ periodos: regras.periodos.map((x) => (x.id === p.id ? { ...x, descricao: e.target.value } : x)) })} />
                <div className="flex gap-2">
                  <Input type="date" value={p.inicio} onChange={(e) => salvar({ periodos: regras.periodos.map((x) => (x.id === p.id ? { ...x, inicio: e.target.value } : x)) })} />
                  <Input type="date" value={p.fim} onChange={(e) => salvar({ periodos: regras.periodos.map((x) => (x.id === p.id ? { ...x, fim: e.target.value } : x)) })} />
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() =>
                salvar({
                  periodos: [
                    ...regras.periodos,
                    { id: crypto.randomUUID(), tipo: "Férias", descricao: "", inicio: "2026-10-01", fim: "2026-10-10" },
                  ],
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" /> Adicionar período
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ListaEditavel titulo="Setores" itens={regras.setores} onChange={(setores) => salvar({ setores })} />
        <ListaEditavel titulo="Tipos de problema" itens={regras.categorias} onChange={(categorias) => salvar({ categorias })} />
        <Card><CardHeader><CardTitle>Responsável pelo atendimento</CardTitle></CardHeader><CardContent className="font-medium">Claudinei Lima</CardContent></Card>
      </div>
      <section className="grid gap-5 lg:grid-cols-2">
         <Card><CardHeader><CardTitle>Filtros da planilha de atendimento</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{FILTROS_PLANILHA.map(nome => <Button key={nome} type="button" variant={(regras.planilha?.filtros ?? [...FILTROS_PLANILHA]).includes(nome) ? "google-blue" : "outline"} aria-pressed={(regras.planilha?.filtros ?? [...FILTROS_PLANILHA]).includes(nome)} onClick={() => { const atuais = regras.planilha?.filtros ?? [...FILTROS_PLANILHA]; salvar({ planilha: { colunas: regras.planilha?.colunas ?? [...COLUNAS_PLANILHA], filtros: atuais.includes(nome) ? atuais.filter(x => x !== nome) : [...atuais, nome] } }); }}>{nome}</Button>)}</CardContent></Card>
         <Card><CardHeader><CardTitle>Colunas da planilha de atendimento</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{COLUNAS_PLANILHA.map(nome => <Button key={nome} type="button" variant={(regras.planilha?.colunas ?? [...COLUNAS_PLANILHA]).includes(nome) ? "google-green" : "outline"} aria-pressed={(regras.planilha?.colunas ?? [...COLUNAS_PLANILHA]).includes(nome)} onClick={() => { const atuais = (regras.planilha?.colunas ?? [...COLUNAS_PLANILHA]).map(x => x === "Setor / local" ? "Setor" : x === "Descrição" ? "Descrição do problema" : x); salvar({ planilha: { filtros: regras.planilha?.filtros ?? [...FILTROS_PLANILHA], colunas: atuais.includes(nome) ? atuais.filter(x => x !== nome) : [...atuais, nome] } }); }}>{nome}</Button>)}</CardContent></Card>
      </section>
    </div>
  );
}

function ListaEditavel({ titulo, itens, onChange }: { titulo: string; itens: string[]; onChange: (v: string[]) => void }) {
  return (
    <Card>
      <CardHeader><CardTitle>{titulo}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {itens.map((item, i) => (
          <div key={i} className="flex gap-2">
            <Input value={item} onChange={(e) => onChange(itens.map((x, j) => (j === i ? e.target.value : x)))} />
            <Button variant="ghost" size="icon" onClick={() => onChange(itens.filter((_, j) => j !== i))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange([...itens, "Novo item"])}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar
        </Button>
      </CardContent>
    </Card>
  );
}
