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
  Download,
  FileSpreadsheet,
  FileText,
  Eye,
  Edit,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Phone,
  MapPin,
  Briefcase,
  Hash,
  Sparkles,
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
import { exportarCsv, exportarXlsx, exportarUsuariosPdf } from "@/lib/exportar";
import { formatarTelefoneBR, validarTelefoneBR } from "@/lib/telefone";
import type { PapelUsuario, UsuarioAdmin } from "@/lib/types";

const ADMINS_INICIAIS_AUTORIZADOS = [
  "klaw.com@gmail.com",
  "klawdhynney@gmail.com",
  "claudineigoncalvesdelima@hotmail.com",
  "claudinei.lima@senaimt.ind.br",
];

interface AuditLog {
  id: number;
  admin_email: string;
  alvo_email: string;
  acao: string;
  detalhes: any;
  created_at: string;
}

interface PreRegistered {
  id: number;
  email: string;
  role: PapelUsuario;
  created_at: string;
}

type SortField = "nome" | "email" | "setor" | "role" | "status" | "ultimoAcesso" | "createdAt" | "totalChamados";

function formatarDetalhesAuditoria(det: any): string {
  if (!det) return "";
  if (typeof det === "string") return det;
  if (typeof det === "object") {
    if (det.total_exportados !== undefined) {
      return `${det.total_exportados} usuário(s) exportado(s) em ${det.formato?.toUpperCase() || "planilha"}`;
    }
    if (det.novo_perfil) return `Novo perfil: ${det.novo_perfil}`;
    if (det.perfil) return `Perfil: ${det.perfil} (${det.status || "pendente"})`;
    if (det.bloqueado !== undefined) return det.bloqueado ? "Desativado" : "Reativado";
    if (det.motivo) return String(det.motivo);
    try {
      return JSON.stringify(det);
    } catch {
      return "";
    }
  }
  return String(det);
}

