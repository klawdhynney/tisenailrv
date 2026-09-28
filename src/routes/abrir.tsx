import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { emailCorporativo } from "@/lib/corporate";
import { PRIORIDADES, type Prioridade } from "@/lib/types";

export const Route = createFileRoute("/abrir")({
  head: () => ({
    meta: [
      { title: "Abrir chamado | TI Senai LRV" },
      { name: "description", content: "Formulário simples para abrir um chamado de TI informando setor, local exato e descrição do problema." },
      { property: "og:title", content: "Abrir Chamado de TI" },
      { property: "og:description", content: "Registre seu chamado de TI em poucos segundos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AbrirChamado,
});

const campoVazio = {
  solicitante: "",
  email: "",
  contato: "",
  setor: "",
  local: "",
  categoria: "",
  descricao: "",
  prioridade: "Média" as Prioridade,
};

interface Erros {
  solicitante?: string;
  email?: string;
  setor?: string;
  local?: string;
  categoria?: string;
  descricao?: string;
}

function AbrirChamado() {
  const { regras, addTicket } = useStore();
  const navigate = useNavigate();
  const [form, setForm] = useState(campoVazio);
  const [erros, setErros] = useState<Erros>({});
  const [enviando, setEnviando] = useState(false);

  const set = (k: keyof typeof campoVazio, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const novosErros: Erros = {};
    if (!form.solicitante.trim()) novosErros.solicitante = "Informe seu nome.";
    if (!emailCorporativo(form.email.trim())) novosErros.email = "Informe um e-mail institucional @senaimt ou @sesisenaimt válido.";
    if (!form.setor) novosErros.setor = "Escolha o setor.";
    if (form.local.trim().length < 3)
      novosErros.local = "Obrigatório: informe onde está o problema (sala, andar, bloco, pavilhão...).";
    if (!form.categoria) novosErros.categoria = "Escolha o tipo de problema.";
    if (form.descricao.trim().length < 10) novosErros.descricao = "Descreva o problema com pelo menos 10 caracteres.";
    setErros(novosErros);
    if (Object.keys(novosErros).length) {
      toast.error("Confira os campos destacados.");
      return;
    }

    if (enviando) return;
    setEnviando(true);
    const ok = await addTicket({
      abertoEm: "",
      hora: "",
      solicitante: form.solicitante.trim(),
      setor: form.setor,
      local: form.local.trim(),
      categoria: form.categoria,
      descricao: form.descricao.trim(),
      prioridade: form.prioridade,
      responsavel: null,
      status: "Aberto",
      contato: form.contato.trim() || null,
      fechadoEm: null,
      horario: null,
      procedimento: null,
    }, form.email.trim());
    setEnviando(false);
    if (!ok) {
      toast.error("Não foi possível registrar o chamado. Tente novamente.");
      return;
    }
    toast.success("Chamado registrado! A equipe de TI já recebeu.");
    setForm(campoVazio);
    navigate({ to: "/" });
  }

  const prazo = regras.prazos[form.prioridade];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight">Abrir chamado de TI</h1>
      <p className="mt-2 text-muted-foreground">Preencha os campos abaixo. Quanto mais claro o local e a descrição, mais rápido o atendimento.</p>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Dados do chamado</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={enviar} className="grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Campo label="Seu nome *" erro={erros.solicitante}>
                <Input value={form.solicitante} onChange={(e) => set("solicitante", e.target.value)} placeholder="Ex.: Maria Heloisa" />
              </Campo>
              <Campo label="E-mail institucional *" erro={erros.email}>
                <Input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="nome@senaimt.ind.br" />
              </Campo>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Campo label="Telefone / ramal (opcional)">
                <Input value={form.contato} onChange={(e) => set("contato", e.target.value)} placeholder="Ex.: ramal 2045" />
              </Campo>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Campo label="Setor *" erro={erros.setor}>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.setor}
                  onChange={(e) => set("setor", e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {regras.setores.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="Tipo de problema *" erro={erros.categoria}>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.categoria}
                  onChange={(e) => set("categoria", e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {regras.categorias.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Campo>
            </div>

            <Campo
              label="Local exato do problema * (sala, andar, pavilhão, bloco...)"
              erro={erros.local}
            >
              <Input
                value={form.local}
                onChange={(e) => set("local", e.target.value)}
                placeholder="Ex.: Bloco B, 2º andar, sala 204 - Laboratório de Informática"
              />
            </Campo>

            <Campo label="Descrição do problema *" erro={erros.descricao}>
              <Textarea
                rows={4}
                value={form.descricao}
                onChange={(e) => set("descricao", e.target.value)}
                placeholder="Conte o que está acontecendo, desde quando e o que já tentou fazer."
              />
            </Campo>

            <div>
              <Label className="mb-2 block">Prioridade</Label>
              <div className="flex flex-wrap gap-2">
                {PRIORIDADES.map((p) => {
                  const ativo = form.prioridade === p;
                  return (
                    <Button
                      type="button"
                      key={p}
                      onClick={() => set("prioridade", p)}
                      variant={ativo ? "default" : "outline"}
                      className="rounded-full"
                    >
                      {p}
                    </Button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Prazo de atendimento para {form.prioridade}: <strong>{prazo} horas úteis</strong> (contadas apenas no
                horário de atendimento, de {regras.expediente.inicio} às {regras.expediente.fim}, de segunda a sexta).
              </p>
            </div>

            <Button type="submit" size="lg" disabled={enviando} className="w-full sm:w-auto">
              {enviando ? "Enviando…" : "Enviar chamado"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Campo({ label, erro, children }: { label: string; erro?: string | undefined; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      {children}
      {erro && <p className="mt-1 text-xs font-medium text-[var(--g-red)]">{erro}</p>}
    </div>
  );
}
