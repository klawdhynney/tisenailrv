import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Cpu, MapPin, Send, CheckCircle2, MessageCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store-context";
import { TextoAssistido } from "@/components/TextoAssistido";

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
  setor: "",
  categoria: "",
  descricao: "",
};

interface Erros {
  solicitante?: string;
  email?: string;
  setor?: string;
  categoria?: string;
  descricao?: string;
}

function AbrirChamado() {
  const { regras, addTicket } = useStore();
  const navigate = useNavigate();
  const [form, setForm] = useState(campoVazio);
  const [erros, setErros] = useState<Erros>({});
  const [enviando, setEnviando] = useState(false);
  const [sucessoId, setSucessoId] = useState<number | null>(null);
  const [lembrar, setLembrar] = useState(false);
  const [preferenciaCarregada, setPreferenciaCarregada] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ti-senai-dados") ?? "null");
      if (saved && typeof saved === "object") {
        setForm(f => ({ ...f, solicitante: typeof saved.solicitante === "string" ? saved.solicitante : "", email: typeof saved.email === "string" ? saved.email : "", setor: typeof saved.setor === "string" ? saved.setor : "" }));
        setLembrar(true);
      }
    } catch { localStorage.removeItem("ti-senai-dados"); }
    setPreferenciaCarregada(true);
  }, []);
  useEffect(() => {
    if (!preferenciaCarregada) return;
    if (lembrar) localStorage.setItem("ti-senai-dados", JSON.stringify({ solicitante: form.solicitante, email: form.email, setor: form.setor }));
    else localStorage.removeItem("ti-senai-dados");
  }, [preferenciaCarregada, lembrar, form.solicitante, form.email, form.setor]);

  const set = (k: keyof typeof campoVazio, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const novosErros: Erros = {};
    if (form.solicitante.trim().length < 2 || form.solicitante.trim().length > 120) novosErros.solicitante = "Informe seu nome (2 a 120 caracteres).";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) novosErros.email = "Informe um e-mail válido.";
    if (!form.setor || form.setor.trim().length < 2 || form.setor.length > 120) novosErros.setor = "Escolha o setor.";
    if (!form.categoria || form.categoria.length < 2 || form.categoria.length > 120) novosErros.categoria = "Escolha o tipo de problema.";
    if (form.descricao.trim().length < 10) novosErros.descricao = "Descreva o problema com pelo menos 10 caracteres.";
    if (form.descricao.trim().length > 3000) novosErros.descricao = "Limite de 3000 caracteres na descrição.";
    setErros(novosErros);
    if (Object.keys(novosErros).length) {
      toast.error("Confira os campos destacados.");
      return;
    }

    if (!window.confirm("Deseja realmente enviar este chamado? Confira os dados antes de confirmar.")) return;
    if (enviando) return;
    setEnviando(true);
    const ticketId = await addTicket({
      abertoEm: "",
      hora: "",
      solicitante: form.solicitante.trim(),
      setor: form.setor,
      local: "",
      categoria: form.categoria,
      descricao: form.descricao.trim(),
      prioridade: "Média",
      responsavel: null,
      status: "Aberto",
      contato: null,
      fechadoEm: null,
      horario: null,
      procedimento: null,
    }, form.email);
    setEnviando(false);
    if (ticketId === null) {
      toast.error("Não foi possível registrar o chamado. Tente novamente.");
      return;
    }
    toast.success("Chamado registrado! A equipe de TI já recebeu.");
    setSucessoId(ticketId);
  }

  if (sucessoId) {
    const shareMessage = `Chamado #${sucessoId}\nRequisitante: ${form.solicitante.trim()}\nDescrição e local: ${form.descricao.trim()}`;
    
    return (
      <div className="mx-auto max-w-2xl py-12 px-4 animate-in fade-in zoom-in duration-300">
        <div className="rounded-3xl border-2 border-g-green/20 bg-card p-8 text-center shadow-xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-g-green/10 text-g-green">
            <CheckCircle2 className="size-12" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Chamado #{sucessoId} enviado!</h1>
          <p className="text-muted-foreground mb-8">
            Tudo certo, <strong>{form.solicitante}</strong>. Sua solicitação foi registrada com sucesso.
             Acompanhe o andamento pelo site usando o e-mail informado.
          </p>
          
          <div className="grid gap-4">
            <div className="rounded-2xl bg-muted/50 p-4 text-left text-sm space-y-2 border border-border">
              <div className="flex justify-between">
                <span className="font-medium text-muted-foreground">Protocolo:</span>
                <span className="font-bold">#{sucessoId}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-muted-foreground">Setor:</span>
                <span>{form.setor}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-muted-foreground">Tipo:</span>
                <span>{form.categoria}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
               <Button asChild size="lg" variant="google-green" className="flex-1">
                 <a
                    href={`https://wa.me/5566996444461?text=${encodeURIComponent(shareMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="mr-2 size-5" /> Enviar agora
                </a>
              </Button>
              <Button variant="outline" size="lg" className="rounded-xl" onClick={() => navigate({ to: "/" })}>
                 <ArrowLeft className="mr-2 size-4" /> Enviar depois
              </Button>
            </div>
             <p className="text-xs text-muted-foreground">A mensagem fica pronta no WhatsApp; confirme o envio no aplicativo.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
       <div className="rounded-2xl border-l-4 border-g-green bg-card px-5 py-5 text-center shadow-sm"><div className="flex items-center justify-center gap-3"><span className="rounded-xl bg-g-green/15 p-3 text-g-green"><Cpu className="size-7" /></span><h1 className="text-3xl font-bold">Abrir chamado de TI</h1></div>
       <p className="mt-2 text-muted-foreground">Preencha os campos abaixo com as informações do problema. Informe o local e descreva a situação com clareza para agilizar o atendimento.</p></div>
      <Card className="mt-6 rounded-2xl border-t-4 border-g-blue shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2"><MapPin className="size-5 text-g-blue" /> Dados do chamado</CardTitle>
          <span className="text-xs text-muted-foreground"><span className="font-bold text-[var(--g-red)]">*</span> Campos obrigatórios</span>
        </CardHeader>
        <CardContent>
          <form onSubmit={enviar} className="grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Campo label="Seu nome" obrigatorio erro={erros.solicitante}>
                 <Input autoComplete="name" value={form.solicitante} onChange={(e) => set("solicitante", e.target.value)} placeholder="Ex.: Maria Heloisa" />
              </Campo>
              <Campo label="E-mail" obrigatorio erro={erros.email}>
                 <Input autoComplete="email" type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="seu@email.com" />
              </Campo>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Campo label="Setor" obrigatorio erro={erros.setor}>
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
              <Campo label="Tipo de problema" obrigatorio erro={erros.categoria}>
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
            </div>

             <Campo label="Descrição do problema e local" obrigatorio erro={erros.descricao}>
               <TextoAssistido rows={5} value={form.descricao} onChange={value => set("descricao", value)} placeholder="Ex.: Computador sem internet na sala 1" />
            </Campo>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={lembrar} onChange={e => setLembrar(e.target.checked)} /> Lembrar meus dados neste aparelho (nome, e-mail e setor)</label>
             <Button type="submit" variant="google-green" size="lg" disabled={enviando} className="w-full sm:w-auto">
              <Send className="size-4" /> {enviando ? "Enviando…" : "Enviar chamado"}
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
