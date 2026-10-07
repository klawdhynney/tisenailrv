import { ArrowDown, ArrowUp, Eye, EyeOff, LayoutTemplate, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { MENU_PADRAO, type MenuItemConfig, type MenuConfig } from "@/lib/types";

interface PainelMenuNavProps {
  config: MenuItemConfig[] | { itens?: MenuItemConfig[] };
  onChange: (novos: any) => void;
  onRestaurarPadrao: () => void;
}

export function PainelMenuNav({ config, onChange, onRestaurarPadrao }: PainelMenuNavProps) {
  const listaBruta: MenuItemConfig[] = Array.isArray(config)
    ? config
    : (config?.itens ?? (Array.isArray(MENU_PADRAO) ? MENU_PADRAO : []));
  const itens = (listaBruta && listaBruta.length > 0 ? listaBruta : (Array.isArray(MENU_PADRAO) ? MENU_PADRAO : []))
    .slice()
    .sort((a, b) => a.ordem - b.ordem);

  const atualizarItem = (id: string, patch: Partial<MenuItemConfig>) => {
    const novos = itens.map((item) => (item.id === id ? { ...item, ...patch } : item));
    onChange(Array.isArray(config) ? novos : { itens: novos });
  };

  const moverItem = (index: number, direcao: -1 | 1) => {
    const novoIndex = index + direcao;
    if (novoIndex < 0 || novoIndex >= itens.length) return;
    const copia = [...itens];
    const [removido] = copia.splice(index, 1);
    if (!removido) return;
    copia.splice(novoIndex, 0, removido);
    const reordenados = copia.map((it, idx) => ({ ...it, ordem: idx + 1 }));
    onChange(Array.isArray(config) ? reordenados : { itens: reordenados });
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-2 border-border/80 shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl font-extrabold text-foreground">
              <LayoutTemplate className="size-5 text-g-blue" />
              Menu e Navegação do Site
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Personalize o nome exibido, a visibilidade e a ordem de cada link no menu superior e navegação móvel.
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
            Restaurar menu padrão
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Pré-visualização da barra */}
          <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Pré-visualização da Barra de Navegação:
            </span>
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-background rounded-lg border border-border/70 overflow-x-auto">
              {itens.filter((i) => i.visivel).map((i) => (
                <span
                  key={i.id}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold bg-muted text-foreground border border-border/60 shrink-0"
                >
                  {i.label}
                  {i.exigeGestor && (
                    <Badge variant="outline" className="ml-1 text-[9px] py-0 px-1 border-amber-400 text-amber-600">
                      TI
                    </Badge>
                  )}
                  {i.exigeAdmin && (
                    <Badge variant="outline" className="ml-1 text-[9px] py-0 px-1 border-purple-400 text-purple-600">
                      Admin
                    </Badge>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* Lista de itens editáveis */}
          <div className="space-y-2.5">
            {itens.map((item, index) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-border/80 bg-card hover:border-g-blue/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={index === 0}
                      onClick={() => moverItem(index, -1)}
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      title="Mover para cima"
                    >
                      <ArrowUp className="size-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={index === itens.length - 1}
                      onClick={() => moverItem(index, 1)}
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      title="Mover para baixo"
                    >
                      <ArrowDown className="size-3" />
                    </Button>
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Input
                        value={item.label}
                        onChange={(e) => atualizarItem(item.id, { label: e.target.value })}
                        className="h-8 text-xs font-bold max-w-xs"
                        placeholder="Nome do link"
                      />
                      <span className="text-[11px] font-mono text-muted-foreground shrink-0">{item.href}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>Ordem: #{item.ordem}</span>
                      {item.exigeGestor && <span>• Restrito à equipe de TI</span>}
                      {item.exigeAdmin && <span>• Restrito ao Administrador</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium">
                      {item.visivel ? "Visível" : "Oculto"}
                    </span>
                    <Switch
                      checked={item.visivel}
                      onCheckedChange={(checked) => atualizarItem(item.id, { visivel: checked })}
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
