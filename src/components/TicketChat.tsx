import { useEffect, useRef, useState, useMemo } from "react";
import { MessageSquare, Send, RefreshCw, Shield, User, Bot, Clock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/UserAvatar";
import type { TicketMensagem } from "@/lib/types";
import { revisarTexto } from "@/lib/revisar-texto.functions";

interface TicketChatProps {
  ticketId: number;
  solicitanteNome: string;
  solicitanteEmail?: string | null;
  ticketDescricao: string;
  ticketAbertoEm: string;
  ticketHora?: string | null;
  ticketProcedimento?: string | null;
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
  currentUserEmail,
  currentUserName,
  isGestorOrAdmin,
  onMensagemEnviada,
  disabled = false,
}: TicketChatProps) {
  const [mensagens, setMensagens] = useState<TicketMensagem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [novoTexto, setNovoTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aprimorando, setAprimorando] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);

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

  // Rolagem suave até a última mensagem
  const rolarAteFinal = (suave = true) => {
    if (scrollEndRef.current) {
      scrollEndRef.current.scrollIntoView({ behavior: suave ? "smooth" : "auto" });
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

    // Inscrição em tempo real para novas mensagens
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
    if (!carregando) {
      rolarAteFinal(false);
    }
  }, [carregando, mensagens.length]);

  // Mensagens sintéticas de histórico (abertura original e procedimento inicial se não estiverem no banco)
  const todasMensagens = useMemo(() => {
    const lista = [...mensagens];

    // Se o banco ainda não tiver mensagens registradas, adiciona a descrição inicial da abertura
    const temMensagemAbertura = lista.some((m) => m.mensagem.trim() === ticketDescricao.trim());
    if (!temMensagemAbertura && ticketDescricao) {
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

      lista.unshift({
        id: `sintetica-abertura-${ticketId}`,
        ticketId,
        autorNome: solicitanteNome,
        autorEmail: solicitanteEmail || "solicitante@senailrv.local",
        autorTipo: "solicitante",
        mensagem: ticketDescricao,
        criadoEm: dataAbertura,
      });
    }

    // Se o chamado tiver procedimento técnico registrado antes da migração
    if (ticketProcedimento && ticketProcedimento.trim()) {
      const temProcNaLista = lista.some(
        (m) => m.mensagem.trim() === ticketProcedimento.trim(),
      );
      if (!temProcNaLista) {
        lista.push({
          id: `sintetica-procedimento-${ticketId}`,
          ticketId,
          autorNome: "Equipe de TI SENAI LRV",
          autorEmail: "suporte@senailrv.local",
          autorTipo: "equipe",
          mensagem: ticketProcedimento,
          criadoEm: new Date().toISOString(),
        });
      }
    }

    return lista.sort(
      (a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime(),
    );
  }, [mensagens, ticketId, ticketDescricao, solicitanteNome, solicitanteEmail, ticketAbertoEm, ticketHora, ticketProcedimento]);

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
        })
        .select()
        .single();

      if (error) {
        throw error;
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
          },
        ]);
      } else {
        await carregarMensagens();
      }

      // Notifica o componente pai para atualizar procedimento caso seja gestor
      onMensagemEnviada?.(textoLimpo);
      setTimeout(() => rolarAteFinal(true), 100);
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
              Conversa do Chamado #{ticketId}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Interação em tempo real entre solicitante e equipe de suporte
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
            title="Atualizar mensagens"
          >
            <RefreshCw className={`size-3.5 ${carregando ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Área das Mensagens (Scrollable) */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[240px] max-h-[460px] bg-muted/10"
      >
        {carregando && mensagens.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <RefreshCw className="size-4 animate-spin text-g-blue" />
            Carregando conversa...
          </div>
        ) : todasMensagens.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            Nenhuma mensagem registrada ainda. Envie a primeira mensagem abaixo!
          </div>
        ) : (
          todasMensagens.map((msg, index) => {
            const eEquipe = msg.autorTipo === "equipe";
            const eMinhaMensagem =
              currentUserEmail &&
              msg.autorEmail &&
              msg.autorEmail.toLowerCase().trim() === currentUserEmail.toLowerCase().trim();

            // Mensagens da equipe ficam em destaque
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
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-g-green text-white font-bold text-xs shadow-xs" title="Equipe de TI SENAI">
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
                  {/* Cabeçalho do balão: Nome e Tipo */}
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

                {/* Avatar para minhas mensagens */}
                {eMinhaMensagem && (
                  <div className="shrink-0 mt-0.5">
                    {isGestorOrAdmin ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-g-blue text-white font-bold text-xs shadow-xs" title="Você (TI)">
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
        <div ref={scrollEndRef} />
      </div>

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
            isGestorOrAdmin
              ? "Escreva uma resposta ou orientação técnica para o solicitante... (Enter para enviar)"
              : "Escreva mais detalhes ou esclareça dúvidas com a equipe de TI... (Enter para enviar)"
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
