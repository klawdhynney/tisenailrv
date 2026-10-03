import { useEffect, useState, useMemo } from "react";
import {
  Users,
  Search,
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  History,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Mail,
  Calendar,
  X,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConfirmAction } from "@/components/ConfirmAction";
import { UserAvatar } from "@/components/UserAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store-context";
import type { PapelUsuario, UsuarioAdmin } from "@/lib/types";

interface AuditLog {
  id: number;
  admin_email: string;
  alvo_email: string;
  acao: string;
  detalhes: string | null;
  created_at: string;
}

interface PreRegistered {
  id: number;
  email: string;
  role: PapelUsuario;
  created_at: string;
}

export function GestaoUsuarios() {
  const { session, isAdmin } = useStore();
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [preRegistros, setPreRegistros] = useState<PreRegistered[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Filtros
  const [busca, setBusca] = useState("");
  const [filtroRole, setFiltroRole] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");

  // Modais
  const [usuarioEditar, setUsuarioEditar] = useState<UsuarioAdmin | null>(null);
  const [novoPapel, setNovoPapel] = useState<PapelUsuario>("usuario");
  const [salvandoPapel, setSalvandoPapel] = useState(false);

  const [modalPreCadastro, setModalPreCadastro] = useState(false);
  const [emailPreCadastro, setEmailPreCadastro] = useState("");
  const [papelPreCadastro, setPapelPreCadastro] = useState<PapelUsuario>("gestor");
  const [salvandoPre, setSalvandoPre] = useState(false);

  const [mostrarLogs, setMostrarLogs] = useState(false);

  const carregarDados = async () => {
    setCarregando(true);
    try {
      // 1. Carregar lista de usuários via RPC segura
      const { data: usersData, error: usersErr } = await supabase.rpc("admin_get_users");
      if (usersErr) {
        console.warn("RPC admin_get_users:", usersErr.message);
        // Fallback: carregar perfis caso a RPC ainda esteja sincronizando
        const { data: fallbackProfiles } = await supabase.from("user_profiles").select("*");
        if (fallbackProfiles) {
          setUsuarios(
            fallbackProfiles.map((p) => ({
              id: p.id,
              email: p.email,
              nome: p.nome,
              fotoUrl: p.foto_url,
              role: (p.role as PapelUsuario) || "usuario",
              bloqueado: p.bloqueado ?? false,
              ultimoAcesso: p.ultimo_acesso,
              createdAt: p.created_at,
            })),
          );
        }
      } else if (usersData) {
        setUsuarios(
          (usersData as any[]).map((u) => ({
            id: u.id,
            email: u.email,
            nome: u.nome,
            fotoUrl: u.foto_url,
            role: (u.role as PapelUsuario) || "usuario",
            bloqueado: u.bloqueado ?? false,
            ultimoAcesso: u.ultimo_acesso,
            createdAt: u.created_at,
          })),
        );
      }

      // 2. Carregar logs de auditoria
      const { data: logsData } = await supabase
        .from("audit_logs_usuarios")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40);
      if (logsData) {
        setLogs(logsData as unknown as AuditLog[]);
      }

      // 3. Carregar pré-cadastros
      const { data: preData } = await supabase
        .from("pre_registered_roles")
        .select("*")
        .order("created_at", { ascending: false });
      if (preData) {
        setPreRegistros(preData as unknown as PreRegistered[]);
      }
    } catch (e) {
      console.error("Erro ao carregar gestão de usuários:", e);
      toast.error("Não foi possível carregar alguns dados de usuários.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Filtragem
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      const termo = busca.toLowerCase().trim();
      const matchBusca =
        !termo ||
        (u.nome && u.nome.toLowerCase().includes(termo)) ||
        (u.email && u.email.toLowerCase().includes(termo));

      const matchRole = filtroRole === "todos" || u.role === filtroRole;
      const matchStatus =
        filtroStatus === "todos" ||
        (filtroStatus === "ativo" && !u.bloqueado) ||
        (filtroStatus === "bloqueado" && u.bloqueado);

      return matchBusca && matchRole && matchStatus;
    });
  }, [usuarios, busca, filtroRole, filtroStatus]);

  // Alterar papel
  const handleAlterarPapel = async () => {
    if (!usuarioEditar) return;
    setSalvandoPapel(true);
    try {
      const { error } = await supabase.rpc("admin_set_user_role", {
        target_user_id: usuarioEditar.id,
        new_role: novoPapel,
      });

      if (error) {
        toast.error(error.message || "Erro ao alterar papel.");
      } else {
        toast.success(`Perfil de ${usuarioEditar.nome || usuarioEditar.email} atualizado para ${novoPapel}!`);
        setUsuarioEditar(null);
        await carregarDados();
      }
    } catch (err: any) {
      toast.error(err.message || "Erro inesperado.");
    } finally {
      setSalvandoPapel(false);
    }
  };

  // Bloquear ou desbloquear
  const handleAlternarBloqueio = async (u: UsuarioAdmin) => {
    const novoStatus = !u.bloqueado;
    try {
      const { error } = await supabase.rpc("admin_set_user_blocked", {
        target_user_id: u.id,
        should_block: novoStatus,
      });

      if (error) {
        toast.error(error.message || "Erro ao atualizar status do usuário.");
      } else {
        toast.success(
          novoStatus
            ? `Usuário ${u.nome || u.email} bloqueado com sucesso.`
            : `Usuário ${u.nome || u.email} reativado com sucesso.`,
        );
        await carregarDados();
      }
    } catch (err: any) {
      toast.error(err.message || "Erro inesperado.");
    }
  };

  // Pré-cadastrar e-mail
  const handleSalvarPreCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    const limpo = emailPreCadastro.trim().toLowerCase();
    if (!limpo || !limpo.includes("@")) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    setSalvandoPre(true);
    try {
      const { error } = await supabase.rpc("admin_preregister_role", {
        p_email: limpo,
        p_role: papelPreCadastro,
      });

      if (error) {
        toast.error(error.message || "Erro ao pré-cadastrar permissão.");
      } else {
        toast.success(`Permissão pré-cadastrada para ${limpo}!`);
        setEmailPreCadastro("");
        setModalPreCadastro(false);
        await carregarDados();
      }
    } catch (err: any) {
      toast.error(err.message || "Erro inesperado.");
    } finally {
      setSalvandoPre(false);
    }
  };

  // Remover pré-cadastro
  const handleRemoverPreCadastro = async (email: string) => {
    try {
      const { error } = await supabase.from("pre_registered_roles").delete().eq("email", email);
      if (error) {
        toast.error("Erro ao remover pré-cadastro.");
      } else {
        toast.success("Pré-cadastro removido.");
        await carregarDados();
      }
    } catch {
      toast.error("Erro ao remover pré-cadastro.");
    }
  };

  const getRoleBadge = (role: PapelUsuario) => {
    switch (role) {
      case "admin":
        return (
          <Badge className="bg-purple-600 text-white font-bold text-[11px] gap-1 hover:bg-purple-700">
            <ShieldCheck className="size-3" /> Administrador
          </Badge>
        );
      case "gestor":
        return (
          <Badge className="bg-g-blue text-white font-bold text-[11px] gap-1 hover:bg-blue-600">
            <UserCheck className="size-3" /> Gestor
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground font-semibold text-[11px]">
            Usuário
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Topo com ações */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="size-6 text-primary" /> Gestão de Usuários e Permissões
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Administre os perfis de acesso, bloqueios e pré-cadastros institucionais com auditoria automática.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMostrarLogs((v) => !v)}
            className="text-xs font-medium gap-1.5"
          >
            <History className="size-3.5 text-muted-foreground" />
            {mostrarLogs ? "Ocultar Auditoria" : "Ver Histórico"}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setModalPreCadastro(true)}
            className="text-xs font-bold gap-1.5"
          >
            <UserPlus className="size-3.5" /> Pré-cadastrar E-mail
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={carregarDados}
            title="Atualizar lista"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`size-3.5 ${carregando ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Histórico de Auditoria Retrátil */}
      {mostrarLogs && (
        <Card className="border border-purple-500/30 bg-purple-500/5 rounded-2xl animate-in slide-in-from-top-2 duration-200">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <History className="size-4 text-purple-600" /> Registro de Auditoria Administrativa
              </CardTitle>
              <CardDescription className="text-xs">
                Últimas alterações de perfil, bloqueios e permissões realizadas no sistema.
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setMostrarLogs(false)} className="h-7 w-7">
              <X className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {logs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">Nenhum evento registrado ainda.</p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-border/60 bg-background/80 p-2.5 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-foreground truncate">{log.admin_email}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium text-g-blue truncate">{log.acao}</span>
                    <span className="text-muted-foreground truncate">({log.alvo_email})</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-muted-foreground text-[11px]">
                    {log.detalhes && <span className="italic">{log.detalhes}</span>}
                    <span>•</span>
                    <span>{new Date(log.created_at).toLocaleString("pt-BR")}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Pré-cadastros pendentes */}
      {preRegistros.length > 0 && (
        <Card className="border border-amber-500/30 bg-amber-500/5 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Mail className="size-4 text-amber-500" /> E-mails Pré-cadastrados Aguardando Primeiro Login
            </CardTitle>
            <CardDescription className="text-xs">
              Quando esses e-mails acessarem com Google ou Microsoft, o perfil será concedido automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="flex flex-wrap gap-2">
              {preRegistros.map((pr) => (
                <div
                  key={pr.id}
                  className="flex items-center gap-2 rounded-xl border border-border/80 bg-background px-3 py-1.5 text-xs shadow-2xs"
                >
                  <span className="font-mono font-medium">{pr.email}</span>
                  {getRoleBadge(pr.role)}
                  <button
                    type="button"
                    onClick={() => handleRemoverPreCadastro(pr.email)}
                    className="text-muted-foreground hover:text-destructive ml-1"
                    title="Remover pré-cadastro"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Barra de Filtro e Busca */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="size-4 text-muted-foreground absolute left-3 top-3" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou e-mail institucional..."
            className="pl-9 rounded-xl text-xs sm:text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filtroRole}
            onChange={(e) => setFiltroRole(e.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3 text-xs sm:text-sm font-medium"
          >
            <option value="todos">Todos os perfis</option>
            <option value="admin">Administrador</option>
            <option value="gestor">Gestor</option>
            <option value="usuario">Usuário</option>
          </select>

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3 text-xs sm:text-sm font-medium"
          >
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="bloqueado">Bloqueado</option>
          </select>
        </div>
      </div>

      {/* Lista de Usuários */}
      <div className="space-y-3">
        {carregando ? (
          <div className="py-12 text-center text-xs sm:text-sm text-muted-foreground">
            <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-primary" />
            Carregando usuários...
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <Card className="rounded-2xl border-dashed p-8 text-center">
            <Users className="size-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">Nenhum usuário encontrado</p>
            <p className="text-xs text-muted-foreground mt-1">Ajuste os filtros ou o termo de busca.</p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {usuariosFiltrados.map((u) => {
              const eProprioUsuario = u.id === session?.user?.id;
              return (
                <div
                  key={u.id}
                  className={`rounded-2xl border bg-card p-3 sm:p-4 shadow-2xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    u.bloqueado ? "border-destructive/40 bg-destructive/5" : "border-border/80 hover:border-primary/40"
                  }`}
                >
                  {/* Foto, Nome e E-mail */}
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar
                      fotoUrl={u.fotoUrl}
                      nome={u.nome}
                      email={u.email}
                      sizeClassName="size-11"
                    />
                    <div className="min-w-0 leading-tight">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground truncate" title={u.nome || u.email}>
                          {u.nome || u.email.split("@")[0]}
                        </span>
                        {eProprioUsuario && (
                          <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.2 rounded-md">
                            Você
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-muted-foreground truncate block" title={u.email}>
                        {u.email}
                      </span>
                      <div className="flex items-center gap-2 mt-1 sm:hidden">
                        {getRoleBadge(u.role)}
                        {u.bloqueado ? (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            Bloqueado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-300 dark:border-emerald-800">
                            Ativo
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Informações centrais no Desktop */}
                  <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-semibold uppercase text-muted-foreground/70">Perfil</span>
                      {getRoleBadge(u.role)}
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-semibold uppercase text-muted-foreground/70">Status</span>
                      {u.bloqueado ? (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          Bloqueado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-300 dark:border-emerald-800">
                          Ativo
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] font-semibold uppercase text-muted-foreground/70">Último acesso</span>
                      <span className="text-[11px]">
                        {u.ultimoAcesso ? new Date(u.ultimoAcesso).toLocaleDateString("pt-BR") : "Nunca acessou"}
                      </span>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center justify-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUsuarioEditar(u);
                        setNovoPapel(u.role);
                      }}
                      className="text-xs font-medium h-8"
                    >
                      Alterar Perfil
                    </Button>

                    <ConfirmAction
                      title={u.bloqueado ? `Reativar o usuário ${u.nome || u.email}?` : `Bloquear o usuário ${u.nome || u.email}?`}
                      description={
                        u.bloqueado
                          ? "O usuário voltará a ter permissão para acessar o sistema normalmente."
                          : "O usuário terá o acesso suspenso imediatamente. Nenhum dado será excluído."
                      }
                      confirmLabel={u.bloqueado ? "Sim, reativar" : "Sim, bloquear"}
                      variant={u.bloqueado ? "default" : "destructive"}
                      onConfirm={() => handleAlternarBloqueio(u)}
                    >
                      <Button
                        variant={u.bloqueado ? "outline" : "ghost"}
                        size="sm"
                        className={`text-xs h-8 ${u.bloqueado ? "text-emerald-600 border-emerald-300" : "text-destructive hover:bg-destructive/10"}`}
                      >
                        {u.bloqueado ? (
                          <>
                            <Unlock className="size-3.5 mr-1" /> Reativar
                          </>
                        ) : (
                          <>
                            <Lock className="size-3.5 mr-1" /> Bloquear
                          </>
                        )}
                      </Button>
                    </ConfirmAction>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Alterar Perfil */}
      {usuarioEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <ShieldCheck className="size-5 text-primary" /> Alterar Perfil de Acesso
              </h3>
              <button
                type="button"
                onClick={() => setUsuarioEditar(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
                <UserAvatar fotoUrl={usuarioEditar.fotoUrl} nome={usuarioEditar.nome} email={usuarioEditar.email} />
                <div className="overflow-hidden leading-tight">
                  <p className="font-bold text-sm text-foreground truncate">{usuarioEditar.nome || usuarioEditar.email}</p>
                  <p className="text-xs font-mono text-muted-foreground truncate">{usuarioEditar.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Novo Perfil</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["usuario", "gestor", "admin"] as PapelUsuario[]).map((p) => {
                    const sel = novoPapel === p;
                    const rotulo = p === "admin" ? "Administrador" : p === "gestor" ? "Gestor" : "Usuário";
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNovoPapel(p)}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                          sel
                            ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/40 shadow-xs"
                            : "border-border/70 hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        {rotulo}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground pt-1">
                  • <strong>Usuário:</strong> Apenas abre e acompanha seus próprios chamados.<br />
                  • <strong>Gestor:</strong> Visualiza e atende todos os chamados, dashboard e avaliações.<br />
                  • <strong>Administrador:</strong> Acesso total, incluindo painel de ajustes e gestão de usuários.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <Button variant="outline" size="sm" onClick={() => setUsuarioEditar(null)}>
                Cancelar
              </Button>
              <Button
                variant="default"
                size="sm"
                disabled={salvandoPapel || novoPapel === usuarioEditar.role}
                onClick={handleAlterarPapel}
                className="font-bold text-xs"
              >
                {salvandoPapel ? "Salvando..." : "Confirmar alteração"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pré-cadastrar E-mail */}
      {modalPreCadastro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <UserPlus className="size-5 text-primary" /> Pré-cadastrar Perfil por E-mail
              </h3>
              <button
                type="button"
                onClick={() => setModalPreCadastro(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarPreCadastro} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">E-mail Institucional</Label>
                <Input
                  type="email"
                  value={emailPreCadastro}
                  onChange={(e) => setEmailPreCadastro(e.target.value)}
                  placeholder="exemplo@senaimt.ind.br"
                  required
                  className="rounded-xl text-xs sm:text-sm font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  O perfil será atribuído assim que o titular fizer login com Google ou Microsoft.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Perfil Atribuído</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["usuario", "gestor", "admin"] as PapelUsuario[]).map((p) => {
                    const sel = papelPreCadastro === p;
                    const rotulo = p === "admin" ? "Administrador" : p === "gestor" ? "Gestor" : "Usuário";
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPapelPreCadastro(p)}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                          sel
                            ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/40 shadow-xs"
                            : "border-border/70 hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        {rotulo}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalPreCadastro(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="default" size="sm" disabled={salvandoPre} className="font-bold text-xs">
                  {salvandoPre ? "Cadastrando..." : "Salvar pré-cadastro"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
