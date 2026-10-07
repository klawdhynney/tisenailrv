import { useState } from "react";
import { Search, Globe, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SEO_PADRAO, type SeoConfig, type PaginaSeoItem } from "@/lib/types";

interface PainelSeoMetaProps {
  config: SeoConfig;
  onChange: (patch: Partial<SeoConfig>) => void;
  onRestaurarPadrao: () => void;
}

export function PainelSeoMeta({ config, onChange, onRestaurarPadrao }: PainelSeoMetaProps) {
  const c = { ...SEO_PADRAO, ...(config ?? {}) };
  const [paginaPreview, setPaginaPreview] = useState<"inicio" | "abrir" | "dashboard" | "sobre">("inicio");

  const paginas = [
    { key: "inicio", rota: "/", nome: "Página Inicial" },
    { key: "abrir", rota: "/abrir", nome: "Abrir Chamado" },
    { key: "acompanhamento", rota: "/dashboard/acompanhamento", nome: "Acompanhamento" },
    { key: "meusChamados", rota: "/meus-chamados", nome: "Meus Chamados" },
    { key: "dashboard", rota: "/dashboard", nome: "Dashboard de Indicadores" },
    { key: "avaliacoes", rota: "/dashboard/avaliacoes", nome: "Avaliações" },
    { key: "sobre", rota: "/sobre", nome: "Sobre o Sistema" },
    { key: "lgpd", rota: "/lgpd", nome: "Privacidade e LGPD" },
    { key: "login", rota: "/auth", nome: "Tela de Login" },
  ] as const;

  const getTitulo = (k: typeof paginas[number]["key"]) => c[k]?.titulo || "";
  const getDesc = (k: typeof paginas[number]["key"]) => c[k]?.descricao || "";

  const atualizarPagina = (k: typeof paginas[number]["key"], patch: Partial<PaginaSeoItem>) => {
    onChange({
      [k]: {
        ...(c[k] ?? { titulo: "", descricao: "" }),
        ...patch,
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-2 border-border/80 shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl font-extrabold text-foreground">
              <Search className="size-5 text-g-blue" />
              SEO e Metadados das Páginas Públicas
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Defina os títulos da aba do navegador, descrições para mecanismos de busca (Google) e compartilhamento em redes sociais.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRestaurarPadrao}
            className="text-xs font-semibold gap-1.5 self-start sm:self-auto"
          >
            <RotateCcw className="size-3.5" />
            Restaurar SEO padrão
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Pré-visualização do snippet Google SERP */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Globe className="size-3.5 text-g-blue" />
                Pré-visualização nos Resultados do Google:
              </span>
              <div className="flex items-center gap-1">
                {(["inicio", "abrir", "dashboard", "sobre"] as const).map((p) => (
                  <Button
                    key={p}
                    type="button"
                    variant={paginaPreview === p ? "google-blue" : "ghost"}
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => setPaginaPreview(p)}
                  >
                    {p.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-4 max-w-xl shadow-2xs font-sans">
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">https://tisenailrv.app</span>
                <span>› {paginaPreview}</span>
              </div>
              <h4 className="text-base font-semibold text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer leading-snug mt-0.5">
                {getTitulo(paginaPreview) || "Título da Página"}
              </h4>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                {getDesc(paginaPreview) || "Descrição que aparece abaixo do título nos resultados de pesquisa do Google e prévias do WhatsApp."}
              </p>
            </div>
          </div>

          {/* Lista de páginas com inputs de Título e Descrição */}
          <div className="space-y-4">
            {paginas.map((p) => (
              <div key={p.key} className="p-4 rounded-xl border border-border/80 bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                    <span>{p.nome}</span>
                    <span className="text-[11px] font-mono font-normal text-muted-foreground">({p.rota})</span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Título da página (&lt;title&gt;)</Label>
                    <Input
                      value={getTitulo(p.key)}
                      onChange={(e) => atualizarPagina(p.key, { titulo: e.target.value })}
                      className="text-xs"
                      placeholder="Ex: Título da Página | TI SENAI LRV"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Meta Descrição</Label>
                    <Textarea
                      rows={2}
                      value={getDesc(p.key)}
                      onChange={(e) => atualizarPagina(p.key, { descricao: e.target.value })}
                      className="text-xs"
                      placeholder="Descrição com 120-160 caracteres..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
