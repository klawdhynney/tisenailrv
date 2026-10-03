import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Cpu, MapPin, CheckCircle2, MessageCircle, ArrowLeft, SendHorizontal, Mail } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store-context";
import { useLoading } from "@/lib/loading-context";
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
  const { wrapAsync, isLoading } = useLoading();
  const navigate = useNavigate();
  const campos = regras.camposAbertura ?? CAMPOS_ABERTURA_PADRAO;
  const isCampoAtivo = (id: string) => campos.find((c) => c.id === id)?.ativo ?? true;
  const isCampoObrigatorio = (id: string) => campos.find((c) => c.id === id)?.obrigatorio ?? false;
  const getCampoLabel = (id: string, fallback: string) => {
    if (id === "local") return "Local do problema*";
    if (id === "descricao") return "Descreva o problema*";
    return campos.find((c) => c.id === id)?.label ?? fallback;
  };

interface FormValues {
  solicitante: string;
  email: string;
  setor: string;
  categoria: string;
  local: string;
  contato: string;
  descricao: string;
}

  const [form, setForm] = useState<FormValues>({
    solicitante: "",
    email: "",
    setor: "",
    categoria: "",
    local: "",
    contato: "",
    descricao: "",
  });
  const [customForm, setCustomForm] = useState<Record<string, string>>({});
  const [erros, setErros] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [confirmandoEnvio, setConfirmandoEnvio] = useState(false);
  const [sucessoId, setSucessoId] = useState<number | null>(null);
  const [lembrar, setLembrar] = useState(false);
  const [preferenciaCarregada, setPreferenciaCarregada] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ti-senai-dados") ?? "null");
      const salvoWpp = localStorage.getItem("tisenai_user_whatsapp_display") || localStorage.getItem("tisenai_user_whatsapp") || "";
      if (saved && typeof saved === "object") {
        setForm((f) => ({
          ...f,
          solicitante: typeof saved.solicitante === "string" ? saved.solicitante : "",
          setor: typeof saved.setor === "string" ? saved.setor : "",
          contato: typeof saved.contato === "string" ? saved.contato : salvoWpp,
          local: typeof saved.local === "string" ? saved.local : "",
        }));
        setLembrar(true);
      } else if (salvoWpp) {
        setForm((f) => ({ ...f, contato: salvoWpp }));
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
          setor: form.setor,
          contato: form.contato,
          local: form.local,
        }),
      );
    } else {
      localStorage.removeItem("ti-senai-dados");
    }
  }, [preferenciaCarregada, lembrar, form.solicitante, form.setor, form.contato, form.local]);

  const set = (k: string, v: string) => {
    if (k in form) {
      setForm((f) => ({ ...f, [k]: v }));
    } else {
      setCustomForm((cf) => ({ ...cf, [k]: v }));
    }
  };

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const novosErros: Record<string, string> = {};

    if (isCampoAtivo("solicitante")) {
      const val = (form.solicitante || "").trim();
      if (isCampoObrigatorio("solicitante") && (val.length < 2 || val.length > 120)) {
        novosErros.solicitante = "Informe seu nome completo.";
      }
    }

    const digits = (form.contato || "").replace(/\D/g, "");
    if (digits.length < 10) {
      novosErros.contato = "Informe seu WhatsApp com DDD.";
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
      if (c.ativo && c.obrigatorio && !(customForm[c.id] || "").trim()) {
        novosErros[c.id] = `Preencha ${c.label}.`;
      }
    }

    setErros(novosErros);
    if (Object.keys(novosErros).length) {
      toast.error("Confira os campos destacados.");
      return;
    }

    setConfirmandoEnvio(true);
  }

  async function confirmarEnvioFinal() {
    if (enviando || isLoading) return;
    setEnviando(true);
    setConfirmandoEnvio(false);

    try {
      await wrapAsync(
        async () => {
          const customData = campos
            .filter((c) => !["solicitante", "email", "setor", "categoria", "local", "contato", "descricao"].includes(c.id) && c.ativo && customForm[c.id])
            .map((c) => `[${c.label}: ${(customForm[c.id] ?? "").trim()}]`)
            .join("\n");

          const descricaoFinal = [form.descricao ? form.descricao.trim() : "", customData].filter(Boolean).join("\n\n");
          const digitsContato = (form.contato || "").replace(/\D/g, "");
          const emailCalculado = `${digitsContato || "contato"}@whatsapp.senailrv.local`;

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
            emailCalculado,
          );

          if (ticketId === null) {
            toast.error("Não foi possível registrar o chamado. Tente novamente.");
            return;
          }
          toast.success("Chamado registrado! A equipe de TI já recebeu.");
          setSucessoId(ticketId);

          try {
            const emailFinal = emailCalculado.toLowerCase();
            localStorage.setItem("tisenai_user_email", emailFinal);
            localStorage.setItem("tisenai_email", emailFinal);
            if (digitsContato.length >= 10) {
              localStorage.setItem("tisenai_user_whatsapp", digitsContato);
              localStorage.setItem("tisenai_user_whatsapp_display", form.contato.trim());
            }
            const existentes = JSON.parse(localStorage.getItem("tisenai_meus_tickets") || "[]");
            const novos = [
              {
                id: ticketId,
                aberto_em: new Date().toISOString().split("T")[0],
                email: emailFinal,
                contato: form.contato ? form.contato.trim() : null,
                solicitante: form.solicitante?.trim() || "Solicitante",
                setor: form.setor || "Geral",
                local: form.local || "",
                descricao: descricaoFinal,
                status: "Aberto",
                prioridade: "Média",
                procedimento: null,
              },
              ...existentes.filter((t: any) => t.id !== ticketId),
            ];
            localStorage.setItem("tisenai_meus_tickets", JSON.stringify(novos));
          } catch {
            // ignore
          }
        },
        { text: "Registrando chamado..." }
      );
    } catch {
      toast.error("Erro inesperado ao registrar o chamado.");
    } finally {
      setEnviando(false);
    }
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
          <p className="text-muted-foreground mb-6">
            Sua solicitação foi registrada com sucesso.
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
          </div>
        </div>
      </div>
    );
  }

  const customFields = campos.filter((c) => !["solicitante", "email", "setor", "categoria", "local", "contato", "descricao"].includes(c.id) && c.ativo);

  const configAbrir = regras.abrirChamado;

  return (
    <div className="w-full space-y-6">
      <div className="rounded-2xl border-l-4 border-g-green bg-card px-5 py-5 text-center shadow-sm">
        <div className="flex items-center justify-center gap-3">
          <span className="rounded-xl bg-g-green/15 p-3 text-g-green"><Cpu className="size-7" /></span>
          <h1 className="text-3xl font-bold">{configAbrir?.titulo || "Abrir chamado de TI"}</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {configAbrir?.textoApoio || "Abra o seu chamado, descreva o problema e informe o local exato para agilizar o atendimento."}
        </p>
      </div>
      <Card className="rounded-2xl border-t-4 border-g-blue shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2"><MapPin className="size-5 text-g-blue" /> Dados do chamado</CardTitle>
          <span className="text-xs text-muted-foreground"><span className="font-bold text-[var(--g-red)]">*</span> Campos obrigatórios</span>
        </CardHeader>
        <CardContent>
          <form onSubmit={enviar} className="grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              {isCampoAtivo("solicitante") && (
                <Campo label={getCampoLabel("solicitante", "Seu nome")} obrigatorio={isCampoObrigatorio("solicitante")} erro={erros.solicitante}>
                  <Input autoComplete="name" value={form.solicitante} onChange={(e) => set("solicitante", e.target.value)} placeholder="Digite seu nome completo" />
                </Campo>
              )}

              <Campo label="Número do WhatsApp" obrigatorio={true} erro={erros.contato}>
                <Input
                  value={form.contato}
                  onChange={(e) => set("contato", e.target.value)}
                  placeholder="65 99999-9999"
                  className="font-medium"
                />
              </Campo>
            </div>

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

            {isCampoAtivo("local") && (
              <Campo label={getCampoLabel("local", configAbrir?.rotuloLocal || "Local do problema*")} obrigatorio={isCampoObrigatorio("local")} erro={erros.local}>
                <Input value={form.local} onChange={(e) => set("local", e.target.value)} placeholder={configAbrir?.placeholderLocal || "Ex.: Bloco A, Sala 3, Mesa 02"} />
              </Campo>
            )}

            {customFields.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2">
                {customFields.map((c) => (
                  <Campo key={c.id} label={c.label} obrigatorio={c.obrigatorio} erro={erros[c.id]}>
                    <Input value={customForm[c.id] ?? ""} onChange={(e) => set(c.id, e.target.value)} placeholder={`Informe ${c.label.toLowerCase()}`} />
                  </Campo>
                ))}
              </div>
            )}

            {isCampoAtivo("descricao") && (
              <Campo label={getCampoLabel("descricao", configAbrir?.rotuloDescricao || "Descreva o problema*")} obrigatorio={isCampoObrigatorio("descricao")} erro={erros.descricao}>
                <TextoAssistido rows={5} value={form.descricao} onChange={(value) => set("descricao", value)} placeholder={configAbrir?.placeholderDescricao || "Ex.: Computador sem internet na sala 1"} />
              </Campo>
            )}

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} /> Lembrar meus dados neste aparelho
            </label>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button type="submit" variant="google-green" size="lg" disabled={enviando} className="w-full sm:w-auto font-bold gap-2 shadow-md">
                <SendHorizontal className="size-5 shrink-0" /> {enviando ? "Enviando…" : (configAbrir?.textoBotao || "Enviar chamado")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
                onClick={() => {
                  const hasContent = Object.values(form).some((v) => (v || "").trim().length > 0);
                  if (hasContent && !window.confirm("Deseja cancelar o preenchimento e voltar ao início?")) return;
                  navigate({ to: "/" });
                }}
              >
                Cancelar
              </Button>
            </div>

            <p className="text-xs text-muted-foreground pt-1">
              {configAbrir?.textoConsentimento || "Ao enviar, você concorda com o uso dos seus dados conforme nossa"}{" "}
              <Link
                to="/lgpd"
                className="font-medium text-foreground underline underline-offset-2 hover:text-primary transition-colors"
              >
                Política de Privacidade e LGPD
              </Link>
              .
            </p>
          </form>
        </CardContent>
      </Card>

      {/* Caixa modal de confirmação minimalista, elegante e centralizada */}
      {confirmandoEnvio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-border/80 bg-background/95 p-6 sm:p-7 shadow-xl space-y-5 animate-in zoom-in-95 duration-200 backdrop-blur-sm">
            <div className="flex items-center gap-3 border-b border-border/60 pb-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-g-blue/10 text-g-blue">
                <SendHorizontal className="size-5 text-g-blue" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Confirmar abertura de chamado</h2>
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-xs sm:text-sm space-y-2.5">
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Solicitante:</span>
                <span className="font-semibold text-foreground">{form.solicitante || "Não informado"}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">WhatsApp:</span>
                <span className="font-semibold text-foreground">{form.contato || "Não informado"}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Setor:</span>
                <span className="font-semibold text-foreground">{form.setor || "Geral"}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Tipo de problema:</span>
                <span className="font-semibold text-g-blue">{form.categoria || "Geral"}</span>
              </div>
              {form.local && (
                <div className="flex justify-between border-b border-border/40 pb-1.5">
                  <span className="text-muted-foreground">Local / Sala:</span>
                  <span className="font-semibold text-foreground">{form.local}</span>
                </div>
              )}
              <div className="pt-1">
                <span className="text-muted-foreground block mb-1">Descrição:</span>
                <p className="rounded-lg bg-background/80 p-2.5 text-xs text-foreground/90 border border-border/60 line-clamp-3">
                  {form.descricao}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => setConfirmandoEnvio(false)}
              >
                Voltar
              </Button>
              <Button
                type="button"
                variant="google-green"
                className="flex-1 sm:flex-none font-semibold shadow-xs gap-2"
                onClick={confirmarEnvioFinal}
              >
                <SendHorizontal className="size-4" /> Confirmar e registrar
              </Button>
            </div>
          </div>
        </div>
      )}
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
  const hasAsterisk = label.endsWith("*");
  const displayLabel = hasAsterisk ? label.slice(0, -1).trim() : label;
  const isRequired = obrigatorio || hasAsterisk;

  return (
    <div>
      <Label className="mb-2 flex items-center gap-1 text-sm font-medium">
        <span>{displayLabel}</span>
        {isRequired && (
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
