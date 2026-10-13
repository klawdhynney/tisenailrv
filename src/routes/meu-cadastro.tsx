import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  User,
  Mail,
  Building2,
  Briefcase,
  Phone,
  MapPin,
  BadgeCheck,
  Shield,
  Save,
  ArrowLeft,
  Lock,
  Sparkles,
  ShieldCheck,
  Hash,
  Bell,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/store-context";
import { formatarTelefoneBR, validarTelefoneBR } from "@/lib/telefone";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/meu-cadastro")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;

    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/auth", search: { redirectTo: "/meu-cadastro" } });
    }
  },
  head: () => ({
    meta: [
      { title: "Meu Cadastro | TI SENAI LRV" },
      { name: "description", content: "Mantenha seus dados atualizados para agilizar o atendimento dos seus chamados." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PaginaMeuCadastro,
});

function PaginaMeuCadastro() {
  const {
    session,
    authPronto,
    regras,
    perfilUsuario,
    atualizarMeuCadastro,
    atualizarPreferenciasAlertaEmail,
    recarregarPerfilUsuario,
    userRole,
    userBlocked,
  } = useStore();
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [setor, setSetor] = useState("");
  const [cargo, setCargo] = useState("");
  const [telefone, setTelefone] = useState("");
  const [localPadrao, setLocalPadrao] = useState("");
  const [matricula, setMatricula] = useState("");
  const [alertaAberto, setAlertaAberto] = useState(true);
  const [alertaAtualizado, setAlertaAtualizado] = useState(true);
  const [alertaFinalizado, setAlertaFinalizado] = useState(true);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  // Carrega os dados do perfil assim que estiverem disponíveis
  useEffect(() => {
    if (perfilUsuario) {
      setNome(perfilUsuario.nome || "");
      setSetor(perfilUsuario.setor && perfilUsuario.setor !== "Pendente" ? perfilUsuario.setor : "");
      setCargo(perfilUsuario.cargo || "");
      setTelefone(formatarTelefoneBR(perfilUsuario.telefone || ""));
      setLocalPadrao(perfilUsuario.localPadrao || "");
      setMatricula(perfilUsuario.matricula || "");
      setAlertaAberto(perfilUsuario.alertaEmailAberto !== false);
      setAlertaAtualizado(perfilUsuario.alertaEmailAtualizado !== false);
      setAlertaFinalizado(perfilUsuario.alertaEmailFinalizado !== false);
    } else if (session?.user) {
      const email = session.user.email || "";
      const nomePadrao = session.user.user_metadata?.full_name || session.user.user_metadata?.name || email.split("@")[0] || "";
      setNome(nomePadrao);
    }
  }, [perfilUsuario, session?.user]);

  // Redireciona se não estiver logado
  useEffect(() => {
    if (authPronto && !session) {
      navigate({ to: "/auth", search: { redirectTo: "/meu-cadastro" } });
    }
  }, [authPronto, session, navigate]);

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatado = formatarTelefoneBR(e.target.value);
    setTelefone(formatado);
    if (erros.telefone) {
      setErros((prev) => ({ ...prev, telefone: "" }));
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    const novosErros: Record<string, string> = {};

    const nomeLimpo = nome.trim();
    if (!nomeLimpo || nomeLimpo.length < 2) {
      novosErros.nome = "Informe seu nome completo (mínimo de 2 caracteres).";
    }

    const setorLimpo = setor.trim();
    if (!setorLimpo || setorLimpo === "Pendente") {
      novosErros.setor = "Selecione o seu setor na lista.";
    }

    if (telefone && !validarTelefoneBR(telefone)) {
      novosErros.telefone = "Telefone inválido. Informe DDD + número (ex.: (66) 99999-9999).";
    }

    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) {
      toast.error("Por favor, preencha os campos obrigatórios corretamente.");
      return;
    }

    setSalvando(true);
    try {
      const res = await atualizarMeuCadastro({
        nome: nomeLimpo,
        setor: setorLimpo,
        cargo: cargo.trim() || undefined,
        telefone: telefone.trim() || undefined,
        localPadrao: localPadrao.trim() || undefined,
        matricula: matricula.trim() || undefined,
      });

      if (!res.success) {
        toast.error(res.message || "Erro ao salvar cadastro.");
      } else {
        await atualizarPreferenciasAlertaEmail({
          aberto: alertaAberto,
          atualizado: alertaAtualizado,
          finalizado: alertaFinalizado,
        });
        toast.success("Seu cadastro e preferências foram salvos com sucesso!");
        await recarregarPerfilUsuario();
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro inesperado ao salvar cadastro.");
    } finally {
      setSalvando(false);
    }
  };

  const emailUsuario = session?.user?.email || perfilUsuario?.email || "—";
  const papelRotulo =
    userRole === "admin"
      ? "Administrador"
      : userRole === "gestor" || userRole === "tecnico"
      ? "Técnico / Gestor"
      : "Solicitante";
  const statusRotulo = userBlocked || perfilUsuario?.status === "inativo" ? "Inativo" : "Ativo";

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <User className="size-6" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Meu Cadastro</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Mantenha seus dados atualizados para alimentar automaticamente o formulário de abertura de chamados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/abrir">
              <ArrowLeft className="size-4" /> Abrir Chamado
            </Link>
          </Button>
        </div>
      </div>

      {/* Cartão Informativo de Status e Papel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-3.5 flex items-center gap-3 shadow-2xs">
          <Mail className="size-5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Conta Institucional</p>
            <p className="text-xs sm:text-sm font-semibold truncate text-foreground" title={emailUsuario}>
              {emailUsuario}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 flex items-center gap-3 shadow-2xs">
          <Shield className="size-5 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Papel no Sistema</p>
            <div className="mt-0.5">
              <Badge
                variant={userRole === "admin" ? "default" : userRole === "gestor" || userRole === "tecnico" ? "secondary" : "outline"}
                className="text-xs font-semibold"
              >
                {papelRotulo}
              </Badge>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 flex items-center gap-3 shadow-2xs">
          <BadgeCheck className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Status do Acesso</p>
            <div className="mt-0.5">
              <Badge
                variant="outline"
                className={`text-xs font-semibold ${
                  statusRotulo === "Ativo"
                    ? "border-emerald-300 text-emerald-700 bg-emerald-50/60 dark:border-emerald-800 dark:text-emerald-300 dark:bg-emerald-950/40"
                    : "border-destructive text-destructive bg-destructive/10"
                }`}
              >
                {statusRotulo}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário Principal */}
      <Card className="rounded-2xl border border-border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="size-5 text-primary" /> Informações Pessoais e Setor
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Os campos com asterisco (<span className="text-[var(--g-red)] font-bold">*</span>) são obrigatórios e identificam o solicitante.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSalvar} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Nome Completo */}
              <div className="space-y-1.5">
                <Label htmlFor="nome" className="text-sm font-medium flex items-center gap-1">
                  Nome completo <span className="text-[var(--g-red)] font-bold">*</span>
                </Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => {
                    setNome(e.target.value);
                    if (erros.nome) setErros((prev) => ({ ...prev, nome: "" }));
                  }}
                  placeholder="Ex.: Maria de Fátima Silva"
                  className={erros.nome ? "border-destructive" : ""}
                />
                {erros.nome && <p className="text-xs text-destructive font-medium">{erros.nome}</p>}
              </div>

              {/* E-mail (Leitura) */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                  E-mail institucional <Lock className="size-3.5 text-muted-foreground" />
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    value={emailUsuario}
                    disabled
                    readOnly
                    className="bg-muted cursor-not-allowed text-muted-foreground font-mono text-xs pl-8"
                  />
                  <Mail className="size-3.5 text-muted-foreground absolute left-2.5 top-3" />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Vinculado à sua autenticação Google/Microsoft e bloqueado para edição.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Setor */}
              <div className="space-y-1.5">
                <Label htmlFor="setor" className="text-sm font-medium flex items-center gap-1">
                  Setor institucional <span className="text-[var(--g-red)] font-bold">*</span>
                </Label>
                <div className="relative">
                  <select
                    id="setor"
                    value={setor}
                    onChange={(e) => {
                      setSetor(e.target.value);
                      if (erros.setor) setErros((prev) => ({ ...prev, setor: "" }));
                    }}
                    className={`h-10 w-full rounded-xl border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${
                      erros.setor ? "border-destructive" : "border-input"
                    }`}
                  >
                    <option value="">Selecione o seu setor...</option>
                    {regras.setores.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                {erros.setor ? (
                  <p className="text-xs text-destructive font-medium">{erros.setor}</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Selecione obrigatoriamente um setor da lista cadastrada no sistema.
                  </p>
                )}
              </div>

              {/* Cargo ou Função */}
              <div className="space-y-1.5">
                <Label htmlFor="cargo" className="text-sm font-medium flex items-center gap-1">
                  Cargo ou função <span className="text-xs text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  id="cargo"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  placeholder="Ex.: Assistente Administrativo / Professor"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Telefone ou Ramal */}
              <div className="space-y-1.5">
                <Label htmlFor="telefone" className="text-sm font-medium flex items-center gap-1">
                  Telefone ou ramal <span className="text-xs text-muted-foreground">(opcional)</span>
                </Label>
                <div className="relative">
                  <Input
                    id="telefone"
                    value={telefone}
                    onChange={handleTelefoneChange}
                    placeholder="(66) 99999-9999"
                    maxLength={15}
                    className={erros.telefone ? "border-destructive pl-8" : "pl-8"}
                  />
                  <Phone className="size-3.5 text-muted-foreground absolute left-2.5 top-3" />
                </div>
                {erros.telefone && <p className="text-xs text-destructive font-medium">{erros.telefone}</p>}
              </div>

              {/* Local / Sala Padrão */}
              <div className="space-y-1.5">
                <Label htmlFor="localPadrao" className="text-sm font-medium flex items-center gap-1">
                  Sala ou local padrão <span className="text-xs text-muted-foreground">(opcional)</span>
                </Label>
                <div className="relative">
                  <Input
                    id="localPadrao"
                    value={localPadrao}
                    onChange={(e) => setLocalPadrao(e.target.value)}
                    placeholder="Ex.: Bloco B, Sala 04"
                    className="pl-8"
                  />
                  <MapPin className="size-3.5 text-muted-foreground absolute left-2.5 top-3" />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Você poderá ajustar a sala específica em cada chamado.
                </p>
              </div>

              {/* Matrícula */}
              <div className="space-y-1.5">
                <Label htmlFor="matricula" className="text-sm font-medium flex items-center gap-1">
                  Matrícula funcional <span className="text-xs text-muted-foreground">(opcional)</span>
                </Label>
                <div className="relative">
                  <Input
                    id="matricula"
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value)}
                    placeholder="Ex.: 104582"
                    className="pl-8 font-mono text-sm"
                  />
                  <Hash className="size-3.5 text-muted-foreground absolute left-2.5 top-3" />
                </div>
              </div>
            </div>

            {/* Preferências de Notificações por E-mail */}
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-4">
              <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                <Bell className="size-4 text-primary" />
                <span>Preferências de Notificações por E-mail</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Escolha quais avisos automáticos de acompanhamento você deseja receber no seu e-mail corporativo.
              </p>

              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-background/50 hover:bg-background transition-colors">
                  <div className="space-y-0.5 pr-2">
                    <Label htmlFor="pref-aberto" className="text-xs font-semibold cursor-pointer">
                      Avisar quando meu chamado for aberto
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Receba confirmação imediata com o número, SLA e resumo do chamado registrado.
                    </p>
                  </div>
                  <Switch
                    id="pref-aberto"
                    checked={alertaAberto}
                    onCheckedChange={setAlertaAberto}
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-background/50 hover:bg-background transition-colors">
                  <div className="space-y-0.5 pr-2">
                    <Label htmlFor="pref-atualizado" className="text-xs font-semibold cursor-pointer">
                      Avisar quando meu chamado for atualizado
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Receba atualizações de status ou novas respostas da equipe de suporte.
                    </p>
                  </div>
                  <Switch
                    id="pref-atualizado"
                    checked={alertaAtualizado}
                    onCheckedChange={setAlertaAtualizado}
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-background/50 hover:bg-background transition-colors">
                  <div className="space-y-0.5 pr-2">
                    <Label htmlFor="pref-finalizado" className="text-xs font-semibold cursor-pointer">
                      Avisar quando meu chamado for finalizado
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Receba o procedimento técnico aplicado e o link para avaliar o atendimento.
                    </p>
                  </div>
                  <Switch
                    id="pref-finalizado"
                    checked={alertaFinalizado}
                    onCheckedChange={setAlertaFinalizado}
                  />
                </div>
              </div>
            </div>

            {/* Aviso LGPD */}
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 flex items-start gap-3 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Privacidade e Proteção de Dados (LGPD)</p>
                <p>
                  Os dados informados são armazenados com segurança e utilizados exclusivamente para identificar o
                  solicitante e agilizar a triagem técnica dos seus chamados de TI. Saiba mais na nossa{" "}
                  <Link to="/lgpd" className="text-primary font-semibold underline underline-offset-2 hover:text-primary/80">
                    Política de Privacidade e LGPD
                  </Link>
                  .
                </p>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-border/60">
              <Button asChild variant="ghost" size="default">
                <Link to="/">Cancelar</Link>
              </Button>
              <Button
                type="submit"
                variant="default"
                size="default"
                disabled={salvando}
                className="font-bold gap-2 min-w-[140px]"
              >
                <Save className="size-4" />
                {salvando ? "Salvando..." : "Salvar Cadastro"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
