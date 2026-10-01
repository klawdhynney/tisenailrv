import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  FileText,
  LogOut,
  Mail,
  MapPin,
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
        content: "Acompanhe e complemente os chamados associados ao seu e-mail.",
      },
      { property: "og:title", content: "Meus chamados | TI Senai LRV" },
      {
        property: "og:description",
        content: "Acompanhe seus chamados de TI e envie informações adicionais.",
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
};

function MeusChamados() {
  const { session, sair } = useStore();
  const navigate = useNavigate();
  const [rows, setRows] = useState<OwnTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [emailLocal, setEmailLocal] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const e =
        localStorage.getItem("tisenai_user_email") || localStorage.getItem("tisenai_email");
      if (e) setEmailLocal(e.trim().toLowerCase());
    }
  }, []);

  const activeEmail = session?.user?.email?.toLowerCase() ?? emailLocal;

  async function load() {
    if (!activeEmail) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // 1. Tenta carregar pela sessão autenticada do Supabase
      const { data: dbData } = await supabase
        .from("tickets")
        .select("id,aberto_em,descricao,status,prioridade,solicitante,local,setor,procedimento")
        .order("id", { ascending: false });

      if (dbData && dbData.length > 0) {
        setRows(dbData);
        setLoading(false);
        return;
      }

      // 2. Se não houver retorno da tabela privada (acesso simples por e-mail), busca dos chamados gravados localmente para este e-mail
      let locais: OwnTicket[] = [];
      try {
        const cached = JSON.parse(localStorage.getItem("tisenai_meus_tickets") || "[]");
        locais = cached.filter(
          (t: any) => (t.email || "").toLowerCase() === activeEmail,
        );
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
  }, [activeEmail, session?.user?.id]);

  async function addInformation(id: number) {
    const text = drafts[id]?.trim();
    if (!text || text.length < 5) {
      toast.error("Escreva pelo menos 5 caracteres.");
      return;
    }

    if (!session) {
      toast.info(
        "Para adicionar informações diretamente ao banco, acesse com sua conta Google ou Microsoft.",
      );
      // Salva localmente como nota
      setRows((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                descricao: `${t.descricao}\n\n[Informação adicional do solicitante em ${new Date().toLocaleDateString("pt-BR")}]: ${text}`,
              }
            : t,
        ),
      );
      setDrafts((prev) => ({ ...prev, [id]: "" }));
      return;
    }

    const { error } = await supabase.rpc("add_ticket_information", {
      ticket_id: id,
      additional_text: text,
    });

    if (error) {
      toast.error("Não foi possível enviar as informações.");
    } else {
      toast.success("Informações enviadas com sucesso!");
      setDrafts((prev) => ({ ...prev, [id]: "" }));
      await load();
    }
  }

  const desconectar = async () => {
    localStorage.removeItem("tisenai_user_email");
    setEmailLocal(null);
    await sair();
    toast.success("Você saiu da sua conta.");
    navigate({ to: "/auth" });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Barra superior de status e ações */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Meus chamados
          </h1>
          {activeEmail ? (
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

          {activeEmail && (
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

      {/* Caso o usuário ainda não tenha informado um e-mail */}
      {!activeEmail ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card p-8 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-g-blue/10 text-g-blue">
            <Mail className="size-7" />
          </div>
          <h2 className="text-xl font-bold">Identifique-se para ver seus chamados</h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Digite o mesmo e-mail que você utilizou ao abrir o chamado para liberar o acesso ao seu
            painel ou entre com sua conta corporativa Google/Microsoft.
          </p>
          <div className="pt-2">
            <Button asChild variant="google-blue" size="lg" className="font-semibold">
              <Link to="/auth">Entrar com e-mail ou conta corporativa</Link>
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
            Nenhum chamado foi registrado ainda para o e-mail <strong>{activeEmail}</strong> neste
            navegador.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Button asChild variant="google-blue">
              <Link to="/abrir">Abrir um chamado agora</Link>
            </Button>
            <Button variant="outline" onClick={desconectar}>
              Trocar de e-mail
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