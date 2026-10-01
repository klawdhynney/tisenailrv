import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
  PlusCircle,
  RefreshCw,
  SendHorizontal,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store-context";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ConfirmAction";
import { TextoAssistido } from "@/components/TextoAssistido";
import { PrioridadeChip, StatusChip } from "@/components/Chips";

export const Route = createFileRoute("/meus-chamados")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Meus chamados | TI Senai LRV" },
      {
        name: "description",
        content: "Acompanhe e complemente os chamados associados ao seu e-mail ou WhatsApp.",
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
  descricao: string;
  status: string;
  prioridade: string;
  solicitante: string;
  local: string;
  setor: string;
  procedimento: string | null;
  contato?: string | null;
  email?: string | null;
};

const EMOJIS_AVALIACAO = [
  { id: "triste", emoji: "😞", label: "Triste", desc: "Insatisfeito", bgActive: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500 ring-2 ring-red-500/40" },
  { id: "neutro", emoji: "😐", label: "Neutro", desc: "Regular", bgActive: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500 ring-2 ring-amber-500/40" },
  { id: "feliz", emoji: "😊", label: "Feliz", desc: "Satisfeito", bgActive: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500 ring-2 ring-green-500/40" },
  { id: "surpreso", emoji: "😲", label: "Surpreso", desc: "Superou expectativas", bgActive: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500 ring-2 ring-purple-500/40" },
] as const;

function AvaliacaoAtendimento({
  ticketId,
  onAvaliar,
}: {
  ticketId: number;
  onAvaliar?: (avaliacao: { emoji: string; label: string; comentario: string }) => void;
}) {
  const [salva, setSalva] = useState<{ emoji: string; label: string; comentario: string; data: string } | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [comentario, setComentario] = useState("");
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    try {
      const todas = JSON.parse(localStorage.getItem("tisenai_avaliacoes") || "{}");
      if (todas[ticketId]) {
        setSalva(todas[ticketId]);
        setSelecionado(todas[ticketId].label.toLowerCase());
        setComentario(todas[ticketId].comentario || "");
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
      data: new Date().toLocaleDateString("pt-BR"),
    };

    try {
      const todas = JSON.parse(localStorage.getItem("tisenai_avaliacoes") || "{}");
      todas[ticketId] = payload;
      localStorage.setItem("tisenai_avaliacoes", JSON.stringify(todas));
    } catch {
      // ignore
    }

    setSalva(payload);
    setEditando(false);
    toast.success("Obrigado pela sua avaliação! Seu feedback foi registrado.");
    onAvaliar?.(payload);
  }

  if (salva && !editando) {
    return (
      <div className="rounded-xl border border-g-green/30 bg-g-green/5 p-3.5 space-y-1.5 animate-in fade-in">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl select-none">{salva.emoji}</span>
            <div>
              <p className="text-xs font-bold text-foreground">
                Sua avaliação: <span className="text-g-green dark:text-green-400 font-extrabold">{salva.label}</span>
              </p>
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
    <div className="rounded-2xl border-2 border-border/80 bg-muted/25 p-4 space-y-3 animate-in fade-in">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <span className="text-xs font-black uppercase tracking-wider text-foreground">
          Avaliação do Atendimento
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

      {selecionado && (
        <div className="space-y-2 pt-1 animate-in fade-in">
          <input
            type="text"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Deixe um elogio ou observação sobre o atendimento (opcional)..."
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
              className="text-xs font-bold gap-1 shadow-xs"
            >
              Confirmar avaliação
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MeusChamados() {
  const { session, sair } = useStore();
  const navigate = useNavigate();
  const [rows, setRows] = useState<OwnTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [emailLocal, setEmailLocal] = useState<string | null>(null);
  const [whatsappLocal, setWhatsappLocal] = useState<string | null>(null);

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
        .select("id,aberto_em,descricao,status,prioridade,solicitante,local,setor,procedimento,contato,solicitante_email")
        .order("id", { ascending: false });

      if (dbData && dbData.length > 0) {
        setRows(
          dbData.map((d: any) => ({
            ...d,
            email: d.solicitante_email,
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
        const progressMap = new Map(publicProgress.map((p) => [p.id, p]));

        locais = locais.map((t) => {
          const live = progressMap.get(t.id);
          if (live) {
            return {
              ...t,
              status: live.status || t.status,
              prioridade: live.prioridade || t.prioridade,
              aberto_em: live.aberto_em || t.aberto_em,
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

  async function addInformation(id: number, customText?: string) {
    const text = (customText ?? drafts[id])?.trim();
    if (!text || text.length < 3) {
      toast.error("Escreva pelo menos 3 caracteres.");
      return;
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
      return;
    }

    const { error } = await supabase.rpc("add_ticket_information", {
      ticket_id: id,
      additional_text: text,
    });

    if (error) {
      toast.error("Não foi possível enviar as informações.");
    } else {
      if (!customText) toast.success("Informações enviadas com sucesso!");
      if (!customText) setDrafts((prev) => ({ ...prev, [id]: "" }));
      await load();
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
            Meus chamados
          </h1>
          {activeWhatsapp ? (
            <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1.5">
              <MessageCircle className="size-4 text-[#25D366]" />
              <span>Conectado pelo WhatsApp:</span>
              <strong className="font-semibold text-foreground">{activeWhatsapp}</strong>
            </p>
          ) : activeEmail ? (
            <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1.5">
              <Mail className="size-4 text-g-blue" />
              <span>Conectado como</span>
              <strong className="font-semibold text-foreground">{activeEmail}</strong>
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Acompanhe o andamento de todos os seus chamados de suporte técnico.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="google-green" size="sm" className="font-semibold shadow-xs">
            <Link to="/abrir">
              <PlusCircle className="mr-1.5 size-4" /> Abrir novo chamado
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
        <div className="py-12 text-center text-sm text-muted-foreground">
          <RefreshCw className="mx-auto mb-2 size-6 animate-spin text-g-blue" />
          Carregando seus chamados...
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-border/70 bg-card p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <FileText className="size-6" />
          </div>
          <h2 className="text-lg font-bold">Nenhum chamado encontrado</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Nenhum chamado foi registrado ainda para{" "}
            <strong>{activeWhatsapp ? `o WhatsApp ${activeWhatsapp}` : activeEmail}</strong> neste
            navegador.
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

              {/* Descrição */}
              <div className="rounded-xl bg-muted/40 p-3.5 text-sm text-foreground/90 border border-border/40 whitespace-pre-wrap leading-relaxed">
                {t.descricao}
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

              {/* Área para adicionar informações */}
              <div className="pt-2 border-t border-border/60 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <MessageSquare className="size-3.5 text-g-blue" />
                  <span>Enviar informações complementares</span>
                </div>
                <TextoAssistido
                  value={drafts[t.id] ?? ""}
                  onChange={(val) => setDrafts((prev) => ({ ...prev, [t.id]: val }))}
                  rows={2}
                  placeholder="Acrescente detalhes sobre o problema se necessário..."
                />
                <div className="flex justify-end">
                  <ConfirmAction
                    disabled={(drafts[t.id]?.trim().length ?? 0) < 5}
                    title={`Enviar informações ao chamado #${t.id}?`}
                    description="Seu complemento será anexado ao chamado e poderá ser lido pelos técnicos de TI."
                    confirmLabel="Sim, enviar"
                    onConfirm={() => addInformation(t.id)}
                  >
                    <span className="flex items-center gap-1.5 text-xs font-semibold">
                      <SendHorizontal className="size-3.5" /> Enviar complemento
                    </span>
                  </ConfirmAction>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}