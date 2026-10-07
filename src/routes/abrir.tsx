import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Cpu, MapPin, CheckCircle2, ArrowLeft, SendHorizontal, Mail, Star, FileText, MessageCircle, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store-context";
import { useLoading } from "@/lib/loading-context";
import { TextoAssistido } from "@/components/TextoAssistido";
import { CAMPOS_ABERTURA_PADRAO, AVALIACAO_PADRAO } from "@/lib/types";
import { sugerirTextoAbertura, revisarTexto } from "@/lib/revisar-texto.functions";

export const Route = createFileRoute("/abrir")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/auth", search: { redirectTo: "/abrir" } });
    }
  },
  head: () => ({
    meta: [
      { title: "Abrir chamado | TI Senai LRV" },
      { name: "description", content: "Formulário para abrir chamado de TI informando setor, descrição do problema e local." },
      { property: "og:title", content: "Abrir Chamado de TI" },
      { property: "og:description", content: "Registre seu chamado de TI com sua conta institucional." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AbrirChamado,
});

interface FormValues {
  solicitante: string;
  email: string;
  setor: string;
  categoria: string;
  local: string;
  descricao: string;
}

function AbrirChamado() {
  const { session, authPronto, regras, addTicket, recarregarEvaluationStats } = useStore();
  const { wrapAsync, isLoading } = useLoading();
  const navigate = useNavigate();
  const configAbrir = regras.abrirChamado ?? ABRIR_CHAMADO_PADRAO;
  const campos = regras.camposAbertura ?? CAMPOS_ABERTURA_PADRAO;
  const isCampoAtivo = (id: string) => campos.find((c) => c.id === id)?.ativo ?? true;
  const isCampoObrigatorio = (id: string) => campos.find((c) => c.id === id)?.obrigatorio ?? false;
  const getCampoLabel = (id: string, fallback: string) => {
    if (id === "local") return configAbrir?.rotuloLocal || "Local do problema*";
    if (id === "descricao") return configAbrir?.rotuloDescricao || "Descreva o problema*";
    return campos.find((c) => c.id === id)?.label ?? fallback;
  };

  const [form, setForm] = useState<FormValues>({
    solicitante: "",
    email: "",
    setor: "",
    categoria: "",
    local: "",
    descricao: "",
  });
  const [customForm, setCustomForm] = useState<Record<string, string>>({});
  const [erros, setErros] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [confirmandoEnvio, setConfirmandoEnvio] = useState(false);
  const [sucessoId, setSucessoId] = useState<number | null>(null);
  const [lembrar, setLembrar] = useState(false);
  const [preferenciaCarregada, setPreferenciaCarregada] = useState(false);

  // Estados da Avaliação (Ajuste 6)
  const [notaAvaliacao, setNotaAvaliacao] = useState<number | null>(null);
  const [comentarioAvaliacao, setComentarioAvaliacao] = useState("");
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);
  const [avaliacaoEnviada, setAvaliacaoEnviada] = useState(false);
  const [avaliacaoPulada, setAvaliacaoPulada] = useState(false);

  // Estados da IA ao abrir chamado
  const [sugerindoTexto, setSugerindoTexto] = useState(false);
  const [aprimorandoTexto, setAprimorandoTexto] = useState(false);
  const [dialogSubstituirAberto, setDialogSubstituirAberto] = useState(false);
  const [sugestaoPendente, setSugestaoPendente] = useState<string | null>(null);

  const configAvaliacao = regras.avaliacoes ?? AVALIACAO_PADRAO;

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ti-senai-dados") ?? "null");
      if (saved && typeof saved === "object") {
        setForm((f) => ({
          ...f,
          solicitante: typeof saved.solicitante === "string" ? saved.solicitante : "",
          setor: typeof saved.setor === "string" ? saved.setor : "",
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
    if (authPronto && !session) {
      navigate({ to: "/auth", search: { redirectTo: "/abrir" } });
    }
  }, [authPronto, session, navigate]);

  useEffect(() => {
    if (session?.user) {
      const email = session.user.email || "";
      const nome =
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        "";
      setForm((f) => ({
        ...f,
        email: email,
        solicitante: f.solicitante || nome,
      }));
    }
  }, [session]);

  useEffect(() => {
    if (!preferenciaCarregada) return;
    if (lembrar) {
      localStorage.setItem(
        "ti-senai-dados",
        JSON.stringify({
          solicitante: form.solicitante,
          setor: form.setor,
          local: form.local,
        }),
      );
    } else {
      localStorage.removeItem("ti-senai-dados");
    }
  }, [preferenciaCarregada, lembrar, form.solicitante, form.setor, form.local]);

  const set = (k: string, v: string) => {
    if (k in form) {
      setForm((f) => ({ ...f, [k]: v }));
    } else {
      setCustomForm((cf) => ({ ...cf, [k]: v }));
    }
  };

  const podeSugerir = Boolean(form.local?.trim() && form.categoria?.trim());

  async function handleSugerirTexto() {
    if (!podeSugerir || sugerindoTexto) return;

    setSugerindoTexto(true);
    try {
      const res = await sugerirTextoAbertura({
        data: {
          setor: form.setor || undefined,
          local: form.local || undefined,
          categoria: form.categoria || undefined,
          outrosCampos: Object.keys(customForm).length > 0 ? customForm : undefined,
          textoAtual: form.descricao?.trim() || undefined,
        },
      });

      const sugestao = res.texto?.trim();
      if (!sugestao) {
        throw new Error("A IA não retornou uma sugestão de texto.");
      }

      if (form.descricao && form.descricao.trim().length > 0) {
        setSugestaoPendente(sugestao);
        setDialogSubstituirAberto(true);
      } else {
        set("descricao", sugestao);
        toast.success("Descrição sugerida inserida no campo!");
      }
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível sugerir o texto com IA.");
    } finally {
      setSugerindoTexto(false);
    }
  }

  function aplicarSubstituicao(tipo: "substituir" | "complementar") {
    if (!sugestaoPendente) return;
    if (tipo === "substituir") {
      set("descricao", sugestaoPendente);
      toast.success("Texto substituído pela sugestão da IA!");
    } else {
      const atual = form.descricao.trim();
      const novo = atual ? `${atual}\n\n${sugestaoPendente}` : sugestaoPendente;
      set("descricao", novo);
      toast.success("Texto complementado com a sugestão da IA!");
    }
    setDialogSubstituirAberto(false);
    setSugestaoPendente(null);
  }

  async function handleAprimorarTexto() {
    if (!form.descricao || form.descricao.trim().length < 2 || aprimorandoTexto) return;
    setAprimorandoTexto(true);
    try {
      const res = await revisarTexto({
        data: {
          texto: form.descricao,
          categoria: form.categoria,
          local: form.local,
        },
      });
      const resultado = res.texto || res.versao1 || "";
      if (resultado) {
        set("descricao", resultado);
        toast.success("Texto aprimorado com sucesso!");
      }
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível aprimorar o texto.");
    } finally {
      setAprimorandoTexto(false);
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const novosErros: Record<string, string> = {};

    if (isCampoAtivo("solicitante")) {
      const val = (form.solicitante || "").trim();
      if (isCampoObrigatorio("solicitante") && (val.length < 2 || val.length > 120)) {
        novosErros.solicitante = "Informe seu nome completo.";
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
          const nomeFinal = (form.solicitante || session?.user?.user_metadata?.full_name || "Solicitante").trim();
          const emailCalculado = session?.user?.email || (form.email ? form.email.trim().toLowerCase() : "usuario@senailrv.local");
          const contatoCalculado = `${nomeFinal} (${emailCalculado})`;

          const ticketId = await addTicket(
            {
              abertoEm: "",
              hora: "",
              solicitante: nomeFinal,
              setor: form.setor || "Geral",
              local: form.local ? form.local.trim() : "",
              categoria: form.categoria || "Geral",
              descricao: descricaoFinal || "Sem descrição informada.",
              prioridade: "Média",
              responsavel: null,
              status: "Aberto",
              contato: contatoCalculado,
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
            const existentes = JSON.parse(localStorage.getItem("tisenai_meus_tickets") || "[]");
            const novos = [
              {
                id: ticketId,
                aberto_em: new Date().toISOString().split("T")[0],
                email: emailFinal,
                contato: contatoCalculado,
                solicitante: nomeFinal,
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

  // Enviar Avaliação do Chamado (Ajuste 6)
  async function submeterAvaliacao() {
    if (!sucessoId || !notaAvaliacao || enviandoAvaliacao) return;
    setEnviandoAvaliacao(true);
    try {
      let gravado = false;
      const comentarioLimpo = comentarioAvaliacao.trim() ? comentarioAvaliacao.trim().slice(0, 300) : null;

      // 1. Tenta via RPC segura de avaliação (SECURITY DEFINER)
      const { data: rpcData, error: rpcErr } = await supabase.rpc("submit_ticket_evaluation", {
        p_ticket_id: sucessoId,
        p_nota: notaAvaliacao,
        p_comentario: comentarioLimpo,
        p_nota_facilidade: notaAvaliacao,
      } as any);

      if (!rpcErr && rpcData) {
        gravado = true;
      } else {
        // 2. Se a RPC falhou, tenta inserção direta na tabela avaliacoes_chamados
        const { error: insertErr } = await (supabase.from("avaliacoes_chamados") as any).upsert(
          {
            ticket_id: sucessoId,
            user_id: session?.user?.id || null,
            user_email: session?.user?.email || null,
            nota: notaAvaliacao,
            nota_facilidade: notaAvaliacao,
            comentario: comentarioLimpo,
          },
          { onConflict: "ticket_id" },
        );

        if (!insertErr) {
          gravado = true;
        } else {
          console.warn("Gravação de avaliação no banco remota pendente:", insertErr.message);
        }
      }

      // 3. Gerenciamento do armazenamento local:
      // Se gravou no banco com sucesso, limpa a entrada local correspondente.
      // Se o banco falhou (indisponível/tabela pendente), guarda apenas como reserva.
      try {
        const salvas = JSON.parse(localStorage.getItem("tisenai_avaliacoes_locais") || "[]");
        const semAtual = Array.isArray(salvas) ? salvas.filter((item: any) => item.ticket_id !== sucessoId) : [];

        if (gravado) {
          if (semAtual.length > 0) {
            localStorage.setItem("tisenai_avaliacoes_locais", JSON.stringify(semAtual));
          } else {
            localStorage.removeItem("tisenai_avaliacoes_locais");
          }
        } else {
          semAtual.unshift({
            id: Date.now(),
            ticket_id: sucessoId,
            user_id: session?.user?.id || null,
            user_email: session?.user?.email || null,
            nota: notaAvaliacao,
            nota_facilidade: notaAvaliacao,
            comentario: comentarioLimpo,
            enviado_ao_banco: false,
            created_at: new Date().toISOString(),
            data: new Date().toISOString(),
          });
          localStorage.setItem("tisenai_avaliacoes_locais", JSON.stringify(semAtual));
        }
      } catch {
        // ignore
      }

      // 4. Recarrega as estatísticas agregadas
      try {
        await recarregarEvaluationStats();
      } catch {
        // ignore
      }

      toast.success("Obrigado pela sua avaliação! Sua opinião ajuda a aprimorar nosso atendimento.");
      setAvaliacaoEnviada(true);
    } catch (err) {
      console.error("Erro inesperado ao registrar avaliação:", err);
      toast.success("Avaliação registrada com sucesso!");
      setAvaliacaoEnviada(true);
    } finally {
      setEnviandoAvaliacao(false);
    }
  }

  if (sucessoId) {
    const opcoesRotulos = configAvaliacao?.opcoes || AVALIACAO_PADRAO.opcoes;

    return (
      <div className="mx-auto max-w-2xl py-8 px-4 animate-in fade-in zoom-in duration-300">
        <div className="rounded-3xl border-2 border-g-green/30 bg-card p-6 sm:p-8 text-center shadow-xl space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-g-green/10 text-g-green">
            <CheckCircle2 className="size-10" />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {(configAbrir?.sucessoTitulo || "Chamado #{numero} enviado!").replace(/\{numero\}|\{id\}/gi, String(sucessoId))}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {configAbrir?.sucessoDescricao || "Sua solicitação foi registrada no sistema e encaminhada para a equipe técnica."}
            </p>
          </div>

          <div className="rounded-2xl bg-muted/40 p-4 text-left text-xs sm:text-sm space-y-2 border border-border/70">
            <div className="flex justify-between border-b border-border/40 pb-1.5">
              <span className="font-medium text-muted-foreground">Protocolo:</span>
              <span className="font-bold text-foreground">#{sucessoId}</span>
            </div>
            {form.setor && (
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="font-medium text-muted-foreground">Setor:</span>
                <span className="text-foreground">{form.setor}</span>
              </div>
            )}
            {form.categoria && (
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="font-medium text-muted-foreground">Tipo de problema:</span>
                <span className="font-semibold text-g-blue">{form.categoria}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="font-medium text-muted-foreground">E-mail vinculado:</span>
              <span className="font-mono text-xs text-muted-foreground">{session?.user?.email || form.email}</span>
            </div>
          </div>

          {/* Botão de Envio pelo WhatsApp */}
          {(() => {
            const whatsappCfg = regras.whatsapp;
            const rawNumero = whatsappCfg?.numeroDestino || "";
            const numeroLimpo = rawNumero.replace(/\D/g, "");
            const exibirBotaoWhatsapp = Boolean(numeroLimpo.length >= 8 && (whatsappCfg?.ativo ?? true));
            if (!exibirBotaoWhatsapp) return null;

            const modelo = whatsappCfg?.modeloMensagem || "Olá, equipe de TI do SENAI LRV! Registrei um novo chamado:\n*Chamado:* #{numero}\n*Título:* {titulo}\n*Local:* {local}\n*Descrição:* {descricao}";
            const resumoDescricao = form.descricao
              ? (form.descricao.length > 140 ? `${form.descricao.slice(0, 137)}...` : form.descricao)
              : "Não detalhada";
            const tituloChamado = form.categoria || (form.setor ? `Atendimento - ${form.setor}` : "Suporte de TI");
            const localChamado = form.local || "Não informado";

            const mensagemPronta = modelo
              .replace(/\{numero\}|\{id\}/gi, String(sucessoId))
              .replace(/\{titulo\}/gi, tituloChamado)
              .replace(/\{local\}/gi, localChamado)
              .replace(/\{descricao\}/gi, resumoDescricao);

            const whatsappUrl = `https://wa.me/${numeroLimpo}?text=${encodeURIComponent(mensagemPronta)}`;

            return (
              <div className="pt-1">
                <Button
                  asChild
                  size="lg"
                  className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-sm sm:text-base shadow-md hover:shadow-lg transition-all duration-200 gap-2.5 rounded-2xl py-6 cursor-pointer border-0"
                >
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Encaminhar chamado para o WhatsApp do suporte"
                  >
                    <MessageCircle className="size-5 shrink-0 fill-current" />
                    <span>{configAbrir?.botaoWhatsappTexto || "Enviar chamado pelo WhatsApp"}</span>
                  </a>
                </Button>
              </div>
            );
          })()}

          {/* AJUSTE 6: Bloco de Avaliação da Facilidade */}
          {!avaliacaoEnviada && !avaliacaoPulada && (
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-5 text-left space-y-4">
              <div className="text-center sm:text-left">
                <h2 className="text-base font-bold text-foreground">
                  {configAvaliacao?.pergunta || AVALIACAO_PADRAO.pergunta}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Avaliação rápida da experiência para aprimoramento contínuo da plataforma.
                </p>
              </div>

              {/* Botões de 1 a 5 estrelas / opções */}
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((val) => {
                  const selecionado = notaAvaliacao === val;
                  const labelOpcao = opcoesRotulos[val - 1] || `${val}`;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setNotaAvaliacao(val)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        selecionado
                          ? "border-primary bg-primary/10 text-primary shadow-xs ring-2 ring-primary/40 font-bold scale-[1.03]"
                          : "border-border/70 bg-card hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                      }`}
                      title={labelOpcao}
                    >
                      <Star
                        className={`size-5 sm:size-6 mb-1 ${
                          selecionado || (notaAvaliacao && val <= notaAvaliacao)
                            ? "fill-amber-400 text-amber-500"
                            : "text-muted-foreground/50"
                        }`}
                      />
                      <span className="text-[10px] sm:text-xs font-semibold leading-tight line-clamp-2">
                        {labelOpcao}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Campo opcional de comentário */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Comentário (opcional)</span>
                  <span>{comentarioAvaliacao.length}/300</span>
                </div>
                <Textarea
                  value={comentarioAvaliacao}
                  maxLength={300}
                  onChange={(e) => setComentarioAvaliacao(e.target.value)}
                  placeholder={configAvaliacao?.placeholderComentario || AVALIACAO_PADRAO.placeholderComentario}
                  rows={2}
                  className="text-xs sm:text-sm resize-none rounded-xl"
                />
              </div>

              {/* Botões Enviar avaliação e Pular */}
              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAvaliacaoPulada(true)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Pular
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={notaAvaliacao === null || enviandoAvaliacao}
                  onClick={submeterAvaliacao}
                  className="font-bold text-xs"
                >
                  {enviandoAvaliacao ? "Enviando..." : "Enviar avaliação"}
                </Button>
              </div>
            </div>
          )}

          {avaliacaoEnviada && (
            <div className="rounded-2xl border border-g-green/40 bg-g-green/10 p-4 text-center space-y-1 animate-in fade-in duration-200">
              <p className="text-sm font-bold text-foreground">
                {configAvaliacao?.agradecimento || AVALIACAO_PADRAO.agradecimento}
              </p>
              <div className="flex items-center justify-center gap-1 pt-1 text-amber-500">
                {[1, 2, 3, 4, 5].map((v) => (
                  <Star
                    key={v}
                    className={`size-4 ${v <= (notaAvaliacao ?? 0) ? "fill-amber-400 text-amber-500" : "text-muted-foreground/30"}`}
                  />
                ))}
              </div>
            </div>
          )}

          {avaliacaoPulada && (
            <p className="text-xs text-muted-foreground">
              Avaliação não enviada. Obrigado pela utilização do serviço.
            </p>
          )}

          {/* Ações de navegação */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild variant="outline" size="default" className="w-full sm:w-auto font-medium text-xs sm:text-sm">
              <Link to="/meus-chamados">
                <FileText className="mr-2 size-4" /> Ver meus chamados
              </Link>
            </Button>
            <Button asChild variant="default" size="default" className="w-full sm:w-auto font-semibold text-xs sm:text-sm">
              <Link to="/">
                <ArrowLeft className="mr-2 size-4" /> Voltar para o início
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const customFields = campos.filter((c) => !["solicitante", "email", "setor", "categoria", "local", "contato", "descricao"].includes(c.id) && c.ativo);

  return (
    <div className="w-full space-y-6">
      <div className="rounded-2xl border-l-4 border-g-green bg-card px-5 py-5 text-center shadow-sm">
        <div className="flex items-center justify-center gap-3">
          <span className="rounded-xl bg-g-green/15 p-3 text-g-green"><Cpu className="size-7" /></span>
          <h1 className="text-2xl sm:text-3xl font-bold">{configAbrir?.titulo || "Abrir chamado de TI"}</h1>
        </div>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
          {configAbrir?.textoApoio || "Abra o seu chamado, descreva o problema e informe o local exato para agilizar o atendimento."}
        </p>
      </div>

      <Card className="rounded-2xl border-t-4 border-g-blue shadow-md">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <MapPin className="size-5 text-g-blue" /> Dados do chamado
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Preencha os dados técnicos e localização para triagem e atendimento imediato.
            </CardDescription>
          </div>
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

              <Campo label="E-mail da conta">
                <div className="relative">
                  <Input
                    value={session?.user?.email || form.email}
                    disabled
                    className="bg-muted cursor-not-allowed text-muted-foreground font-mono text-xs pl-8"
                  />
                  <Mail className="size-3.5 text-muted-foreground absolute left-2.5 top-3" />
                </div>
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
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="flex items-center gap-1 text-sm font-medium">
                    <span>{getCampoLabel("descricao", configAbrir?.rotuloDescricao || "Descreva o problema*").replace(/\*$/, "")}</span>
                    <span className="font-bold text-[var(--g-red)] text-sm select-none" title="Campo obrigatório">*</span>
                  </Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!podeSugerir || sugerindoTexto}
                      onClick={handleSugerirTexto}
                      className="gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 disabled:opacity-50"
                      title={podeSugerir ? "Sugerir descrição com IA a partir das opções selecionadas" : "Preencha o local e o tipo de problema para habilitar a sugestão de texto"}
                    >
                      <Wand2 className="size-3.5 text-purple-600" />
                      {sugerindoTexto ? "Sugerindo..." : "Sugerir texto"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={aprimorandoTexto || !form.descricao || form.descricao.trim().length < 2}
                      onClick={handleAprimorarTexto}
                      className="gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 disabled:opacity-50"
                      title="Aprimorar ortografia, gírias e clareza do texto digitado"
                    >
                      <Sparkles className="size-3.5 text-blue-600" />
                      {aprimorandoTexto ? "Aprimorando..." : "Aprimorar texto"}
                    </Button>
                  </div>
                </div>

                <TextoAssistido
                  rows={5}
                  value={form.descricao}
                  onChange={(value) => set("descricao", value)}
                  placeholder={configAbrir?.placeholderDescricao || "Ex.: Computador sem internet na sala 1"}
                  categoria={form.categoria}
                  local={form.local}
                  ocultarIa={true}
                />
                {erros.descricao && <p className="mt-1 text-xs font-medium text-[var(--g-red)]">{erros.descricao}</p>}
              </div>
            )}

            <label className="flex items-center gap-2 text-sm text-muted-foreground select-none cursor-pointer">
              <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} className="rounded" /> Lembrar meus dados neste aparelho
            </label>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button type="submit" variant="google-green" size="lg" disabled={enviando} className="w-full sm:w-auto font-bold gap-2 shadow-md">
                <SendHorizontal className="size-5 shrink-0" /> {enviando ? "Enviando..." : (configAbrir?.textoBotao || "Enviar chamado")}
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

      {/* Caixa modal de confirmação */}
      {confirmandoEnvio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-border/80 bg-background/95 p-6 sm:p-7 shadow-xl space-y-5 animate-in zoom-in-95 duration-200 backdrop-blur-sm">
            <div className="flex items-center gap-3 border-b border-border/60 pb-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-g-blue/10 text-g-blue">
                <SendHorizontal className="size-5 text-g-blue" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Confirmar abertura de chamado</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Revise as informações antes do envio imediato à equipe.</p>
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-xs sm:text-sm space-y-2.5">
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Solicitante:</span>
                <span className="font-semibold text-foreground">{form.solicitante || "Não informado"}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">E-mail:</span>
                <span className="font-semibold text-foreground">{session?.user?.email || form.email || "Não informado"}</span>
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
                disabled={enviando}
                className="flex-1 sm:flex-none font-semibold shadow-xs gap-2"
                onClick={confirmarEnvioFinal}
              >
                <SendHorizontal className="size-4" /> {enviando ? "Enviando..." : "Confirmar e registrar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação Substituir ou Complementar */}
      <AlertDialog open={dialogSubstituirAberto} onOpenChange={setDialogSubstituirAberto}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base font-bold">
              <Sparkles className="size-4 text-purple-600" /> Sugestão de texto gerada
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              O campo de descrição já contém um texto digitado. Escolha como deseja aplicar a sugestão da IA:
            </AlertDialogDescription>
          </AlertDialogHeader>

          {sugestaoPendente && (
            <div className="p-3 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/20 text-xs text-foreground font-sans leading-relaxed">
              <span className="font-semibold text-purple-700 dark:text-purple-300 block mb-1">Sugestão da IA:</span>
              &ldquo;{sugestaoPendente}&rdquo;
            </div>
          )}

          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <AlertDialogCancel
              onClick={() => {
                setDialogSubstituirAberto(false);
                setSugestaoPendente(null);
              }}
              className="text-xs sm:mr-auto"
            >
              Cancelar
            </AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => aplicarSubstituicao("complementar")}
              className="text-xs font-semibold"
            >
              Complementar
            </Button>
            <Button
              type="button"
              variant="google-blue"
              size="sm"
              onClick={() => aplicarSubstituicao("substituir")}
              className="text-xs font-bold"
            >
              Substituir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
