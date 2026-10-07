import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  FileText,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Pause,
  PlusCircle,
  RefreshCw,
  SendHorizontal,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store-context";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ConfirmAction";
import { TextoAssistido } from "@/components/TextoAssistido";
import { PrioridadeChip, StatusChip } from "@/components/Chips";
import { TicketChat } from "@/components/TicketChat";
import { AVALIACAO_PADRAO, MEUS_CHAMADOS_PADRAO } from "@/lib/types";

export const Route = createFileRoute("/meus-chamados")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({
        to: "/auth",
        search: { redirectTo: "/meus-chamados" },
      });
    }
  },
  ssr: false,
  head: () => ({
    meta: [
      { title: "Meus chamados | TI Senai LRV" },
      {
        name: "description",
        content: "Acompanhe e complemente os chamados associados à sua conta de usuário.",
      },
      { property: "og:title", content: "Meus chamados | TI Senai LRV" },
      {
        property: "og:description",
        content: "Acompanhe seus chamados de TI, avalie o atendimento e envie informações adicionais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MeusChamados,
});

type OwnTicket = {
  id: number;
  aberto_em: string;
  hora?: string | null;
  descricao: string;
  status: string;
  prioridade: string;
  solicitante: string;
  local: string;
  setor: string;
  procedimento: string | null;
  contato?: string | null;
  email?: string | null;
  sla_pausado?: boolean;
  sla_pausado_em?: string | null;
  sla_pausa_motivo?: string | null;
  sla_segundos_pausados_acumulados?: number;
  fechado_em?: string | null;
  horario?: string | null;
};

const EMOJIS_AVALIACAO = [
  { id: "triste", emoji: "😞", label: "Triste", desc: "Insatisfeito", bgActive: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500 ring-2 ring-red-500/40" },
  { id: "neutro", emoji: "😐", label: "Neutro", desc: "Regular", bgActive: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500 ring-2 ring-amber-500/40" },
  { id: "feliz", emoji: "😊", label: "Feliz", desc: "Satisfeito", bgActive: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500 ring-2 ring-green-500/40" },
  { id: "surpreso", emoji: "😲", label: "Surpreso", desc: "Superou expectativas", bgActive: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500 ring-2 ring-purple-500/40" },
] as const;

const OPCOES_FACILIDADE_CURTAS = [
  { val: 1, label: "Muito difícil" },
  { val: 2, label: "Difícil" },
  { val: 3, label: "Regular" },
  { val: 4, label: "Fácil" },
  { val: 5, label: "Muito fácil" },
] as const;

function AvaliacaoAtendimento({
  ticketId,
  onAvaliar,
}: {
  ticketId: number;
  onAvaliar?: (avaliacao: { emoji: string; label: string; comentario: string; nota_facilidade?: number | null }) => void;
}) {
  const { regras } = useStore();
  const configAvaliacao = { ...AVALIACAO_PADRAO, ...(regras.avaliacao ?? {}) };
  const [salva, setSalva] = useState<{
    emoji: string;
    label: string;
    comentario: string;
    data: string;
    nota_facilidade?: number | null;
  } | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [notaFacilidade, setNotaFacilidade] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    try {
      const todas = JSON.parse(localStorage.getItem("tisenai_avaliacoes") || "{}");
      if (todas[ticketId]) {
        setSalva(todas[ticketId]);
        setSelecionado(todas[ticketId].label.toLowerCase());
        setComentario(todas[ticketId].comentario || "");
        if (todas[ticketId].nota_facilidade) {
          setNotaFacilidade(Number(todas[ticketId].nota_facilidade));
        }
      }
    } catch {
      // ignore
    }
  }, [ticketId]);

  function salvar() {
    const item = EMOJIS_AVALIACAO.find((e) => e.id === selecionado);
    if (!item) {
      toast.error("Selecione um dos emojis para registrar a avaliação.");
      return;
    }

    const payload = {
      emoji: item.emoji,
      label: item.label,
      comentario: comentario.trim(),
      nota_facilidade: notaFacilidade,
      data: new Date().toLocaleDateString("pt-BR"),
    };

    const notaMapeada = item.id === "triste" ? 1 : item.id === "neutro" ? 3 : item.id === "feliz" ? 4 : 5;
    const comentarioLimpo = comentario.trim() ? comentario.trim().slice(0, 300) : null;

    // 1. Tenta persistir no Supabase via RPC ou tabela direta
    supabase
      .rpc("submit_ticket_evaluation", {
        p_ticket_id: ticketId,
        p_nota: notaMapeada,
        p_comentario: comentarioLimpo,
        p_nota_facilidade: notaFacilidade,
      } as any)
      .then(({ error: rpcErr }) => {
        if (rpcErr) {
          (supabase.from("avaliacoes_chamados") as any)
            .upsert(
              {
                ticket_id: ticketId,
                nota: notaMapeada,
                nota_facilidade: notaFacilidade,
                comentario: comentarioLimpo,
              },
              { onConflict: "ticket_id" },
            )
            .then(({ error: upsertErr }) => {
              if (upsertErr) {
                // Guarda como reserva local pois o banco remoto falhou
                try {
                  const salvasLocais = JSON.parse(localStorage.getItem("tisenai_avaliacoes_locais") || "[]");
                  const semAtual = Array.isArray(salvasLocais) ? salvasLocais.filter((i: any) => i.ticket_id !== ticketId) : [];
                  semAtual.unshift({
                    id: Date.now(),
                    ticket_id: ticketId,
                    nota: notaMapeada,
                    nota_facilidade: notaFacilidade,
                    comentario: comentarioLimpo,
                    enviado_ao_banco: false,
                    created_at: new Date().toISOString(),
                    data: new Date().toISOString(),
                  });
                  localStorage.setItem("tisenai_avaliacoes_locais", JSON.stringify(semAtual));
                } catch {
                  // ignore
                }
              }
            })
            .catch(() => {});
        } else {
          // Sucesso no banco: limpa do cache local se existir para não duplicar
          try {
            const salvasLocais = JSON.parse(localStorage.getItem("tisenai_avaliacoes_locais") || "[]");
            const semAtual = Array.isArray(salvasLocais) ? salvasLocais.filter((i: any) => i.ticket_id !== ticketId) : [];
            if (semAtual.length > 0) {
              localStorage.setItem("tisenai_avaliacoes_locais", JSON.stringify(semAtual));
            } else {
              localStorage.removeItem("tisenai_avaliacoes_locais");
            }
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {});

    // 2. Salva no cache clássico por ID para visualização imediata do próprio solicitante
    try {
      const todas = JSON.parse(localStorage.getItem("tisenai_avaliacoes") || "{}");
      todas[ticketId] = payload;
      localStorage.setItem("tisenai_avaliacoes", JSON.stringify(todas));
    } catch {
      // ignore
    }

    setSalva(payload);
    setEditando(false);
    toast.success(configAvaliacao.agradecimento || "Obrigado pela sua avaliação! Seu feedback foi registrado.");
    onAvaliar?.(payload);
  }

  if (salva && !editando) {
    const rotuloFacilidade = salva.nota_facilidade
      ? OPCOES_FACILIDADE_CURTAS.find((o) => o.val === salva.nota_facilidade)?.label
      : null;

    return (
      <div className="rounded-xl border border-g-green/30 bg-g-green/5 p-3.5 space-y-2 animate-in fade-in">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl select-none">{salva.emoji}</span>
            <div>
              <p className="text-xs font-bold text-foreground">
                Sua avaliação do atendimento: <span className="text-g-green dark:text-green-400 font-extrabold">{salva.label}</span>
              </p>
              {rotuloFacilidade && (
                <p className="text-[11px] text-muted-foreground">
                  Facilidade para abrir: <strong className="text-foreground">{rotuloFacilidade} ({salva.nota_facilidade}/5)</strong>
                </p>
              )}
              {salva.comentario && (
                <p className="text-xs text-muted-foreground italic mt-0.5">"{salva.comentario}"</p>
              )}
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setEditando(true)}
            className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
          >
            Alterar avaliação
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-border/80 bg-muted/25 p-4 space-y-4 animate-in fade-in">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
          <span className="text-xs font-black uppercase tracking-wider text-foreground">
            {configAvaliacao.pergunta || "1. Satisfação com o Atendimento"}
          </span>
          <span className="text-[11px] font-semibold text-muted-foreground">Como foi seu suporte?</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {EMOJIS_AVALIACAO.map((e) => {
            const ativo = selecionado === e.id;
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => setSelecionado(e.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer ${
                  ativo
                    ? `${e.bgActive} shadow-sm scale-[1.03]`
                    : "bg-card hover:bg-muted/70 border-border text-foreground"
                }`}
              >
                <span className="text-2xl transition-transform hover:scale-125 duration-150 select-none">{e.emoji}</span>
                <span className="text-xs font-bold mt-1">{e.label}</span>
                <span className="text-[10px] text-muted-foreground">{e.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
          <span className="text-xs font-black uppercase tracking-wider text-foreground">
            2. Facilidade para Abrir o Chamado
          </span>
          <span className="text-[11px] font-semibold text-muted-foreground">Quão fácil foi abrir a solicitação?</span>
        </div>

        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {OPCOES_FACILIDADE_CURTAS.map((op) => {
            const ativo = notaFacilidade === op.val;
            return (
              <button
                key={op.val}
                type="button"
                onClick={() => setNotaFacilidade(op.val)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-center transition-all cursor-pointer text-xs ${
                  ativo
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-xs ring-2 ring-primary/40 scale-[1.02]"
                    : "bg-card hover:bg-muted/70 border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="font-bold text-sm">{op.val}★</span>
                <span className="text-[10px] leading-tight line-clamp-1 mt-0.5">{op.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 pt-1">
        <input
          type="text"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Deixe um elogio, sugestão ou observação opcional..."
          className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-g-blue"
        />
        <div className="flex justify-end gap-2">
          {salva && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditando(false)} className="text-xs">
              Cancelar
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="google-green"
            onClick={salvar}
            disabled={!selecionado}
            className="text-xs font-bold gap-1 shadow-xs"
          >
            Confirmar avaliação
          </Button>
        </div>
      </div>
    </div>
  );
}

function MeusChamados() {
  const { session, sair, authPronto, regras } = useStore();
  const configMeus = { ...MEUS_CHAMADOS_PADRAO, ...(regras.meusChamados ?? {}) };
  const navigate = useNavigate();
  const [rows, setRows] = useState<OwnTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [atualizandoTicketId, setAtualizandoTicketId] = useState<number | null>(null);
  const [textoAtualizacao, setTextoAtualizacao] = useState<Record<number, string>>({});
  const [salvandoId, setSalvandoId] = useState<number | null>(null);
  const [emailLocal, setEmailLocal] = useState<string | null>(null);
  const [whatsappLocal, setWhatsappLocal] = useState<string | null>(null);

  useEffect(() => {
    if (authPronto && !session) {
      navigate({
        to: "/auth",
        search: { redirectTo: "/meus-chamados" },
      });
    }
  }, [authPronto, session, navigate]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const e =
        localStorage.getItem("tisenai_user_email") || localStorage.getItem("tisenai_email");
      if (e) setEmailLocal(e.trim().toLowerCase());

      const w =
        localStorage.getItem("tisenai_user_whatsapp_display") ||
        localStorage.getItem("tisenai_user_whatsapp");
      if (w) setWhatsappLocal(w.trim());
    }
  }, []);

  const activeEmail = session?.user?.email?.toLowerCase() ?? emailLocal;
  const activeWhatsapp = whatsappLocal;

  async function load() {
    if (!activeEmail && !activeWhatsapp) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // 1. Tenta carregar pela sessão autenticada do Supabase
      const { data: dbData } = await supabase
        .from("tickets")
        .select("id,aberto_em,hora,descricao,status,prioridade,solicitante,local,setor,procedimento,contato,solicitante_email,sla_pausado,sla_pausado_em,sla_pausa_motivo,sla_segundos_pausados_acumulados,fechado_em,horario")
        .order("id", { ascending: false });

      if (dbData && dbData.length > 0) {
        setRows(
          dbData.map((d: any) => ({
            ...d,
            email: d.solicitante_email,
            sla_pausado: Boolean(d.sla_pausado),
            fechado_em: d.fechado_em,
            horario: d.horario,
          })),
        );
        setLoading(false);
        return;
      }

      // 2. Se não houver retorno da tabela privada (acesso simples por e-mail ou WhatsApp), busca dos chamados gravados localmente
      let locais: OwnTicket[] = [];
      try {
        const cached = JSON.parse(localStorage.getItem("tisenai_meus_tickets") || "[]");
        const cleanWhatsapp = (num: string) => (num || "").replace(/\D/g, "");
        const activeCleanWpp = activeWhatsapp ? cleanWhatsapp(activeWhatsapp) : "";

        locais = cached.filter((t: any) => {
          const emailMatch =
            activeEmail &&
            !activeEmail.includes("@whatsapp.senailrv.local") &&
            (t.email || "").toLowerCase() === activeEmail.toLowerCase();
          const wppMatch =
            activeCleanWpp &&
            ((t.contato && cleanWhatsapp(t.contato).includes(activeCleanWpp)) ||
              (t.email && cleanWhatsapp(t.email).includes(activeCleanWpp)));
          const aliasMatch = activeEmail && (t.email || "").toLowerCase() === activeEmail.toLowerCase();
          return emailMatch || wppMatch || aliasMatch;
        });
      } catch {
        locais = [];
      }

      // 3. Atualiza os dados locais com o progresso público em tempo real (SLA, status, prioridade)
      const { data: publicProgress } = await supabase.rpc("public_ticket_sla_progress");
      if (publicProgress && publicProgress.length > 0) {
        const progressMap = new Map((publicProgress as any[]).map((p) => [p.id, p]));

        locais = locais.map((t) => {
          const live = progressMap.get(t.id);
          if (live) {
            return {
              ...t,
              status: live.status || t.status,
              prioridade: live.prioridade || t.prioridade,
              aberto_em: live.aberto_em || t.aberto_em,
              hora: live.hora || t.hora,
              sla_pausado: Boolean(live.sla_pausado),
              sla_pausado_em: live.sla_pausado_em || t.sla_pausado_em,
              sla_pausa_motivo: live.sla_pausa_motivo || t.sla_pausa_motivo,
              sla_segundos_pausados_acumulados: live.sla_segundos_pausados_acumulados || t.sla_segundos_pausados_acumulados,
            };
          }
          return t;
        });
      }

      setRows(locais);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível carregar todos os chamados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [activeEmail, activeWhatsapp, session?.user?.id]);

  async function addInformation(id: number, customText?: string): Promise<boolean> {
    const text = (customText ?? drafts[id])?.trim();
    if (!text || text.length < 3) {
      toast.error("Escreva pelo menos 3 caracteres.");
      return false;
    }

    if (!session) {
      // Salva localmente como nota
      setRows((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                descricao: `${t.descricao}\n\n[Informação do solicitante em ${new Date().toLocaleDateString("pt-BR")}]: ${text}`,
              }
            : t,
        ),
      );
      if (!customText) setDrafts((prev) => ({ ...prev, [id]: "" }));
      return true;
    }

    const { error } = await supabase.rpc("add_ticket_information", {
      ticket_id: id,
      additional_text: text,
    });

    if (error) {
      toast.error("Não foi possível enviar as informações.");
      return false;
    } else {
      if (!customText) toast.success("Informações enviadas com sucesso!");
      if (!customText) setDrafts((prev) => ({ ...prev, [id]: "" }));
      await load();
      return true;
    }
  }

  async function handleSalvarAtualizacao(t: OwnTicket) {
    const texto = (textoAtualizacao[t.id] || "").trim();
    if (!texto || texto.length < 3) {
      toast.error("Escreva pelo menos 3 caracteres para atualizar.");
      return;
    }
    setSalvandoId(t.id);
    try {
      const ok = await addInformation(t.id, texto);
      if (ok) {
        // Envia também uma mensagem na conversa se autenticado para notificar a equipe de TI
        if (session?.user?.id) {
          try {
            await supabase.from("ticket_mensagens").insert({
              ticket_id: t.id,
              user_id: session.user.id,
              autor_nome: session.user.user_metadata?.full_name || t.solicitante || "Solicitante",
              autor_email: session.user.email || t.email,
              autor_tipo: "solicitante",
              mensagem: `[Atualização do Chamado]: ${texto}`,
            });
          } catch (e) {
            console.warn("Falha ao registrar mensagem complementar no chat:", e);
          }
        }
        setTextoAtualizacao((prev) => ({ ...prev, [t.id]: "" }));
        setAtualizandoTicketId(null);
        toast.success("Chamado atualizado com sucesso!");
        await load();
      }
    } catch (err) {
      console.error(err);
      toast.error("Ocorreu um erro ao atualizar o chamado.");
    } finally {
      setSalvandoId(null);
    }
  }

  const desconectar = async () => {
    localStorage.removeItem("tisenai_user_email");
    localStorage.removeItem("tisenai_email");
    localStorage.removeItem("tisenai_user_whatsapp");
    localStorage.removeItem("tisenai_user_whatsapp_display");
    setEmailLocal(null);
    setWhatsappLocal(null);
    await sair();
    toast.success("Você saiu da sua conta.");
    navigate({ to: "/auth" });
  };

  const isIdentificado = Boolean(activeEmail || activeWhatsapp);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Barra superior de status e ações */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {configMeus.titulo || "Meus chamados"}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
            {configMeus.subtitulo || "Histórico pessoal, andamento operacional de SLA e inclusão de dados adicionais aos seus tickets."}
          </p>
          {activeEmail && (
            <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5 font-mono">
              <Mail className="size-3.5 text-g-blue" />
              <span>Conectado como:</span>
              <strong className="font-semibold text-foreground">{activeEmail}</strong>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="google-green" size="sm" className="font-semibold shadow-xs">
            <Link to="/abrir">
              <PlusCircle className="mr-1.5 size-4" /> {configMeus.botaoNovoChamado || "Abrir novo chamado"}
            </Link>
          </Button>

          {isIdentificado && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void load()}
                disabled={loading}
                title="Atualizar lista"
              >
                <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={desconectar}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <LogOut className="mr-1.5 size-3.5" /> Sair
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Caso o usuário ainda não tenha se identificado */}
      {!isIdentificado ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card p-8 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-g-blue/10 text-g-blue">
            <Mail className="size-7" />
          </div>
          <h2 className="text-xl font-bold">Identifique-se para ver seus chamados</h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Digite o mesmo e-mail ou número de WhatsApp que você utilizou ao abrir o chamado para liberar o acesso ao seu
            painel ou entre com sua conta corporativa Google/Microsoft.
          </p>
          <div className="pt-2">
            <Button asChild variant="google-blue" size="lg" className="font-semibold">
              <Link to="/auth">Entrar com e-mail, WhatsApp ou conta corporativa</Link>
            </Button>
          </div>
        </div>
      ) : loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground font-medium">
          Carregando seus chamados...
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-border/70 bg-card p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <FileText className="size-6" />
          </div>
          <h2 className="text-lg font-bold">{configMeus.vazioTitulo || "Nenhum chamado encontrado"}</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {configMeus.vazioTexto || "Nenhum chamado foi registrado ainda para este e-mail ou contato."}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Button asChild variant="google-blue">
              <Link to="/abrir">Abrir um chamado agora</Link>
            </Button>
            <Button variant="outline" onClick={desconectar}>
              Trocar identificação
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground font-medium">
            Exibindo {rows.length} {rows.length === 1 ? "chamado" : "chamados"} vinculados a você:
          </p>

          {rows.map((t) => (
            <article
              key={t.id}
              className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4 hover:border-border transition-colors"
            >
              {/* Topo do chamado */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-foreground">#{t.id}</span>
                  <span className="text-xs text-muted-foreground font-medium">
                    · Aberto em {t.aberto_em}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <PrioridadeChip valor={t.prioridade} />
                  <StatusChip valor={t.status} />
                  {t.sla_pausado && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-black bg-[#F59E0B] text-black shadow-xs">
                      <Pause className="size-3 shrink-0" /> SLA pausado
                    </span>
                  )}
                </div>
              </div>

              {/* Informações de Localização e Solicitante */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{t.solicitante}</span>
                {t.setor && (
                  <span className="flex items-center gap-1">
                    <span className="text-foreground/40">•</span> Setor: {t.setor}
                  </span>
                )}
                {t.local && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3 text-muted-foreground" /> {t.local}
                  </span>
                )}
              </div>

              {/* Banner de SLA Pausado (quando ativo) */}
              {t.sla_pausado && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs flex items-center gap-2.5 animate-in fade-in">
                  <Pause className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <span className="font-bold text-amber-700 dark:text-amber-300">
                      SLA pausado pela equipe:
                    </span>{" "}
                    <span className="text-foreground">{t.sla_pausa_motivo || "Aguardando tratativa"}</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      O relógio de prazo limite foi congelado e o tempo da pausa não contará como atraso.
                    </p>
                  </div>
                </div>
              )}

              {/* Descrição */}
              <div className="rounded-xl bg-muted/40 p-3.5 text-sm text-foreground/90 border border-border/40 whitespace-pre-wrap leading-relaxed">
                {t.descricao}
              </div>

              {/* Atualização e Complemento do Chamado com IA */}
              <div className="rounded-xl border border-purple-200/80 dark:border-purple-900/50 bg-purple-50/30 dark:bg-purple-950/15 p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Sparkles className="size-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Atualização e Complemento do Chamado</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAtualizandoTicketId(atualizandoTicketId === t.id ? null : t.id)}
                    className="h-8 text-xs font-semibold text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800 hover:bg-purple-100/60 dark:hover:bg-purple-900/40 gap-1.5 shadow-2xs"
                  >
                    <Sparkles className="size-3.5 text-purple-600 dark:text-purple-400" />
                    <span>{atualizandoTicketId === t.id ? "Fechar atualização" : "Atualizar chamado com IA"}</span>
                  </Button>
                </div>

                {atualizandoTicketId === t.id ? (
                  <div className="pt-2 space-y-3 border-t border-purple-200/60 dark:border-purple-900/50 animate-in fade-in">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Descreva o novo comportamento do problema ou detalhes adicionais. Clique em <strong>Aprimorar com IA</strong> para estruturar sua mensagem antes de salvar.
                    </p>
                    <TextoAssistido
                      value={textoAtualizacao[t.id] || ""}
                      onChange={(val) => setTextoAtualizacao((prev) => ({ ...prev, [t.id]: val }))}
                      placeholder="Ex.: O problema voltou a ocorrer por volta das 14h, e agora a máquina exibe uma mensagem de falha ao salvar..."
                      rows={3}
                      ticketId={t.id}
                      titulo={t.setor ? `Chamado #${t.id} - ${t.setor}` : `Chamado #${t.id}`}
                      descricao={t.descricao}
                      categoria={t.setor}
                      local={t.local}
                    />
                    <div className="flex flex-wrap justify-end items-center gap-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setAtualizandoTicketId(null)}
                        className="text-xs h-8"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="google-blue"
                        onClick={() => void handleSalvarAtualizacao(t)}
                        disabled={salvandoId === t.id || !((textoAtualizacao[t.id] || "").trim().length >= 3)}
                        className="text-xs font-bold gap-1.5 h-8 shadow-xs"
                      >
                        {salvandoId === t.id ? (
                          <RefreshCw className="size-3.5 animate-spin" />
                        ) : (
                          <SendHorizontal className="size-3.5" />
                        )}
                        Salvar atualização
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    O problema mudou ou você tem novas informações? Clique em <strong>Atualizar chamado com IA</strong> para complementar os dados diretamente para os técnicos.
                  </p>
                )}
              </div>

              {/* Procedimento / Resposta da TI */}
              {t.procedimento && (
                <div className="rounded-xl border-l-4 border-l-g-green bg-g-green/5 p-3.5 border border-g-green/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-g-green dark:text-green-400">
                    <CheckCircle2 className="size-3.5" />
                    <span>Resposta / Procedimento de Atendimento da TI:</span>
                  </div>
                  <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed pl-5">
                    {t.procedimento}
                  </p>
                </div>
              )}

              {/* Sistema de Avaliação com Emojis (ao final do suporte) */}
              {(t.status === "Resolvido" || Boolean(t.procedimento)) && (
                <AvaliacaoAtendimento
                  ticketId={t.id}
                  onAvaliar={(av) => {
                    void addInformation(
                      t.id,
                      `[Avaliação do Usuário]: ${av.emoji} ${av.label}${av.comentario ? ` - "${av.comentario}"` : ""}`,
                    );
                  }}
                />
              )}

              {/* Conversa e Interação Direta com a Equipe de TI (Chat) */}
              <div className="pt-2 border-t border-border/60 space-y-2">
                <TicketChat
                  ticketId={t.id}
                  solicitanteNome={t.solicitante}
                  solicitanteEmail={t.email}
                  ticketDescricao={t.descricao}
                  ticketAbertoEm={t.aberto_em}
                  ticketHora={t.hora}
                  ticketProcedimento={t.procedimento}
                  ticketStatus={t.status}
                  ticketFechadoEm={t.fechado_em}
                  ticketSlaPausado={t.sla_pausado}
                  ticketSlaPausadoEm={t.sla_pausado_em}
                  ticketSlaPausaMotivo={t.sla_pausa_motivo}
                  currentUserEmail={activeEmail}
                  currentUserName={session?.user?.user_metadata?.full_name || t.solicitante}
                  isGestorOrAdmin={false}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}