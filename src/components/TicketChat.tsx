import { useEffect, useRef, useState, useMemo } from "react";
import {
  MessageSquare,
  Send,
  RefreshCw,
  Shield,
  Clock,
  Sparkles,
  CheckCircle2,
  Pause,
  Play,
  ArrowRightCircle,
  Info,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import type { TicketMensagem } from "@/lib/types";
import { CHAT_PADRAO } from "@/lib/types";
import { useStore } from "@/lib/store-context";
import { revisarTexto } from "@/lib/revisar-texto.functions";

interface TicketChatProps {
  ticketId: number;
  solicitanteNome: string;
  solicitanteEmail?: string | null;
  ticketDescricao: string;
  ticketAbertoEm: string;
  ticketHora?: string | null;
  ticketProcedimento?: string | null;
  ticketStatus?: string | null;
  ticketFechadoEm?: string | null;
  ticketSlaPausado?: boolean;
  ticketSlaPausadoEm?: string | null;
  ticketSlaPausaMotivo?: string | null;
  slaHistoricoPausas?: Array<{ inicio: string; fim?: string | null; motivo?: string | null }>;
  currentUserEmail?: string | null;
  currentUserName?: string | null;
  isGestorOrAdmin: boolean;
  onMensagemEnviada?: (mensagem: string) => void;
  disabled?: boolean;
}

export function TicketChat({
  ticketId,
  solicitanteNome,
  solicitanteEmail,
  ticketDescricao,
  ticketAbertoEm,
  ticketHora,
  ticketProcedimento,
  ticketStatus,
  ticketFechadoEm,
  ticketSlaPausado,
  ticketSlaPausadoEm,
  ticketSlaPausaMotivo,
  slaHistoricoPausas,
  currentUserEmail,
  currentUserName,
  isGestorOrAdmin,
  onMensagemEnviada,
  disabled = false,
}: TicketChatProps) {
  const { regras } = useStore();
  const configChat = { ...CHAT_PADRAO, ...(regras.chat ?? {}) };
  const [mensagens, setMensagens] = useState<TicketMensagem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [novoTexto, setNovoTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aprimorando, setAprimorando] = useState(false);
  const [limiteExibicao, setLimiteExibicao] = useState(25);
  const [carregandoAnteriores, setCarregandoAnteriores] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isCarregamentoInicialRef = useRef(true);
  const totalMensagensAnteriorRef = useRef(0);
  const [temNovasMensagens, setTemNovasMensagens] = useState(false);

  const aprimorarMensagem = async () => {
    if (!novoTexto.trim() || aprimorando) return;
    setAprimorando(true);
    try {
      const res = await revisarTexto({
        data: {
          texto: novoTexto,
          ticketId,
          descricao: ticketDescricao,
        },
      });
      const melhorado = res.texto || res.versao1 || "";
      if (melhorado) {
        setNovoTexto(melhorado);
        toast.success("Texto aprimorado com sucesso!");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível aprimorar o texto.");
    } finally {
      setAprimorando(false);
    }
  };

  // Rolagem restrita ao contêiner interno do chat (NUNCA move a página/window)
  const rolarContainerAteFinal = (suave = true) => {
    const el = containerRef.current;
    if (!el) return;
    if (suave) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  };

  const estaPertoDoFimDoContainer = () => {
    const el = containerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const handleScrollContainer = () => {
    const el = containerRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) {
      setTemNovasMensagens(false);
    }
  };

  const carregarMensagens = async () => {
    try {
      const { data, error } = await supabase
        .from("ticket_mensagens")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("criado_em", { ascending: true });

      if (error) {
        console.warn("Erro ao carregar mensagens:", error.message);
        return;
      }

      if (data && Array.isArray(data)) {
        const mapeadas: TicketMensagem[] = data.map((d: any) => ({
          id: d.id,
          ticketId: d.ticket_id,
          userId: d.user_id,
          autorNome: d.autor_nome,
          autorEmail: d.autor_email,
          autorTipo: d.autor_tipo,
          mensagem: d.mensagem,
          criadoEm: d.criado_em,
          editadoEm: d.editado_em,
          mensagemOriginal: d.mensagem_original,
          excluidoEm: d.excluido_em,
          eventoTipo: d.evento_tipo,
        }));
        setMensagens(mapeadas);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    void carregarMensagens();

    // Inscrição em tempo real para novas mensagens e eventos
    const canal = supabase
      .channel(`chat_ticket_${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ticket_mensagens",
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          void carregarMensagens();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [ticketId]);

  useEffect(() => {
    if (carregando) return;

    // No primeiro carregamento das mensagens: NUNCA rola a página nem o chat
    if (isCarregamentoInicialRef.current) {
      isCarregamentoInicialRef.current = false;
      totalMensagensAnteriorRef.current = mensagens.length;
      return;
    }

    // Quando novas mensagens chegam após a montagem inicial (ex.: tempo real):
    if (mensagens.length > totalMensagensAnteriorRef.current) {
      totalMensagensAnteriorRef.current = mensagens.length;

      if (estaPertoDoFimDoContainer()) {
        // Usuário já está acompanhando o fim do chat: rola apenas o contêiner interno
        rolarContainerAteFinal(true);
      } else {
        // Usuário está lendo mensagens anteriores: exibe aviso discreto sem arrastar nada
        setTemNovasMensagens(true);
      }
    }
  }, [carregando, mensagens.length]);

  // Histórico completo consolidado em ordem cronológica com avisos de eventos
  const todasMensagens = useMemo(() => {
    const lista: TicketMensagem[] = [...mensagens];
    const descLimpa = (ticketDescricao || "").trim();

    // 1. Mensagem de Abertura do Chamado (garante presença se ainda não gravada no chat)
    const temMensagemAbertura = lista.some(
      (m) =>
        (m.mensagem && descLimpa && m.mensagem.trim() === descLimpa) ||
        m.eventoTipo === "abertura" ||
        (m.mensagem && m.mensagem.toLowerCase().includes("chamado aberto")),
    );
    if (!temMensagemAbertura && (descLimpa || ticketAbertoEm)) {
      let dataAbertura = new Date().toISOString();
      try {
        const [y, m, d] = (ticketAbertoEm || "").split("-").map(Number);
        const [h, min] = (ticketHora || "08:00").split(":").map(Number);
        if (y && m && d) {
          dataAbertura = new Date(y, m - 1, d, h || 8, min || 0).toISOString();
        }
      } catch {
        // ignore
      }

      if (descLimpa) {
        lista.unshift({
          id: `sintetica-abertura-${ticketId}`,
          ticketId,
          autorNome: solicitanteNome || "Solicitante",
          autorEmail: solicitanteEmail || "solicitante@senailrv.local",
          autorTipo: "solicitante",
          mensagem: descLimpa,
          criadoEm: dataAbertura,
          eventoTipo: "abertura",
        });
      }
    }

    // 2. Procedimento Técnico (se registrado antes do chat e não estiver na lista)
    const procLimpo = (ticketProcedimento || "").trim();
    if (procLimpo) {
      const temProcNaLista = lista.some(
        (m) => m.mensagem && m.mensagem.trim() === procLimpo,
      );
      if (!temProcNaLista) {
        lista.push({
          id: `sintetica-procedimento-${ticketId}`,
          ticketId,
          autorNome: "Equipe de TI SENAI LRV",
          autorEmail: "suporte@senailrv.local",
          autorTipo: "equipe",
          mensagem: procLimpo,
          criadoEm: new Date().toISOString(),
          eventoTipo: "procedimento",
        });
      }
    }

    // 3. Pausas e Retomadas do SLA do histórico (se não constarem nas mensagens do banco)
    if (slaHistoricoPausas && Array.isArray(slaHistoricoPausas)) {
      slaHistoricoPausas.forEach((pausa, idx) => {
        if (!pausa || !pausa.inicio) return;
        const jaTemPausa = lista.some(
          (m) =>
            m.autorTipo === "sistema" &&
            m.mensagem &&
            m.mensagem.toLowerCase().includes("sla pausado") &&
            Math.abs(new Date(m.criadoEm || 0).getTime() - new Date(pausa.inicio).getTime()) < 60000,
        );
        if (!jaTemPausa) {
          lista.push({
            id: `sintetica-pausa-${ticketId}-${idx}`,
            ticketId,
            autorNome: "Sistema",
            autorEmail: "sistema@senailrv.local",
            autorTipo: "sistema",
            eventoTipo: "sla_pausado",
            mensagem: `SLA pausado${pausa.motivo ? `: ${pausa.motivo}` : ""}.`,
            criadoEm: pausa.inicio,
          });
        }

        if (pausa.fim) {
          const jaTemRetomada = lista.some(
            (m) =>
              m.autorTipo === "sistema" &&
              m.mensagem &&
              m.mensagem.toLowerCase().includes("sla retomado") &&
              Math.abs(new Date(m.criadoEm || 0).getTime() - new Date(pausa.fim!).getTime()) < 60000,
          );
          if (!jaTemRetomada) {
            lista.push({
              id: `sintetica-retomada-${ticketId}-${idx}`,
              ticketId,
              autorNome: "Sistema",
              autorEmail: "sistema@senailrv.local",
              autorTipo: "sistema",
              eventoTipo: "sla_retomado",
              mensagem: "SLA retomado pela equipe de suporte.",
              criadoEm: pausa.fim,
            });
          }
        }
      });
    }

    // 4. Finalização do Chamado sintetizada caso o chamado já esteja resolvido
    if (
      ticketStatus &&
      ["Resolvido", "Concluído", "Cancelado"].includes(ticketStatus)
    ) {
      const statusLower = (ticketStatus || "").toLowerCase();
      const jaTemFinalizado = lista.some(
        (m) =>
          m.autorTipo === "sistema" &&
          m.mensagem &&
          (m.mensagem.toLowerCase().includes("finalizado") ||
            (statusLower && m.mensagem.toLowerCase().includes(statusLower))),
      );
      if (!jaTemFinalizado) {
        let dataFechamento = new Date().toISOString();
        if (ticketFechadoEm) {
          try {
            const [fy, fm, fd] = ticketFechadoEm.split("-").map(Number);
            if (fy && fm && fd) {
              dataFechamento = new Date(fy, fm - 1, fd, 18, 0).toISOString();
            }
          } catch {}
        }
        lista.push({
          id: `sintetica-finalizado-${ticketId}`,
          ticketId,
          autorNome: "Sistema",
          autorEmail: "sistema@senailrv.local",
          autorTipo: "sistema",
          eventoTipo: "status_finalizado",
          mensagem: `Chamado finalizado como ${ticketStatus}.`,
          criadoEm: dataFechamento,
        });
      }
    }

    // Ordenação cronológica estrita
    return lista.sort(
      (a, b) => new Date(a.criadoEm || 0).getTime() - new Date(b.criadoEm || 0).getTime(),
    );
  }, [
    mensagens,
    ticketId,
    ticketDescricao,
    solicitanteNome,
    solicitanteEmail,
    ticketAbertoEm,
    ticketHora,
    ticketProcedimento,
    ticketStatus,
    ticketFechadoEm,
    slaHistoricoPausas,
  ]);

  // Mensagens visíveis conforme paginação sob demanda
  const mensagensExibidas = useMemo(() => {
    if (todasMensagens.length <= limiteExibicao) return todasMensagens;
    return todasMensagens.slice(todasMensagens.length - limiteExibicao);
  }, [todasMensagens, limiteExibicao]);

  const mensagensOcultasQtd = Math.max(0, todasMensagens.length - mensagensExibidas.length);

  const carregarMensagensAnteriores = () => {
    setCarregandoAnteriores(true);
    setTimeout(() => {
      setLimiteExibicao((prev) => prev + 25);
      setCarregandoAnteriores(false);
    }, 150);
  };

  const enviarMensagem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textoLimpo = novoTexto.trim();
    if (!textoLimpo || textoLimpo.length < 2) {
      toast.error("Digite uma mensagem antes de enviar.");
      return;
    }

    setEnviando(true);
    try {
      const autorTipo: "solicitante" | "equipe" = isGestorOrAdmin ? "equipe" : "solicitante";
      const autorNome =
        currentUserName?.trim() ||
        (isGestorOrAdmin ? "Equipe de TI SENAI LRV" : solicitanteNome);
      const autorEmail =
        currentUserEmail?.trim().toLowerCase() ||
        (isGestorOrAdmin ? "suporte@senailrv.local" : solicitanteEmail || "usuario@senailrv.local");

      // 1. Grava no banco de dados na tabela pública com RLS
      const { data: inserted, error } = await supabase
        .from("ticket_mensagens")
        .insert({
          ticket_id: ticketId,
          autor_nome: autorNome,
          autor_email: autorEmail,
          autor_tipo: autorTipo,
          mensagem: textoLimpo,
          evento_tipo: "mensagem",
        })
        .select()
        .single();

      if (error) {
        console.warn("Tabela ticket_mensagens indisponível no banco, registrando mensagem localmente:", error.message);
        const fallbackMsg: TicketMensagem = {
          id: `local-msg-${Date.now()}`,
          ticketId,
          autorNome,
          autorEmail,
          autorTipo,
          mensagem: textoLimpo,
          criadoEm: new Date().toISOString(),
          eventoTipo: "mensagem",
        };
        setMensagens((prev) => [...prev, fallbackMsg]);
        setNovoTexto("");
        toast.success("Mensagem enviada com sucesso!");
        onMensagemEnviada?.(textoLimpo);
        totalMensagensAnteriorRef.current = totalMensagensAnteriorRef.current + 1;
        setTemNovasMensagens(false);
        setTimeout(() => rolarContainerAteFinal(true), 50);
        return;
      }

      setNovoTexto("");
      toast.success("Mensagem enviada com sucesso!");

      if (inserted) {
        setMensagens((prev) => [
          ...prev,
          {
            id: inserted.id,
            ticketId: inserted.ticket_id,
            userId: inserted.user_id,
            autorNome: inserted.autor_nome,
            autorEmail: inserted.autor_email,
            autorTipo: inserted.autor_tipo,
            mensagem: inserted.mensagem,
            criadoEm: inserted.criado_em,
            editadoEm: inserted.editado_em,
            mensagemOriginal: inserted.mensagem_original,
            excluidoEm: inserted.excluido_em,
            eventoTipo: inserted.evento_tipo,
          },
        ]);
      } else {
        await carregarMensagens();
      }

      onMensagemEnviada?.(textoLimpo);
      totalMensagensAnteriorRef.current = totalMensagensAnteriorRef.current + 1;
      setTemNovasMensagens(false);
      setTimeout(() => rolarContainerAteFinal(true), 50);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Não foi possível enviar a mensagem.");
    } finally {
      setEnviando(false);
    }
  };

  const formatarHora = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const tituloChat = configChat?.titulo || CHAT_PADRAO.titulo || "Conversa sobre o Chamado #{id}";
  const subtituloChat = configChat?.subtitulo ?? CHAT_PADRAO.subtitulo ?? "Envie mensagens, dúvidas e informações adicionais para este chamado.";
  const tituloFormatado = tituloChat.includes("#{id}")
    ? tituloChat.replace("#{id}", `#${ticketId}`)
    : `${tituloChat} #${ticketId}`;

  return (
    <div className="rounded-2xl border-2 border-border/80 bg-card shadow-sm overflow-hidden flex flex-col">
      {/* Topo do Chat */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-g-blue/15 text-g-blue">
            <MessageSquare className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              {tituloFormatado}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {subtituloChat}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Tempo real
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => void carregarMensagens()}
            disabled={carregando}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Atualizar histórico de mensagens"
          >
            <RefreshCw className={`size-3.5 ${carregando ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Área das Mensagens (Scrollable) */}
      <div
        ref={containerRef}
        onScroll={handleScrollContainer}
        className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[260px] max-h-[480px] bg-muted/10 relative"
      >
        {/* Botão de carregar mensagens anteriores sob demanda */}
        {mensagensOcultasQtd > 0 && (
          <div className="flex justify-center pb-2 pt-1 border-b border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={carregarMensagensAnteriores}
              disabled={carregandoAnteriores}
              className="h-8 px-3 rounded-xl text-xs font-semibold border-border/80 bg-card hover:bg-accent text-foreground shadow-xs gap-1.5"
            >
              {carregandoAnteriores ? (
                <RefreshCw className="size-3.5 animate-spin" />
              ) : (
                <Clock className="size-3.5 text-muted-foreground" />
              )}
              Carregar mensagens anteriores ({mensagensOcultasQtd} restantes)
            </Button>
          </div>
        )}

        {carregando && mensagens.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <RefreshCw className="size-4 animate-spin text-g-blue" />
            Carregando conversa...
          </div>
        ) : todasMensagens.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            {configChat.vazioTexto || configChat.textoVazio || "Nenhuma mensagem registrada ainda. Envie a primeira mensagem abaixo!"}
          </div>
        ) : (
          mensagensExibidas.map((msg, index) => {
            // Caso seja um aviso do sistema (linha do tempo de eventos)
            if (msg.autorTipo === "sistema") {
              const textoLower = msg.mensagem.toLowerCase();
              const isFinalizado =
                textoLower.includes("finalizado") ||
                textoLower.includes("concluído") ||
                textoLower.includes("resolvido") ||
                msg.eventoTipo === "status_finalizado";
              const isPausado = textoLower.includes("pausado") || msg.eventoTipo === "sla_pausado";
              const isRetomado = textoLower.includes("retomado") || msg.eventoTipo === "sla_retomado";
              const isStatus = textoLower.includes("status alterado") || msg.eventoTipo === "status_alterado";

              return (
                <div
                  key={msg.id || index}
                  className="flex justify-center my-2.5 animate-in fade-in duration-150"
                >
                  <div
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold shadow-2xs max-w-[95%] sm:max-w-[85%] text-center border",
                      isFinalizado
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                        : isPausado
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                        : isRetomado
                        ? "bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-300"
                        : isStatus
                        ? "bg-g-blue/10 border-g-blue/30 text-g-blue dark:text-sky-300"
                        : "bg-muted/80 border-border/80 text-muted-foreground"
                    )}
                  >
                    {isFinalizado ? (
                      <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                    ) : isPausado ? (
                      <Pause className="size-3.5 shrink-0 text-amber-500" />
                    ) : isRetomado ? (
                      <Play className="size-3.5 shrink-0 text-sky-500" />
                    ) : isStatus ? (
                      <ArrowRightCircle className="size-3.5 shrink-0 text-g-blue" />
                    ) : (
                      <Info className="size-3.5 shrink-0 text-g-blue" />
                    )}
                    <span>{msg.mensagem}</span>
                    <span className="text-[10px] opacity-75 font-normal">
                      · {formatarHora(msg.criadoEm)}
                    </span>
                  </div>
                </div>
              );
            }

            const eEquipe = msg.autorTipo === "equipe";
            const eMinhaMensagem =
              currentUserEmail &&
              msg.autorEmail &&
              msg.autorEmail.toLowerCase().trim() === currentUserEmail.toLowerCase().trim();

            return (
              <div
                key={msg.id || index}
                className={`flex gap-2.5 ${
                  eMinhaMensagem ? "justify-end" : "justify-start"
                } animate-in fade-in duration-150`}
              >
                {/* Avatar para mensagens recebidas */}
                {!eMinhaMensagem && (
                  <div className="shrink-0 mt-0.5">
                    {eEquipe ? (
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-g-green text-white font-bold text-xs shadow-xs"
                        title="Equipe de TI SENAI"
                      >
                        <Shield className="size-4" />
                      </div>
                    ) : (
                      <UserAvatar
                        nome={msg.autorNome}
                        email={msg.autorEmail}
                        sizeClassName="size-8 text-xs"
                      />
                    )}
                  </div>
                )}

                {/* Balão da Mensagem */}
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 space-y-1 shadow-2xs ${
                    eMinhaMensagem
                      ? "bg-g-blue text-white rounded-br-xs"
                      : eEquipe
                      ? "bg-g-green/10 border border-g-green/30 text-foreground rounded-bl-xs"
                      : "bg-card border border-border/80 text-foreground rounded-bl-xs"
                  }`}
                >
                  {/* Cabeçalho do balão: Nome, tipo e hora */}
                  <div className="flex items-center justify-between gap-3 text-[11px] leading-tight pb-0.5">
                    <span
                      className={`font-bold truncate ${
                        eMinhaMensagem
                          ? "text-white/95"
                          : eEquipe
                          ? "text-g-green dark:text-green-400 font-extrabold flex items-center gap-1"
                          : "text-foreground"
                      }`}
                    >
                      {eEquipe && <Shield className="size-3 inline" />}
                      {eMinhaMensagem ? "Você" : msg.autorNome}
                      {eEquipe && !eMinhaMensagem && (
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                          (TI)
                        </span>
                      )}
                    </span>
                    <span
                      className={`text-[10px] shrink-0 ${
                        eMinhaMensagem ? "text-white/75" : "text-muted-foreground"
                      }`}
                    >
                      {formatarHora(msg.criadoEm)}
                    </span>
                  </div>

                  {/* Corpo do texto */}
                  <div
                    className={`text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed ${
                      eMinhaMensagem ? "text-white" : "text-foreground"
                    }`}
                  >
                    {msg.mensagem}
                  </div>
                </div>

                {/* Avatar para mensagens enviadas pelo próprio usuário */}
                {eMinhaMensagem && (
                  <div className="shrink-0 mt-0.5">
                    {isGestorOrAdmin ? (
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-g-blue text-white font-bold text-xs shadow-xs"
                        title="Você (TI)"
                      >
                        <Shield className="size-4" />
                      </div>
                    ) : (
                      <UserAvatar
                        nome={currentUserName || solicitanteNome}
                        email={currentUserEmail || solicitanteEmail}
                        sizeClassName="size-8 text-xs"
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        {temNovasMensagens && (
          <div className="sticky bottom-2 flex justify-center z-20 pointer-events-none">
            <button
              type="button"
              onClick={() => {
                rolarContainerAteFinal(true);
                setTemNovasMensagens(false);
              }}
              className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-g-blue text-white text-xs font-semibold shadow-md hover:bg-blue-600 transition-all cursor-pointer animate-in fade-in zoom-in-95"
              title="Clique para descer até as mensagens mais recentes"
            >
              <ChevronDown className="size-3.5" />
              <span>Novas mensagens</span>
            </button>
          </div>
        )}
      </div>

      {/* Aviso quando o chamado estiver concluído/resolvido */}
      {ticketStatus && ["Resolvido", "Concluído", "Cancelado"].includes(ticketStatus) && (() => {
        const aviso =
          configChat.avisoFinalizado ||
          configChat.avisoResolvido ||
          "Chamado {status}. O histórico e as mensagens continuam disponíveis para consulta.";
        const textoAviso = aviso.includes("{status}")
          ? aviso.replace("{status}", ticketStatus || "")
          : `${aviso} (${ticketStatus})`;
        return (
          <div className="px-4 py-2 bg-muted/40 border-t border-border/60 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-g-green shrink-0" />
            <span>{textoAviso}</span>
          </div>
        );
      })()}

      {/* Barra de Envio de Nova Mensagem */}
      <form
        onSubmit={enviarMensagem}
        className="p-3 bg-card border-t border-border/70 flex items-end gap-2"
      >
        <Textarea
          rows={2}
          value={novoTexto}
          onChange={(e) => setNovoTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void enviarMensagem();
            }
          }}
          disabled={disabled || enviando}
          placeholder={
            disabled
              ? configChat.placeholderDesabilitado || "Envio desabilitado para este chamado."
              : isGestorOrAdmin
              ? configChat.placeholderGestor || configChat.placeholderEquipe || "Escreva uma resposta ou orientação técnica..."
              : configChat.placeholderSolicitante || configChat.placeholderUsuario || "Escreva mais detalhes ou esclareça dúvidas..."
          }
          className="text-xs sm:text-sm min-h-[50px] max-h-[120px] resize-none rounded-xl bg-background"
        />

        {novoTexto.trim().length >= 2 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={aprimorarMensagem}
            disabled={disabled || enviando || aprimorando}
            className="h-10 px-2.5 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 border-purple-300 dark:border-purple-800 gap-1.5 shrink-0"
            title="Aprimorar texto com IA baseado no contexto do chamado"
          >
            <Sparkles className="size-3.5" />
            <span className="hidden md:inline">{aprimorando ? "Aprimorando..." : "Aprimorar com IA"}</span>
          </Button>
        )}

        <Button
          type="submit"
          variant={isGestorOrAdmin ? "google-green" : "google-blue"}
          disabled={disabled || enviando || novoTexto.trim().length < 2}
          className="h-10 px-3.5 sm:px-4 font-bold shrink-0 shadow-xs"
        >
          {enviando ? (
            <RefreshCw className="size-4 animate-spin" />
          ) : (
            <>
              <Send className="size-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Enviar</span>
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
