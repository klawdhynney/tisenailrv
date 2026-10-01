import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Cpu, MapPin, CheckCircle2, MessageCircle, ArrowLeft, SendHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store-context";
import { TextoAssistido } from "@/components/TextoAssistido";
import { CAMPOS_ABERTURA_PADRAO } from "@/lib/types";

export const Route = createFileRoute("/abrir")({
  head: () => ({
    meta: [
      { title: "Abrir chamado | TI Senai LRV" },
      { name: "description", content: "Formulário simples para abrir um chamado de TI informando setor e descrição do problema e local." },
      { property: "og:title", content: "Abrir Chamado de TI" },
      { property: "og:description", content: "Registre seu chamado de TI em poucos segundos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AbrirChamado,
});

function AbrirChamado() {
  const { regras, addTicket } = useStore();
  const navigate = useNavigate();
  const campos = regras.camposAbertura ?? CAMPOS_ABERTURA_PADRAO;
  const isCampoAtivo = (id: string) => campos.find((c) => c.id === id)?.ativo ?? true;
  const isCampoObrigatorio = (id: string) => campos.find((c) => c.id === id)?.obrigatorio ?? false;
  const getCampoLabel = (id: string, fallback: string) => campos.find((c) => c.id === id)?.label ?? fallback;

  const [form, setForm] = useState<Record<string, string>>({
    solicitante: "",
    email: "",
    setor: "",
    categoria: "",
    local: "",
    contato: "",
    descricao: "",
  });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [sucessoId, setSucessoId] = useState<number | null>(null);
  const [lembrar, setLembrar] = useState(false);
  const [preferenciaCarregada, setPreferenciaCarregada] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ti-senai-dados") ?? "null");
      if (saved && typeof saved === "object") {
        setForm((f) => ({
          ...f,
          solicitante: typeof saved.solicitante === "string" ? saved.solicitante : "",
          email: typeof saved.email === "string" ? saved.email : "",
          setor: typeof saved.setor === "string" ? saved.setor : "",
          contato: typeof saved.contato === "string" ? saved.contato : "",
          local: typeof saved.local === "string" ? saved.local : "",
        }));
        setLembrar(true);
      }
    } catch {
      localStorage.removeItem("ti-senai-dados");
    }
    setPreferenciaCarregada(true);
  }, []);

  useEffect(() => {
    if (!preferenciaCarregada) return;
    if (lembrar) {
      localStorage.setItem(
        "ti-senai-dados",
        JSON.stringify({
          solicitante: form.solicitante,
          email: form.email,
          setor: form.setor,
          contato: form.contato,
          local: form.local,
        }),
      );
    } else {
      localStorage.removeItem("ti-senai-dados");
    }
  }, [preferenciaCarregada, lembrar, form.solicitante, form.email, form.setor, form.contato, form.local]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const novosErros: Record<string, string> = {};

    if (isCampoAtivo("solicitante")) {
      const val = (form.solicitante || "").trim();
      if (isCampoObrigatorio("solicitante") && (val.length < 2 || val.length > 120)) {
        novosErros.solicitante = "Informe seu nome (2 a 120 caracteres).";
      }
    }

    if (isCampoAtivo("email")) {
      const val = (form.email || "").trim();
      if (isCampoObrigatorio("email") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        novosErros.email = "Informe um e-mail válido.";
      }
    }

    if (isCampoAtivo("setor")) {
      const val = (form.setor || "").trim();
      if (isCampoObrigatorio("setor") && (!val || val.length < 2)) {
        novosErros.setor = "Escolha o setor.";
      }
    }

    if (isCampoAtivo("categoria")) {
      const val = (form.categoria || "").trim();
      if (isCampoObrigatorio("categoria") && (!val || val.length < 2)) {
        novosErros.categoria = "Escolha o tipo de problema.";
      }
    }

    if (isCampoAtivo("local")) {
      const val = (form.local || "").trim();
      if (isCampoObrigatorio("local") && !val) {
        novosErros.local = "Informe o local exato / sala.";
      }
    }

    if (isCampoAtivo("contato")) {
      const val = (form.contato || "").trim();
      if (isCampoObrigatorio("contato") && !val) {
        novosErros.contato = "Informe o WhatsApp ou telefone.";
      }
    }

    if (isCampoAtivo("descricao")) {
      const val = (form.descricao || "").trim();
      if (isCampoObrigatorio("descricao") && val.length < 10) {
        novosErros.descricao = "Descreva o problema com pelo menos 10 caracteres.";
      } else if (val.length > 3000) {
        novosErros.descricao = "Limite de 3000 caracteres na descrição.";
      }
    }

    // Custom fields
    for (const c of campos.filter((c) => !["solicitante", "email", "setor", "categoria", "local", "contato", "descricao"].includes(c.id))) {
      if (c.ativo && c.obrigatorio && !(form[c.id] || "").trim()) {
        novosErros[c.id] = `Preencha ${c.label}.`;
      }
    }

    setErros(novosErros);
    if (Object.keys(novosErros).length) {
      toast.error("Confira os campos destacados.");
      return;
    }

    if (!window.confirm("Deseja realmente enviar este chamado? Confira os dados antes de confirmar.")) return;
    if (enviando) return;
    setEnviando(true);

    const customData = campos
      .filter((c) => !["solicitante", "email", "setor", "categoria", "local", "contato", "descricao"].includes(c.id) && c.ativo && form[c.id])
      .map((c) => `[${c.label}: ${form[c.id].trim()}]`)
      .join("\n");

    const descricaoFinal = [form.descricao ? form.descricao.trim() : "", customData].filter(Boolean).join("\n\n");

    const ticketId = await addTicket(
      {
        abertoEm: "",
        hora: "",
        solicitante: (form.solicitante || "Solicitante").trim(),
        setor: form.setor || "Geral",
        local: form.local ? form.local.trim() : "",
        categoria: form.categoria || "Geral",
        descricao: descricaoFinal || "Sem descrição informada.",
        prioridade: "Média",
        responsavel: null,
        status: "Aberto",
        contato: form.contato ? form.contato.trim() : null,
        fechadoEm: null,
        horario: null,
        procedimento: null,
      },
      form.email ? form.email.trim() : "solicitante@senaimt.ind.br",
    );

    setEnviando(false);
    if (ticketId === null) {
      toast.error("Não foi possível registrar o chamado. Tente novamente.");
      return;
    }
    toast.success("Chamado registrado! A equipe de TI já recebeu.");
    setSucessoId(ticketId);
  }

  if (sucessoId) {
    const shareMessage = `Chamado #${sucessoId}\nRequisitante: ${(form.solicitante || "").trim()}\nDescrição e local: ${(form.descricao || "").trim()}`;

    return (
      <div className="mx-auto max-w-2xl py-12 px-4 animate-in fade-in zoom-in duration-300">
        <div className="rounded-3xl border-2 border-g-green/20 bg-card p-8 text-center shadow-xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-g-green/10 text-g-green">
            <CheckCircle2 className="size-12" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Chamado #{sucessoId} enviado!</h1>
          <p className="text-muted-foreground mb-8">
            Tudo certo, <strong>{form.solicitante || "Solicitante"}</strong>. Sua solicitação foi registrada com sucesso.
            Acompanhe o andamento pelo site usando o e-mail informado.
          </p>

          <div className="grid gap-4">
            <div className="rounded-2xl bg-muted/50 p-4 text-left text-sm space-y-2 border border-border">
              <div className="flex justify-between">
                <span className="font-medium text-muted-foreground">Protocolo:</span>
                <span className="font-bold">#{sucessoId}</span>
              </div>
              {form.setor && (
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">Setor:</span>
                  <span>{form.setor}</span>
                </div>
              )}
              {form.categoria && (
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">Tipo:</span>
                  <span>{form.categoria}</span>
                </div>
              )}
            </div>

            <div className="pt-4 space-y-3">
              <Button asChild size="lg" variant="google-green" className="w-full text-base font-bold shadow-md">
                <a
                  href={`https://wa.me/5566996444461?text=${encodeURIComponent(shareMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="mr-2 size-5" /> Enviar no WhatsApp
                </a>
              </Button>
              <div className="flex justify-center">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => navigate({ to: "/" })}>
                  <ArrowLeft className="mr-2 size-4" /> Voltar para o início
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">A mensagem fica pronta no WhatsApp; confirme o envio no aplicativo.</p>
          </div>
        </div>
      </div>
    );
  }

  const customFields = campos.filter((c) => !["solicitante", "email", "setor", "categoria", "local", "contato", "descricao"].includes(c.id) && c.ativo);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border-l-4 border-g-green bg-card px-5 py-5 text-center shadow-sm">
        <div className="flex items-center justify-center gap-3">
          <span className="rounded-xl bg-g-green/15 p-3 text-g-green"><Cpu className="size-7" /></span>
          <h1 className="text-3xl font-bold">Abrir chamado de TI</h1>
        </div>
        <p className="mt-2 text-muted-foreground">Preencha os campos abaixo com a informação do local e descrição do problema.</p>
      </div>
      <Card className="mt-6 rounded-2xl border-t-4 border-g-blue shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2"><MapPin className="size-5 text-g-blue" /> Dados do chamado</CardTitle>
          <span className="text-xs text-muted-foreground"><span className="font-bold text-[var(--g-red)]">*</span> Campos obrigatórios</span>
        </CardHeader>
        <CardContent>
          <form onSubmit={enviar} className="grid gap-5">
            {(isCampoAtivo("solicitante") || isCampoAtivo("email")) && (
              <div className="grid gap-5 sm:grid-cols-2">
                {isCampoAtivo("solicitante") && (
                  <Campo label={getCampoLabel("solicitante", "Seu nome")} obrigatorio={isCampoObrigatorio("solicitante")} erro={erros.solicitante}>
                    <Input autoComplete="name" value={form.solicitante} onChange={(e) => set("solicitante", e.target.value)} placeholder="Digite seu nome completo" />
                  </Campo>
                )}
                {isCampoAtivo("email") && (
                  <Campo label={getCampoLabel("email", "E-mail")} obrigatorio={isCampoObrigatorio("email")} erro={erros.email}>
                    <Input autoComplete="email" type="email" required={isCampoObrigatorio("email")} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="seu@email.com" />
                  </Campo>
                )}
              </div>
            )}

            {(isCampoAtivo("setor") || isCampoAtivo("categoria")) && (
              <div className="grid gap-5 sm:grid-cols-2">
                {isCampoAtivo("setor") && (
                  <Campo label={getCampoLabel("setor", "Setor")} obrigatorio={isCampoObrigatorio("setor")} erro={erros.setor}>
                    <select
                      className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                      value={form.setor}
                      onChange={(e) => set("setor", e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {regras.setores.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </Campo>
                )}
                {isCampoAtivo("categoria") && (
                  <Campo label={getCampoLabel("categoria", "Tipo de problema")} obrigatorio={isCampoObrigatorio("categoria")} erro={erros.categoria}>
                    <select
                      className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                      value={form.categoria}
                      onChange={(e) => set("categoria", e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {regras.categorias.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </Campo>
                )}
              </div>
            )}

            {(isCampoAtivo("local") || isCampoAtivo("contato")) && (
              <div className="grid gap-5 sm:grid-cols-2">
                {isCampoAtivo("local") && (
                  <Campo label={getCampoLabel("local", "Local exato / Sala")} obrigatorio={isCampoObrigatorio("local")} erro={erros.local}>
                    <Input value={form.local} onChange={(e) => set("local", e.target.value)} placeholder="Ex.: Bloco A, Sala 3, Mesa 02" />
                  </Campo>
                )}
                {isCampoAtivo("contato") && (
                  <Campo label={getCampoLabel("contato", "WhatsApp / Telefone")} obrigatorio={isCampoObrigatorio("contato")} erro={erros.contato}>
                    <Input value={form.contato} onChange={(e) => set("contato", e.target.value)} placeholder="(66) 99999-9999" />
                  </Campo>
                )}
              </div>
            )}

            {customFields.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2">
                {customFields.map((c) => (
                  <Campo key={c.id} label={c.label} obrigatorio={c.obrigatorio} erro={erros[c.id]}>
                    <Input value={form[c.id] ?? ""} onChange={(e) => set(c.id, e.target.value)} placeholder={`Informe ${c.label.toLowerCase()}`} />
                  </Campo>
                ))}
              </div>
            )}

            {isCampoAtivo("descricao") && (
              <Campo label={getCampoLabel("descricao", "Descrição do problema e local")} obrigatorio={isCampoObrigatorio("descricao")} erro={erros.descricao}>
                <TextoAssistido rows={5} value={form.descricao} onChange={(value) => set("descricao", value)} placeholder="Ex.: Computador sem internet na sala 1" />
              </Campo>
            )}

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} /> Lembrar meus dados neste aparelho (nome, e-mail e setor)
            </label>

            <Button type="submit" variant="google-green" size="lg" disabled={enviando} className="w-full sm:w-auto font-bold gap-2">
              <SendHorizontal className="size-5 shrink-0" /> {enviando ? "Enviando…" : "Enviar chamado"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Campo({
  label,
  obrigatorio = false,
  erro,
  children,
}: {
  label: string;
  obrigatorio?: boolean;
  erro?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-2 flex items-center gap-1 text-sm font-medium">
        <span>{label}</span>
        {obrigatorio && (
          <span className="font-bold text-[var(--g-red)] text-sm select-none" title="Campo obrigatório">
            *
          </span>
        )}
      </Label>
      {children}
      {erro && <p className="mt-1 text-xs font-medium text-[var(--g-red)]">{erro}</p>}
    </div>
  );
}
