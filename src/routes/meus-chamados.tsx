import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store-context";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ConfirmAction";
import { TextoAssistido } from "@/components/TextoAssistido";

export const Route = createFileRoute("/meus-chamados")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Meus chamados | TI Senai LRV" }, { name: "description", content: "Acompanhe e complemente os chamados associados ao seu e-mail confirmado." },
    { property: "og:title", content: "Meus chamados | TI Senai LRV" }, { property: "og:description", content: "Acompanhe seus chamados de TI e envie informações adicionais." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: MeusChamados,
});

type OwnTicket = { id: number; aberto_em: string; descricao: string; status: string; prioridade: string; solicitante: string; local: string; setor: string; procedimento: string | null };
function MeusChamados() {
  const { session } = useStore();
  const [rows, setRows] = useState<OwnTicket[]>([]), [loading, setLoading] = useState(true), [drafts, setDrafts] = useState<Record<number, string>>({});
  async function load() { setLoading(true); const { data, error } = await supabase.from("tickets").select("id,aberto_em,descricao,status,prioridade,solicitante,local,setor,procedimento").order("id", { ascending: false }); if (error) toast.error("Não foi possível carregar seus chamados."); setRows(data ?? []); setLoading(false); }
  useEffect(() => { if (session) void load(); else { setRows([]); setLoading(false); } }, [session?.user.id]);
  async function addInformation(id: number) { const text = drafts[id]?.trim(); if (!text || text.length < 5) { toast.error("Escreva pelo menos 5 caracteres."); return; } const { error } = await supabase.rpc("add_ticket_information", { ticket_id: id, additional_text: text }); if (error) toast.error("Não foi possível enviar as informações."); else { toast.success("Informações enviadas."); setDrafts(prev => ({ ...prev, [id]: "" })); await load(); } }
  return <div className="mx-auto max-w-4xl space-y-6"><h1 className="text-center text-3xl font-bold">Meus chamados</h1>
     {!session ? <div className="space-y-3"><p>Entre com Google ou Microsoft usando o e-mail do chamado para acompanhar e complementar.</p><Button asChild><Link to="/auth">Entrar</Link></Button></div> : <><p className="text-sm text-muted-foreground">Chamados vinculados a {session.user.email}</p>{loading ? <p>Carregando…</p> : rows.length === 0 ? <p>Nenhum chamado encontrado para este e-mail confirmado.</p> : rows.map(t => <article key={t.id} className="space-y-4 border-b border-border py-6"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold">Chamado #{t.id}</h2><span className="text-sm font-semibold">{t.status} · {t.prioridade}</span></div><p className="text-sm text-muted-foreground">{t.aberto_em} · {t.setor} / {t.local}</p><p className="whitespace-pre-wrap">{t.descricao}</p>{t.procedimento && <p className="border-l-2 border-g-green pl-3 text-sm">Atendimento: {t.procedimento}</p>}<div className="text-sm font-medium">Enviar informações adicionais<TextoAssistido value={drafts[t.id] ?? ""} onChange={value => setDrafts(prev => ({ ...prev, [t.id]: value }))} rows={3} /></div><ConfirmAction disabled={(drafts[t.id]?.trim().length ?? 0) < 5} title={`Enviar informações ao chamado #${t.id}?`} description="Seu texto será acrescentado ao chamado e poderá ser lido pela equipe de TI." confirmLabel="Sim, enviar" onConfirm={() => addInformation(t.id)}>Enviar informações</ConfirmAction></article>)}</>}
  </div>;
}