export function GestaoUsuarios() {
  const { session, isAdmin, regras } = useStore();
  const adminDb = supabase as any;

  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [preRegistros, setPreRegistros] = useState<PreRegistered[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);

  // Filtros
  const [busca, setBusca] = useState("");
  const [filtroSetor, setFiltroSetor] = useState<string>("todos");
  const [filtroRole, setFiltroRole] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroProvedor, setFiltroProvedor] = useState<string>("todos");
  const [exportando, setExportando] = useState(false);

  // Ordenação e Paginação
  const [campoOrdenacao, setCampoOrdenacao] = useState<SortField>("createdAt");
  const [direcaoOrdenacao, setDirecaoOrdenacao] = useState<"asc" | "desc">("desc");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 10;

  // Modais de Ação
  const [usuarioDetalhes, setUsuarioDetalhes] = useState<UsuarioAdmin | null>(null);

  // Modal Alterar Papel
  const [usuarioEditarPapel, setUsuarioEditarPapel] = useState<UsuarioAdmin | null>(null);
  const [novoPapel, setNovoPapel] = useState<PapelUsuario>("usuario");
  const [salvandoPapel, setSalvandoPapel] = useState(false);

  // Modal Editar Cadastro
  const [usuarioEditarCadastro, setUsuarioEditarCadastro] = useState<UsuarioAdmin | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editSetor, setEditSetor] = useState("");
  const [editCargo, setEditCargo] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [editLocalPadrao, setEditLocalPadrao] = useState("");
  const [editMatricula, setEditMatricula] = useState("");
  const [editStatus, setEditStatus] = useState<"ativo" | "inativo">("ativo");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  // Modal Pré-cadastro
  const [modalPreCadastro, setModalPreCadastro] = useState(false);
  const [emailPreCadastro, setEmailPreCadastro] = useState("");
  const [papelPreCadastro, setPapelPreCadastro] = useState<PapelUsuario>("gestor");
  const [salvandoPre, setSalvandoPre] = useState(false);

  const [mostrarLogs, setMostrarLogs] = useState(false);

  const carregarDados = async () => {
    setCarregando(true);
    setErroCarregamento(null);
    try {
      let listaUsuarios: UsuarioAdmin[] = [];

      // Carregar contagem de chamados por e-mail e por solicitante_id
      const { data: ticketsEmail } = await supabase.from("tickets").select("solicitante_email, solicitante_id" as any);
      const contagemChamados = new Map<string, number>();
      if (ticketsEmail && Array.isArray(ticketsEmail)) {
        for (const t of ticketsEmail) {
          if (t.solicitante_email) {
            const em = t.solicitante_email.toLowerCase().trim();
            contagemChamados.set(em, (contagemChamados.get(em) ?? 0) + 1);
          }
          if ((t as any).solicitante_id) {
            const sid = String((t as any).solicitante_id);
            contagemChamados.set(sid, (contagemChamados.get(sid) ?? 0) + 1);
          }
        }
      }

      // 1. Carregar lista de usuários via RPC segura admin_get_users
      const { data: usersData, error: usersErr } = await adminDb.rpc("admin_get_users");
      if (usersErr) {
        console.warn("RPC admin_get_users:", usersErr.message);
        // Fallback: carregar perfis diretamente da tabela user_profiles
        const { data: fallbackProfiles, error: errFallback } = await adminDb.from("user_profiles").select("*");
        if (errFallback) {
          throw new Error(errFallback.message);
        }
        if (fallbackProfiles && fallbackProfiles.length > 0) {
          listaUsuarios = fallbackProfiles.map((p: any) => {
            const emailLimpo = (p.email || "").toLowerCase().trim();
            const totalTickets = contagemChamados.get(emailLimpo) ?? contagemChamados.get(p.id) ?? 0;
            const statusFinal = (p.status || (p.bloqueado ? "inativo" : "ativo")) as "ativo" | "inativo";
            return {
              id: p.id,
              email: p.email,
              nome: p.nome,
              fotoUrl: p.foto_url,
              setor: p.setor || "Pendente",
              cargo: p.cargo || null,
              telefone: p.telefone || null,
              localPadrao: p.local_padrao || null,
              matricula: p.matricula || null,
              role: (p.role as PapelUsuario) || (ADMINS_INICIAIS_AUTORIZADOS.includes(emailLimpo) ? "admin" : "usuario"),
              bloqueado: Boolean(p.bloqueado || statusFinal === "inativo"),
              status: statusFinal,
              statusConta: (p.bloqueado ? "bloqueado" : p.ultimo_acesso ? "ativo" : "pendente") as any,
              ultimoAcesso: p.ultimo_acesso,
              createdAt: p.created_at,
              updatedAt: p.updated_at,
              provedor: emailLimpo.endsWith("@gmail.com")
                ? "google"
                : emailLimpo.endsWith("@senaimt.ind.br") || emailLimpo.endsWith("@hotmail.com") || emailLimpo.endsWith("@outlook.com")
                ? "microsoft"
                : "email",
              totalChamados: totalTickets,
            };
          });
        }
      } else if (usersData && Array.isArray(usersData)) {
        listaUsuarios = (usersData as any[]).map((u) => {
          const emailLimpo = (u.email || "").toLowerCase().trim();
          const totalTickets = contagemChamados.get(emailLimpo) ?? contagemChamados.get(u.id) ?? 0;
          const totalFinal = u.total_chamados !== undefined && u.total_chamados !== null ? Math.max(Number(u.total_chamados), totalTickets) : totalTickets;
          const statusFinal = (u.status || (u.bloqueado ? "inativo" : "ativo")) as "ativo" | "inativo";
          return {
            id: u.id,
            email: u.email,
            nome: u.nome,
            fotoUrl: u.foto_url,
            setor: u.setor || "Pendente",
            cargo: u.cargo || null,
            telefone: u.telefone || null,
            localPadrao: u.local_padrao || null,
            matricula: u.matricula || null,
            role: (u.role as PapelUsuario) || "usuario",
            bloqueado: Boolean(u.bloqueado || statusFinal === "inativo"),
            status: statusFinal,
            statusConta: (u.bloqueado ? "bloqueado" : u.ultimo_acesso ? "ativo" : "pendente") as any,
            ultimoAcesso: u.ultimo_acesso,
            createdAt: u.created_at,
            updatedAt: u.updated_at,
            provedor: u.provedor || (emailLimpo.endsWith("@gmail.com") ? "google" : emailLimpo.endsWith("@senaimt.ind.br") || emailLimpo.endsWith("@hotmail.com") || emailLimpo.endsWith("@outlook.com") ? "microsoft" : "email"),
            totalChamados: totalFinal,
          };
        });
      }

      // Garante que todos os 4 administradores autorizados apareçam na lista
      for (const emailAdmin of ADMINS_INICIAIS_AUTORIZADOS) {
        const existe = listaUsuarios.some(
          (u) => u.email.toLowerCase().trim() === emailAdmin.toLowerCase().trim(),
        );
        if (!existe) {
          const emailLimpo = emailAdmin.toLowerCase().trim();
          listaUsuarios.push({
            id: `pending-${emailAdmin}`,
            email: emailAdmin,
            nome: "Aguardando 1º acesso",
            fotoUrl: null,
            setor: "TI",
            cargo: "Administrador do Sistema",
            telefone: null,
            localPadrao: null,
            matricula: null,
            role: "admin",
            bloqueado: false,
            status: "ativo",
            statusConta: "pendente",
            ultimoAcesso: null,
            createdAt: new Date().toISOString(),
            provedor: emailLimpo.endsWith("@gmail.com") ? "google" : "microsoft",
            totalChamados: contagemChamados.get(emailLimpo) ?? 0,
          });
        }
      }

      setUsuarios(listaUsuarios);

      // 2. Carregar logs de auditoria
      const { data: logsData } = await adminDb
        .from("audit_logs_usuarios")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40);
      if (logsData && logsData.length > 0) {
        setLogs(logsData as unknown as AuditLog[]);
      } else {
        setLogs(
          ADMINS_INICIAIS_AUTORIZADOS.map((email, idx) => ({
            id: -(idx + 1),
            admin_email: "sistema@senaimt.ind.br",
            alvo_email: email,
            acao: "cadastro inicial de administradores",
            detalhes: { perfil: "admin", status: "ativo" },
            created_at: new Date().toISOString(),
          })),
        );
      }

      // 3. Carregar pré-cadastros
      const { data: preData } = await adminDb
        .from("pre_registered_roles")
        .select("*")
        .order("created_at", { ascending: false });
      if (preData && preData.length > 0) {
        setPreRegistros(preData as unknown as PreRegistered[]);
      } else {
        setPreRegistros(
          ADMINS_INICIAIS_AUTORIZADOS.map((email, idx) => ({
            id: -(idx + 1),
            email,
            role: "admin" as PapelUsuario,
            created_at: new Date().toISOString(),
          })),
        );
      }
    } catch (e: any) {
      console.error("Erro ao carregar gestão de usuários:", e);
      setErroCarregamento(e?.message || "Não foi possível carregar a lista de usuários.");
      toast.error("Falha ao carregar lista de usuários.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Setores disponíveis
  const listaSetoresDisponiveis = useMemo(() => {
    const setoresBase = regras?.setores ?? [];
    const setoresDosUsuarios = usuarios.map((u) => u.setor).filter(Boolean) as string[];
    return Array.from(new Set([...setoresBase, ...setoresDosUsuarios])).sort();
  }, [regras?.setores, usuarios]);

  // Filtragem
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      const termo = busca.toLowerCase().trim();
      const matchBusca =
        !termo ||
        (u.nome && u.nome.toLowerCase().includes(termo)) ||
        (u.email && u.email.toLowerCase().includes(termo)) ||
        (u.matricula && u.matricula.toLowerCase().includes(termo));

      const matchSetor = filtroSetor === "todos" || u.setor === filtroSetor;

      const matchRole =
        filtroRole === "todos" ||
        (filtroRole === "admin" && u.role === "admin") ||
        (filtroRole === "gestor" && (u.role === "gestor" || (u.role as string) === "tecnico")) ||
        (filtroRole === "usuario" && u.role === "usuario");

      const matchStatus =
        filtroStatus === "todos" ||
        (filtroStatus === "ativo" && !u.bloqueado && u.status === "ativo") ||
        (filtroStatus === "inativo" && (u.bloqueado || u.status === "inativo")) ||
        (filtroStatus === "pendente" && (!u.ultimoAcesso || u.statusConta === "pendente"));

      const provLower = (u.provedor || "").toLowerCase();
      const emailLower = (u.email || "").toLowerCase();
      const matchProvedor =
        filtroProvedor === "todos" ||
        (filtroProvedor === "google" && (provLower === "google" || (!provLower && emailLower.endsWith("@gmail.com")))) ||
        (filtroProvedor === "microsoft" &&
          (provLower === "azure" ||
            provLower === "microsoft" ||
            (!provLower &&
              (emailLower.endsWith("@senaimt.ind.br") ||
                emailLower.endsWith("@hotmail.com") ||
                emailLower.endsWith("@outlook.com"))))) ||
        (filtroProvedor === "email" &&
          (provLower === "email" ||
            (!provLower &&
              !emailLower.endsWith("@gmail.com") &&
              !emailLower.endsWith("@senaimt.ind.br") &&
              !emailLower.endsWith("@hotmail.com") &&
              !emailLower.endsWith("@outlook.com"))));

      return matchBusca && matchSetor && matchRole && matchStatus && matchProvedor;
    });
  }, [usuarios, busca, filtroSetor, filtroRole, filtroStatus, filtroProvedor]);

  // Ordenação
  const usuariosOrdenados = useMemo(() => {
    const list = [...usuariosFiltrados];
    list.sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      switch (campoOrdenacao) {
        case "nome":
          valA = (a.nome || a.email).toLowerCase();
          valB = (b.nome || b.email).toLowerCase();
          break;
        case "email":
          valA = a.email.toLowerCase();
          valB = b.email.toLowerCase();
          break;
        case "setor":
          valA = (a.setor || "").toLowerCase();
          valB = (b.setor || "").toLowerCase();
          break;
        case "role":
          valA = a.role;
          valB = b.role;
          break;
        case "status":
          valA = a.bloqueado ? "inativo" : a.status || "ativo";
          valB = b.bloqueado ? "inativo" : b.status || "ativo";
          break;
        case "totalChamados":
          valA = a.totalChamados ?? 0;
          valB = b.totalChamados ?? 0;
          break;
        case "ultimoAcesso":
          valA = a.ultimoAcesso ? new Date(a.ultimoAcesso).getTime() : 0;
          valB = b.ultimoAcesso ? new Date(b.ultimoAcesso).getTime() : 0;
          break;
        case "createdAt":
        default:
          valA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          valB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
      }

      if (valA < valB) return direcaoOrdenacao === "asc" ? -1 : 1;
      if (valA > valB) return direcaoOrdenacao === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [usuariosFiltrados, campoOrdenacao, direcaoOrdenacao]);

  // Paginação
  const totalPaginas = Math.max(1, Math.ceil(usuariosOrdenados.length / itensPorPagina));
  const usuariosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return usuariosOrdenados.slice(inicio, inicio + itensPorPagina);
  }, [usuariosOrdenados, paginaAtual, itensPorPagina]);

  const alternarOrdenacao = (campo: SortField) => {
    if (campoOrdenacao === campo) {
      setDirecaoOrdenacao((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setCampoOrdenacao(campo);
      setDirecaoOrdenacao("asc");
    }
    setPaginaAtual(1);
  };

  const getProvedorBadge = (provedor?: string | null, email?: string) => {
    const provLower = (provedor || "").toLowerCase();
    const emailLower = (email || "").toLowerCase();
    if (provLower === "google" || (!provLower && emailLower.endsWith("@gmail.com"))) {
      return (
        <Badge variant="outline" className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/40">
          Google
        </Badge>
      );
    }
    if (
      provLower === "azure" ||
      provLower === "microsoft" ||
      (!provLower &&
        (emailLower.endsWith("@senaimt.ind.br") ||
          emailLower.endsWith("@hotmail.com") ||
          emailLower.endsWith("@outlook.com")))
    ) {
      return (
        <Badge variant="outline" className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 border-teal-300 dark:border-teal-800 bg-teal-50/60 dark:bg-teal-950/40">
          Microsoft
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground border-border/80">
        E-mail
      </Badge>
    );
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
      case "tecnico" as any:
        return (
          <Badge className="bg-g-blue text-white font-bold text-[11px] gap-1 hover:bg-blue-600">
            <UserCheck className="size-3" /> Técnico / Gestor
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground font-semibold text-[11px]">
            Solicitante
          </Badge>
        );
    }
  };

  // Abrir modal de edição de cadastro
  const abrirEdicaoCadastro = (u: UsuarioAdmin) => {
    setUsuarioEditarCadastro(u);
    setEditNome(u.nome || "");
    setEditSetor(u.setor && u.setor !== "Pendente" ? u.setor : "");
    setEditCargo(u.cargo || "");
    setEditTelefone(formatarTelefoneBR(u.telefone || ""));
    setEditLocalPadrao(u.localPadrao || "");
    setEditMatricula(u.matricula || "");
    setEditStatus(u.bloqueado || u.status === "inativo" ? "inativo" : "ativo");
  };

  // Salvar edição do cadastro
  const handleSalvarEdicaoCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioEditarCadastro) return;

    const nomeLimpo = editNome.trim();
    const setorLimpo = editSetor.trim();

    if (!nomeLimpo || nomeLimpo.length < 2) {
      toast.error("Nome completo é obrigatório (mínimo de 2 caracteres).");
      return;
    }
    if (!setorLimpo || setorLimpo === "Pendente") {
      toast.error("Selecione um setor válido da lista para o usuário.");
      return;
    }
    if (editTelefone && !validarTelefoneBR(editTelefone)) {
      toast.error("Telefone inválido. Informe DDD + número.");
      return;
    }

    // Proteção: Administrador não pode desativar a si mesmo
    if (usuarioEditarCadastro.id === session?.user?.id && editStatus === "inativo") {
      toast.error("Você não pode desativar o seu próprio usuário administrador.");
      return;
    }

    // Proteção: Não remover o último administrador ativo
    if (editStatus === "inativo" && usuarioEditarCadastro.role === "admin") {
      const adminsAtivos = usuarios.filter((u) => u.role === "admin" && !u.bloqueado && u.status !== "inativo");
      if (adminsAtivos.length <= 1) {
        toast.error("Operação bloqueada: este é o único administrador ativo do sistema.");
        return;
      }
    }

    setSalvandoEdicao(true);
    try {
      const { error: rpcErr } = await adminDb.rpc("admin_edit_user_profile", {
        p_target_user_id: usuarioEditarCadastro.id,
        p_nome: nomeLimpo,
        p_setor: setorLimpo,
        p_cargo: editCargo.trim() || null,
        p_telefone: editTelefone.trim() || null,
        p_local_padrao: editLocalPadrao.trim() || null,
        p_matricula: editMatricula.trim() || null,
        p_status: editStatus,
      });

      if (rpcErr) {
        // Fallback direto na tabela user_profiles
        const { error: directErr } = await adminDb
          .from("user_profiles")
          .update({
            nome: nomeLimpo,
            setor: setorLimpo,
            cargo: editCargo.trim() || null,
            telefone: editTelefone.trim() || null,
            local_padrao: editLocalPadrao.trim() || null,
            matricula: editMatricula.trim() || null,
            status: editStatus,
            bloqueado: editStatus === "inativo",
            updated_at: new Date().toISOString(),
          })
          .eq("id", usuarioEditarCadastro.id);

        if (directErr) {
          throw new Error(directErr.message || rpcErr.message);
        }
      }

      toast.success(`Cadastro de ${nomeLimpo} atualizado com sucesso!`);
      setUsuarioEditarCadastro(null);
      await carregarDados();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar alterações no cadastro.");
    } finally {
      setSalvandoEdicao(false);
    }
  };

  // Alterar papel com validações
  const handleAlterarPapel = async () => {
    if (!usuarioEditarPapel) return;

    // Proteção: não remover o último administrador
    if (usuarioEditarPapel.role === "admin" && novoPapel !== "admin") {
      const adminsAtivos = usuarios.filter((u) => u.role === "admin" && !u.bloqueado && u.status !== "inativo");
      if (adminsAtivos.length <= 1) {
        toast.error("Operação não permitida: não é possível remover o papel do único administrador ativo.");
        return;
      }
    }

    setSalvandoPapel(true);
    try {
      if (usuarioEditarPapel.id.startsWith("pending-")) {
        const { error } = await adminDb.rpc("admin_preregister_role", {
          p_email: usuarioEditarPapel.email,
          p_role: novoPapel,
        });

        if (error) {
          toast.error(error.message || "Erro ao atualizar permissão do pré-cadastro.");
        } else {
          toast.success(`Perfil de pré-cadastro de ${usuarioEditarPapel.email} atualizado para ${novoPapel}!`);
          setUsuarioEditarPapel(null);
          await carregarDados();
        }
      } else {
        const { error } = await adminDb.rpc("admin_update_user_role", {
          p_target_user_id: usuarioEditarPapel.id,
          p_new_role: novoPapel,
        });

        if (error) {
          // Fallback
          const { error: roleErr } = await adminDb
            .from("user_roles")
            .upsert({ user_id: usuarioEditarPapel.id, role: novoPapel }, { onConflict: "user_id,role" });
          if (roleErr) throw new Error(roleErr.message);
        }

        toast.success(`Papel de ${usuarioEditarPapel.nome || usuarioEditarPapel.email} atualizado para ${novoPapel}!`);
        setUsuarioEditarPapel(null);
        await carregarDados();
      }
    } catch (err: any) {
      toast.error(err.message || "Erro inesperado ao alterar papel.");
    } finally {
      setSalvandoPapel(false);
    }
  };

  // Ativar ou desativar usuário com proteção de auto-desativação e último admin
  const handleAlternarStatus = async (u: UsuarioAdmin) => {
    if (u.id.startsWith("pending-")) {
      toast.info("Este e-mail ainda não realizou o primeiro acesso no sistema.");
      return;
    }

    // Proteção: admin não desativa a si mesmo
    if (u.id === session?.user?.id && !u.bloqueado) {
      toast.error("Você não pode desativar o seu próprio usuário administrador.");
      return;
    }

    // Proteção: último admin
    if (!u.bloqueado && u.role === "admin") {
      const adminsAtivos = usuarios.filter((item) => item.role === "admin" && !item.bloqueado && item.status !== "inativo");
      if (adminsAtivos.length <= 1) {
        toast.error("Operação bloqueada: não é possível desativar o único administrador ativo do sistema.");
        return;
      }
    }

    const novoBloqueio = !u.bloqueado;
    try {
      const { error } = await adminDb.rpc("admin_toggle_user_block", {
        p_target_user_id: u.id,
        p_bloquear: novoBloqueio,
      });

      if (error) {
        // Fallback
        const { error: directErr } = await adminDb
          .from("user_profiles")
          .update({
            bloqueado: novoBloqueio,
            status: novoBloqueio ? "inativo" : "ativo",
            updated_at: new Date().toISOString(),
          })
          .eq("id", u.id);

        if (directErr) throw new Error(directErr.message || error.message);
      }

      toast.success(
        novoBloqueio
          ? `Usuário ${u.nome || u.email} desativado com sucesso. O histórico dele permanece preservado.`
          : `Usuário ${u.nome || u.email} reativado com sucesso!`,
      );
      await carregarDados();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao alterar status do usuário.");
    }
  };

  // Pré-cadastro
  const handlePreCadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailLimpo = emailPreCadastro.toLowerCase().trim();
    if (!emailLimpo || !emailLimpo.includes("@")) {
      toast.error("Informe um e-mail válido.");
      return;
    }

    setSalvandoPre(true);
    try {
      const { error } = await adminDb.rpc("admin_pre_register_role", {
        p_email: emailLimpo,
        p_role: papelPreCadastro,
      });

      if (error) {
        const { error: directErr } = await adminDb.from("pre_registered_roles").upsert({
          email: emailLimpo,
          role: papelPreCadastro,
          criado_por: session?.user?.id || null,
        });
        if (directErr) throw new Error(directErr.message);
      }

      toast.success(`Pré-cadastro do e-mail ${emailLimpo} registrado com perfil ${papelPreCadastro}!`);
      setEmailPreCadastro("");
      setModalPreCadastro(false);
      await carregarDados();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar pré-cadastro.");
    } finally {
      setSalvandoPre(false);
    }
  };

  const handleRemoverPreCadastro = async (email: string) => {
    try {
      const { error } = await adminDb.rpc("admin_remove_pre_registration", { p_email: email });
      if (error) {
        await adminDb.from("pre_registered_roles").delete().eq("email", email);
      }
      toast.success(`Pré-cadastro de ${email} removido.`);
      await carregarDados();
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover pré-cadastro.");
    }
  };

  // Exportação (XLSX, CSV e PDF)
  const exportarUsuarios = async (formato: "xlsx" | "csv" | "pdf") => {
    if (usuariosFiltrados.length === 0) {
      toast.info("Nenhum usuário para exportar com os filtros atuais.");
      return;
    }
    setExportando(true);
    try {
      const dataHoje = new Date().toISOString().slice(0, 10);
      const nomeArquivo = `usuarios-cadastrados-${dataHoje}`;

      if (formato === "pdf") {
        const dadosPdf = usuariosFiltrados.map((u) => ({
          nome: u.nome || "—",
          email: u.email,
          setor: u.setor || "—",
          cargo: u.cargo || "—",
          telefone: u.telefone || "—",
          matricula: u.matricula || "—",
          papel: u.role === "admin" ? "Administrador" : u.role === "gestor" ? "Técnico / Gestor" : "Solicitante",
          status: u.bloqueado || u.status === "inativo" ? "Inativo" : "Ativo",
          ultimoAcesso: u.ultimoAcesso ? new Date(u.ultimoAcesso).toLocaleString("pt-BR") : "Aguardando 1º login",
        }));
        await exportarUsuariosPdf(dadosPdf, nomeArquivo);
      } else {
        const linhas = usuariosFiltrados.map((u) => {
          const provNome =
            u.provedor === "google" || (!u.provedor && u.email.endsWith("@gmail.com"))
              ? "Google"
              : u.provedor === "microsoft" ||
                (!u.provedor &&
                  (u.email.endsWith("@senaimt.ind.br") ||
                    u.email.endsWith("@hotmail.com") ||
                    u.email.endsWith("@outlook.com")))
              ? "Microsoft"
              : "E-mail";

          const papelNome =
            u.role === "admin" ? "Administrador" : u.role === "gestor" ? "Técnico / Gestor" : "Solicitante";

          const statusNome = u.bloqueado || u.status === "inativo" ? "Inativo" : "Ativo";

          return {
            Nome: u.nome || u.email.split("@")[0] || "Usuário",
            "E-mail": u.email,
            Setor: u.setor || "Pendente",
            "Cargo / Função": u.cargo || "—",
            Telefone: u.telefone || "—",
            "Sala / Local Padrão": u.localPadrao || "—",
            Matrícula: u.matricula || "—",
            Perfil: papelNome,
            Status: statusNome,
            Provedor: provNome,
            "Total de Chamados": u.totalChamados ?? 0,
            "1º Acesso": u.createdAt ? new Date(u.createdAt).toLocaleString("pt-BR") : "—",
            "Último Acesso": u.ultimoAcesso ? new Date(u.ultimoAcesso).toLocaleString("pt-BR") : "Aguardando 1º login",
          };
        });

        if (formato === "csv") {
          exportarCsv(linhas, nomeArquivo);
        } else {
          await exportarXlsx(linhas, nomeArquivo);
        }
      }

      toast.success(
        `Exportação em ${formato.toUpperCase()} gerada com sucesso! (${usuariosFiltrados.length} usuário${
          usuariosFiltrados.length === 1 ? "" : "s"
        })`,
      );
    } catch (err: any) {
      console.error("Erro na exportação de usuários:", err);
      toast.error("Falha ao exportar a lista de usuários.");
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Topo com ações */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="size-6 text-primary" /> Gestão de Usuários e Carteira de Acesso
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Gerencie a base de usuários cadastrados, setores, permissões, ativação e relatórios de auditoria.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportarUsuarios("xlsx")}
                disabled={exportando || carregando || usuariosFiltrados.length === 0}
                className="text-xs font-semibold gap-1.5 text-g-blue dark:text-blue-400 border-g-blue/40 hover:bg-g-blue/10"
                title="Exportar usuários em planilha Excel XLSX formatada (fonte 12)"
              >
                <FileSpreadsheet className="size-3.5" /> Exportar Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportarUsuarios("pdf")}
                disabled={exportando || carregando || usuariosFiltrados.length === 0}
                className="text-xs font-semibold gap-1.5 text-red-600 dark:text-red-400 border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/40"
                title="Exportar usuários em relatório PDF organizado"
              >
                <FileText className="size-3.5" /> Exportar PDF
              </Button>
            </>
          )}

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

      {/* Histórico de Auditoria */}
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
              logs.map((log) => {
                const eCadastroInicial = log.acao === "cadastro inicial de administradores";
                return (
                  <div
                    key={log.id}
                    className={`rounded-xl border p-2.5 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4 ${
                      eCadastroInicial ? "border-purple-500/40 bg-purple-500/10" : "border-border/60 bg-background/80"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-foreground truncate">{log.admin_email}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className={`truncate ${eCadastroInicial ? "font-bold text-purple-700 dark:text-purple-300" : "font-medium text-g-blue"}`}>
                        {log.acao}
                      </span>
                      <span className="text-muted-foreground truncate">({log.alvo_email})</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-muted-foreground text-[11px]">
                      {log.detalhes && <span className="italic">{formatarDetalhesAuditoria(log.detalhes)}</span>}
                      <span>•</span>
                      <span>{new Date(log.created_at).toLocaleString("pt-BR")}</span>
                    </div>
                  </div>
                );
              })
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

      {/* Barra de Busca e Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-4 relative">
          <Search className="size-4 text-muted-foreground absolute left-3 top-3" />
          <Input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPaginaAtual(1);
            }}
            placeholder="Buscar por nome, e-mail ou matrícula..."
            className="pl-9 rounded-xl text-xs sm:text-sm"
          />
        </div>

        <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Filtro Setor */}
          <select
            value={filtroSetor}
            onChange={(e) => {
              setFiltroSetor(e.target.value);
              setPaginaAtual(1);
            }}
            className="h-10 rounded-xl border border-input bg-background px-3 text-xs sm:text-sm font-medium"
          >
            <option value="todos">Todos os setores</option>
            {listaSetoresDisponiveis.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Filtro Papel */}
          <select
            value={filtroRole}
            onChange={(e) => {
              setFiltroRole(e.target.value);
              setPaginaAtual(1);
            }}
            className="h-10 rounded-xl border border-input bg-background px-3 text-xs sm:text-sm font-medium"
          >
            <option value="todos">Todos os perfis</option>
            <option value="admin">Administrador</option>
            <option value="gestor">Técnico / Gestor</option>
            <option value="usuario">Solicitante</option>
          </select>

          {/* Filtro Status */}
          <select
            value={filtroStatus}
            onChange={(e) => {
              setFiltroStatus(e.target.value);
              setPaginaAtual(1);
            }}
            className="h-10 rounded-xl border border-input bg-background px-3 text-xs sm:text-sm font-medium"
          >
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo / Bloqueado</option>
            <option value="pendente">Pendente de 1º login</option>
          </select>

          {/* Filtro Provedor */}
          <select
            value={filtroProvedor}
            onChange={(e) => {
              setFiltroProvedor(e.target.value);
              setPaginaAtual(1);
            }}
            className="h-10 rounded-xl border border-input bg-background px-3 text-xs sm:text-sm font-medium"
          >
            <option value="todos">Todos os provedores</option>
            <option value="google">Google</option>
            <option value="microsoft">Microsoft</option>
            <option value="email">E-mail</option>
          </select>
        </div>
      </div>

      {/* Lista de Usuários */}
      <div className="space-y-3">
        {carregando ? (
          <div className="py-16 text-center text-xs sm:text-sm text-muted-foreground">
            <RefreshCw className="size-8 animate-spin mx-auto mb-3 text-primary" />
            Carregando usuários cadastrados...
          </div>
        ) : erroCarregamento ? (
          <Card className="rounded-2xl border-destructive/40 bg-destructive/5 p-8 text-center space-y-3">
            <AlertTriangle className="size-8 text-destructive mx-auto" />
            <p className="text-sm font-bold text-foreground">Falha ao carregar lista de usuários</p>
            <p className="text-xs text-muted-foreground">{erroCarregamento}</p>
            <Button variant="outline" size="sm" onClick={carregarDados} className="font-semibold gap-1.5">
              <RefreshCw className="size-3.5" /> Tentar novamente
            </Button>
          </Card>
        ) : usuariosOrdenados.length === 0 ? (
          <Card className="rounded-2xl border-dashed p-10 text-center space-y-2">
            <Users className="size-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm font-semibold text-foreground">Nenhum usuário encontrado</p>
            <p className="text-xs text-muted-foreground">Ajuste os filtros ou o termo de busca para visualizar resultados.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {/* Barra de Contagem e Ordenação Rápida */}
            <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground px-1">
              <span>
                Exibindo <strong>{usuariosFiltrados.length}</strong> usuário{usuariosFiltrados.length === 1 ? "" : "s"}
                {usuariosFiltrados.length !== usuarios.length && ` (filtrado de ${usuarios.length} no total)`}
              </span>

              <div className="flex items-center gap-2">
                <span>Ordenar por:</span>
                <button
                  type="button"
                  onClick={() => alternarOrdenacao("nome")}
                  className={`font-semibold hover:underline inline-flex items-center gap-0.5 ${campoOrdenacao === "nome" ? "text-primary font-bold" : ""}`}
                >
                  Nome {campoOrdenacao === "nome" && (direcaoOrdenacao === "asc" ? "↑" : "↓")}
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => alternarOrdenacao("setor")}
                  className={`font-semibold hover:underline inline-flex items-center gap-0.5 ${campoOrdenacao === "setor" ? "text-primary font-bold" : ""}`}
                >
                  Setor {campoOrdenacao === "setor" && (direcaoOrdenacao === "asc" ? "↑" : "↓")}
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => alternarOrdenacao("createdAt")}
                  className={`font-semibold hover:underline inline-flex items-center gap-0.5 ${campoOrdenacao === "createdAt" ? "text-primary font-bold" : ""}`}
                >
                  Data {campoOrdenacao === "createdAt" && (direcaoOrdenacao === "asc" ? "↑" : "↓")}
                </button>
              </div>
            </div>

            {/* Itens da Lista */}
            <div className="grid gap-3">
              {usuariosPaginados.map((u) => {
                const eProprioUsuario = u.id === session?.user?.id;
                const eInativo = u.bloqueado || u.status === "inativo";
                const ePreCadastroPendente = u.statusConta === "pendente" || !u.ultimoAcesso;

                return (
                  <div
                    key={u.id}
                    className={`rounded-2xl border bg-card p-4 shadow-2xs transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                      eInativo
                        ? "border-destructive/40 bg-destructive/5"
                        : ePreCadastroPendente
                        ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60"
                        : "border-border/80 hover:border-primary/40"
                    }`}
                  >
                    {/* Bloco 1: Foto, Nome, Email, Setor, Cargo */}
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <UserAvatar
                        fotoUrl={u.fotoUrl}
                        nome={u.nome}
                        email={u.email}
                        sizeClassName="size-11 shrink-0 mt-0.5 sm:mt-0"
                      />
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-foreground truncate" title={u.nome || u.email}>
                            {u.nome || u.email.split("@")[0]}
                          </span>
                          {eProprioUsuario && (
                            <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.2 rounded-md">
                              Você
                            </span>
                          )}
                          {ADMINS_INICIAIS_AUTORIZADOS.includes(u.email.toLowerCase().trim()) && (
                            <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-500/15 px-1.5 py-0.2 rounded-md">
                              Administrador Raiz
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono text-[11px] truncate" title={u.email}>
                            {u.email}
                          </span>
                          {u.matricula && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[11px] bg-muted/60 px-1.5 py-0.2 rounded text-foreground">
                                Matrícula: {u.matricula}
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                          <span className="font-semibold text-foreground bg-muted/80 px-2 py-0.5 rounded-md border border-border/60">
                            {u.setor || "Pendente"}
                          </span>
                          {u.cargo && (
                            <span className="text-muted-foreground italic truncate max-w-[200px]" title={u.cargo}>
                              {u.cargo}
                            </span>
                          )}
                          {u.telefone && (
                            <span className="text-muted-foreground font-mono text-[11px] flex items-center gap-1">
                              <Phone className="size-3" /> {u.telefone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bloco 2: Badges e Estatísticas */}
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-muted-foreground">
                      <div className="flex flex-col items-start sm:items-center">
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground/70">Perfil</span>
                        {getRoleBadge(u.role)}
                      </div>

                      <div className="flex flex-col items-start sm:items-center">
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground/70">Status</span>
                        {eInativo ? (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 font-bold">
                            Inativo
                          </Badge>
                        ) : ePreCadastroPendente ? (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-400/40">
                            Pendente
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-300 dark:border-emerald-800 font-bold">
                            Ativo
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-col items-start sm:items-center min-w-[65px]">
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground/70">Chamados</span>
                        <span className="font-mono font-bold text-xs text-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/60">
                          {u.totalChamados ?? 0}
                        </span>
                      </div>

                      <div className="flex flex-col text-left sm:text-right min-w-[85px] hidden sm:flex">
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground/70">Último Acesso</span>
                        <span className="text-[11px] font-mono text-foreground">
                          {u.ultimoAcesso ? new Date(u.ultimoAcesso).toLocaleDateString("pt-BR") : "Aguardando 1º login"}
                        </span>
                      </div>
                    </div>

                    {/* Bloco 3: Botões de Ação */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/50">
                      {/* Ver Detalhes */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUsuarioDetalhes(u)}
                        className="text-xs h-8 text-muted-foreground hover:text-foreground"
                        title="Ver ficha completa do usuário"
                      >
                        <Eye className="size-3.5 mr-1" /> Detalhes
                      </Button>

                      {/* Editar Cadastro */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirEdicaoCadastro(u)}
                        className="text-xs h-8 font-medium"
                        title="Editar nome, setor, cargo, telefone, sala ou matrícula"
                      >
                        <Edit className="size-3.5 mr-1" /> Editar
                      </Button>

                      {/* Alterar Papel */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setUsuarioEditarPapel(u);
                          setNovoPapel(u.role);
                        }}
                        className="text-xs font-medium h-8"
                        title="Alterar perfil de acesso do usuário"
                      >
                        Perfil
                      </Button>

                      {/* Ativar ou Desativar */}
                      <ConfirmAction
                        title={eInativo ? `Reativar o usuário ${u.nome || u.email}?` : `Desativar o usuário ${u.nome || u.email}?`}
                        description={
                          eInativo
                            ? "O usuário voltará a poder acessar o sistema e abrir chamados normalmente."
                            : "O usuário terá o acesso suspenso e não conseguirá abrir chamados. O histórico dele é preservado."
                        }
                        confirmLabel={eInativo ? "Sim, reativar" : "Sim, desativar"}
                        variant={eInativo ? "default" : "destructive"}
                        disabled={eProprioUsuario && !eInativo}
                        onConfirm={() => handleAlternarStatus(u)}
                      >
                        <Button
                          variant={eInativo ? "outline" : "ghost"}
                          size="sm"
                          disabled={eProprioUsuario && !eInativo}
                          className={`text-xs h-8 ${
                            eInativo
                              ? "text-emerald-600 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              : "text-destructive hover:bg-destructive/10"
                          }`}
                          title={eProprioUsuario && !eInativo ? "Você não pode desativar seu próprio usuário" : ""}
                        >
                          {eInativo ? (
                            <>
                              <Unlock className="size-3.5 mr-1" /> Reativar
                            </>
                          ) : (
                            <>
                              <Lock className="size-3.5 mr-1" /> Desativar
                            </>
                          )}
                        </Button>
                      </ConfirmAction>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-border/60">
                <p className="text-xs text-muted-foreground">
                  Página <strong>{paginaAtual}</strong> de <strong>{totalPaginas}</strong>
                </p>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={paginaAtual <= 1}
                    onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                    className="h-8 text-xs gap-1"
                  >
                    <ChevronLeft className="size-3.5" /> Anterior
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((pg) => {
                      if (pg === 1 || pg === totalPaginas || (pg >= paginaAtual - 1 && pg <= paginaAtual + 1)) {
                        return (
                          <Button
                            key={pg}
                            variant={paginaAtual === pg ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPaginaAtual(pg)}
                            className="h-8 w-8 p-0 text-xs font-semibold"
                          >
                            {pg}
                          </Button>
                        );
                      }
                      if (pg === paginaAtual - 2 || pg === paginaAtual + 2) {
                        return (
                          <span key={pg} className="text-xs text-muted-foreground px-1">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={paginaAtual >= totalPaginas}
                    onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                    className="h-8 text-xs gap-1"
                  >
                    Próxima <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: Ver Detalhes do Usuário */}
      {usuarioDetalhes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <UserCheck className="size-5 text-primary" /> Ficha Cadastral do Usuário
              </h3>
              <button
                type="button"
                onClick={() => setUsuarioDetalhes(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex items-center gap-3.5 rounded-xl bg-muted/40 p-3.5 border border-border/60">
              <UserAvatar
                fotoUrl={usuarioDetalhes.fotoUrl}
                nome={usuarioDetalhes.nome}
                email={usuarioDetalhes.email}
                sizeClassName="size-14 shrink-0"
              />
              <div className="min-w-0 space-y-1">
                <p className="font-bold text-base text-foreground truncate">{usuarioDetalhes.nome || "Não informado"}</p>
                <p className="text-xs font-mono text-muted-foreground truncate">{usuarioDetalhes.email}</p>
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {getRoleBadge(usuarioDetalhes.role)}
                  {usuarioDetalhes.bloqueado || usuarioDetalhes.status === "inativo" ? (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 font-bold">
                      Inativo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 font-bold border-emerald-300">
                      Ativo
                    </Badge>
                  )}
                  {getProvedorBadge(usuarioDetalhes.provedor, usuarioDetalhes.email)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5 text-xs">
              <div className="rounded-xl border border-border/70 p-3 space-y-1 bg-background">
                <span className="text-[11px] text-muted-foreground font-semibold uppercase">Setor</span>
                <p className="font-bold text-foreground text-sm">{usuarioDetalhes.setor || "Pendente"}</p>
              </div>

              <div className="rounded-xl border border-border/70 p-3 space-y-1 bg-background">
                <span className="text-[11px] text-muted-foreground font-semibold uppercase">Cargo ou Função</span>
                <p className="font-bold text-foreground text-sm">{usuarioDetalhes.cargo || "—"}</p>
              </div>

              <div className="rounded-xl border border-border/70 p-3 space-y-1 bg-background">
                <span className="text-[11px] text-muted-foreground font-semibold uppercase">Telefone / Ramal</span>
                <p className="font-mono font-bold text-foreground text-sm">{usuarioDetalhes.telefone || "—"}</p>
              </div>

              <div className="rounded-xl border border-border/70 p-3 space-y-1 bg-background">
                <span className="text-[11px] text-muted-foreground font-semibold uppercase">Sala / Local Padrão</span>
                <p className="font-bold text-foreground text-sm">{usuarioDetalhes.localPadrao || "—"}</p>
              </div>

              <div className="rounded-xl border border-border/70 p-3 space-y-1 bg-background">
                <span className="text-[11px] text-muted-foreground font-semibold uppercase">Matrícula</span>
                <p className="font-mono font-bold text-foreground text-sm">{usuarioDetalhes.matricula || "—"}</p>
              </div>

              <div className="rounded-xl border border-border/70 p-3 space-y-1 bg-background">
                <span className="text-[11px] text-muted-foreground font-semibold uppercase">Total de Chamados</span>
                <p className="font-bold text-foreground text-sm">{usuarioDetalhes.totalChamados ?? 0}</p>
              </div>

              <div className="rounded-xl border border-border/70 p-3 space-y-1 bg-background col-span-2">
                <span className="text-[11px] text-muted-foreground font-semibold uppercase">Histórico de Acesso</span>
                <div className="flex flex-col sm:flex-row justify-between gap-1 text-xs pt-1 font-mono">
                  <span>1º Cadastro: {usuarioDetalhes.createdAt ? new Date(usuarioDetalhes.createdAt).toLocaleString("pt-BR") : "—"}</span>
                  <span>Último Acesso: {usuarioDetalhes.ultimoAcesso ? new Date(usuarioDetalhes.ultimoAcesso).toLocaleString("pt-BR") : "Aguardando 1º login"}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <Button variant="outline" size="sm" onClick={() => setUsuarioDetalhes(null)}>
                Fechar
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  const u = usuarioDetalhes;
                  setUsuarioDetalhes(null);
                  abrirEdicaoCadastro(u);
                }}
                className="font-bold gap-1.5"
              >
                <Edit className="size-3.5" /> Editar Cadastro
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Editar Cadastro de Usuário */}
      {usuarioEditarCadastro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Edit className="size-5 text-primary" /> Editar Cadastro do Usuário
              </h3>
              <button
                type="button"
                onClick={() => setUsuarioEditarCadastro(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarEdicaoCadastro} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="editNome" className="text-xs font-semibold flex items-center gap-1">
                  Nome completo <span className="text-[var(--g-red)] font-bold">*</span>
                </Label>
                <Input
                  id="editNome"
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  placeholder="Nome do usuário"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="editSetor" className="text-xs font-semibold flex items-center gap-1">
                    Setor <span className="text-[var(--g-red)] font-bold">*</span>
                  </Label>
                  <select
                    id="editSetor"
                    value={editSetor}
                    onChange={(e) => setEditSetor(e.target.value)}
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    required
                  >
                    <option value="">Selecione o setor...</option>
                    {listaSetoresDisponiveis.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editCargo" className="text-xs font-semibold">
                    Cargo / Função
                  </Label>
                  <Input
                    id="editCargo"
                    value={editCargo}
                    onChange={(e) => setEditCargo(e.target.value)}
                    placeholder="Ex.: Assistente"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="editTelefone" className="text-xs font-semibold">
                    Telefone / Ramal
                  </Label>
                  <Input
                    id="editTelefone"
                    value={editTelefone}
                    onChange={(e) => setEditTelefone(formatarTelefoneBR(e.target.value))}
                    placeholder="(66) 99999-9999"
                    maxLength={15}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editLocalPadrao" className="text-xs font-semibold">
                    Sala / Local Padrão
                  </Label>
                  <Input
                    id="editLocalPadrao"
                    value={editLocalPadrao}
                    onChange={(e) => setEditLocalPadrao(e.target.value)}
                    placeholder="Ex.: Bloco A, Sala 02"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="editMatricula" className="text-xs font-semibold">
                    Matrícula
                  </Label>
                  <Input
                    id="editMatricula"
                    value={editMatricula}
                    onChange={(e) => setEditMatricula(e.target.value)}
                    placeholder="Ex.: 123456"
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editStatus" className="text-xs font-semibold">
                    Status do Usuário
                  </Label>
                  <select
                    id="editStatus"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="ativo">Ativo (Permite abrir chamados)</option>
                    <option value="inativo">Inativo (Bloqueia novos chamados)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                <Button type="button" variant="outline" size="sm" onClick={() => setUsuarioEditarCadastro(null)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="default" size="sm" disabled={salvandoEdicao} className="font-bold">
                  {salvandoEdicao ? "Salvando..." : "Salvar Cadastro"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Alterar Perfil / Papel */}
      {usuarioEditarPapel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <ShieldCheck className="size-5 text-primary" /> Alterar Papel de Acesso
              </h3>
              <button
                type="button"
                onClick={() => setUsuarioEditarPapel(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
                <UserAvatar fotoUrl={usuarioEditarPapel.fotoUrl} nome={usuarioEditarPapel.nome} email={usuarioEditarPapel.email} />
                <div className="overflow-hidden leading-tight">
                  <p className="font-bold text-sm text-foreground truncate">{usuarioEditarPapel.nome || usuarioEditarPapel.email}</p>
                  <p className="text-xs font-mono text-muted-foreground truncate">{usuarioEditarPapel.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Novo Perfil</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["usuario", "gestor", "admin"] as PapelUsuario[]).map((p) => {
                    const sel = novoPapel === p;
                    const rotulo = p === "admin" ? "Administrador" : p === "gestor" ? "Técnico / Gestor" : "Solicitante";
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
                  • <strong>Solicitante:</strong> Abre e acompanha seus próprios chamados.<br />
                  • <strong>Técnico / Gestor:</strong> Atende chamados, visualiza triagem e métricas da equipe.<br />
                  • <strong>Administrador:</strong> Gestão completa de usuários, regras e configurações da plataforma.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
              <Button variant="outline" size="sm" onClick={() => setUsuarioEditarPapel(null)}>
                Cancelar
              </Button>
              <ConfirmAction
                title={`Alterar perfil de ${usuarioEditarPapel.nome || usuarioEditarPapel.email}?`}
                description={`O usuário passará a ter os privilégios de ${
                  novoPapel === "admin" ? "Administrador" : novoPapel === "gestor" ? "Técnico / Gestor" : "Solicitante"
                }.`}
                confirmLabel="Sim, alterar perfil"
                variant="google-blue"
                onConfirm={handleAlterarPapel}
              >
                <Button variant="default" size="sm" disabled={salvandoPapel} className="font-bold">
                  {salvandoPapel ? "Salvando..." : "Salvar Perfil"}
                </Button>
              </ConfirmAction>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Pré-cadastrar E-mail */}
      {modalPreCadastro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <UserPlus className="size-5 text-primary" /> Pré-cadastrar Permissão por E-mail
              </h3>
              <button
                type="button"
                onClick={() => setModalPreCadastro(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handlePreCadastrar} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="emailPre" className="text-xs font-semibold">
                  E-mail institucional
                </Label>
                <Input
                  id="emailPre"
                  type="email"
                  value={emailPreCadastro}
                  onChange={(e) => setEmailPreCadastro(e.target.value)}
                  placeholder="usuario@senaimt.ind.br"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Papel Inicial a Atribuir</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["usuario", "gestor", "admin"] as PapelUsuario[]).map((p) => {
                    const sel = papelPreCadastro === p;
                    const rotulo = p === "admin" ? "Administrador" : p === "gestor" ? "Técnico / Gestor" : "Solicitante";
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

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalPreCadastro(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="default" size="sm" disabled={salvandoPre} className="font-bold">
                  {salvandoPre ? "Salvando..." : "Salvar Pré-cadastro"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
