import { useEffect, useState } from "react";
import { History, RotateCcw, RefreshCw, User, Calendar, Tag, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store-context";
import type { ConfiguracaoHistoricoItem } from "@/lib/types";

export function PainelHistoricoConfig() {
  const { carregarHistoricoConfig, desfazerAlteracaoConfig } = useStore();
  const [historico, setHistorico] = useState<ConfiguracaoHistoricoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [desfazendoId, setDesfazendoId] = useState<number | null>(null);

  const carregar = async () => {
    setCarregando(true);
    try {
      const itens = await carregarHistoricoConfig();
      setHistorico(itens);
    } catch {
      toast.error("Não foi possível carregar o histórico de alterações.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    void carregar();
  }, []);

  const handleDesfazer = async (item: ConfiguracaoHistoricoItem) => {
    if (!item.id) return;
    setDesfazendoId(item.id);
    try {
      const ok = await desfazerAlteracaoConfig(item.id);
      if (ok) {
        toast.success(`Alteração na seção "${item.secao}" revertida com sucesso!`);
        await carregar();
      } else {
        toast.error("Não foi possível reverter esta alteração.");
      }
    } catch (e) {
      toast.error("Erro ao executar a reversão.");
    } finally {
      setDesfazendoId(null);
    }
  };

  const formatarData = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <Card className="rounded-2xl border-2 border-border/80 shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl font-extrabold text-foreground">
            <History className="size-5 text-g-blue" />
            Histórico de Alterações de Configuração
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Registro cronológico imutável de quem alterou cada parâmetro do sistema, quando ocorreu e opção de desfazer (reverter).
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void carregar()}
          disabled={carregando}
          className="text-xs font-semibold gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`size-3.5 ${carregando ? "animate-spin" : ""}`} />
          Atualizar histórico
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {carregando && historico.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <RefreshCw className="size-4 animate-spin text-g-blue" /> Carregando histórico do banco...
          </div>
        ) : historico.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground border-2 border-dashed border-border/60 rounded-xl p-6">
            Nenhuma alteração registrada no histórico ainda. Quando um administrador salvar ajustes no painel, as versões anteriores ficarão disponíveis aqui para reversão com um clique.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/70 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3">Data / Hora</th>
                  <th className="p-3">Autor</th>
                  <th className="p-3">Seção / Chave</th>
                  <th className="p-3">Valores</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {historico.map((h) => {
                  const valorAnteriorStr = typeof h.valorAnterior === "object" ? JSON.stringify(h.valorAnterior) : String(h.valorAnterior ?? "—");
                  const valorNovoStr = typeof h.valorNovo === "object" ? JSON.stringify(h.valorNovo) : String(h.valorNovo ?? "—");

                  return (
                    <tr key={h.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="size-3 text-g-blue" />
                          {formatarData(h.criadoEm)}
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <User className="size-3 text-muted-foreground" />
                          <span className="truncate max-w-[150px]">{h.autorNome || h.autorEmail || "Administrador"}</span>
                        </div>
                        {h.autorEmail && h.autorNome && (
                          <span className="text-[10px] text-muted-foreground block truncate max-w-[150px]">{h.autorEmail}</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px] font-bold border-g-blue/30 text-g-blue">
                          {h.secao}
                        </Badge>
                        <span className="text-[11px] font-mono text-muted-foreground block mt-0.5">{h.chave}</span>
                      </td>
                      <td className="p-3 max-w-xs">
                        <details className="cursor-pointer group">
                          <summary className="text-[11px] font-semibold text-g-blue group-open:text-foreground select-none">
                            Ver detalhes do diff
                          </summary>
                          <div className="mt-1 space-y-1 text-[10px] font-mono p-2 bg-muted/60 rounded-md max-h-32 overflow-y-auto">
                            <div>
                              <strong className="text-red-500 font-bold block">Anterior:</strong>
                              <span className="text-muted-foreground break-all">{valorAnteriorStr}</span>
                            </div>
                            <div className="pt-1 border-t border-border/50">
                              <strong className="text-green-600 dark:text-green-400 font-bold block">Novo:</strong>
                              <span className="text-foreground break-all">{valorNovoStr}</span>
                            </div>
                          </div>
                        </details>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={desfazendoId === h.id || !h.valorAnterior}
                          onClick={() => void handleDesfazer(h)}
                          className="h-8 px-2.5 text-xs font-bold gap-1 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 border-amber-300 dark:border-amber-800"
                          title="Restaurar o valor anterior gravado neste ponto do histórico"
                        >
                          <RotateCcw className={`size-3.5 ${desfazendoId === h.id ? "animate-spin" : ""}`} />
                          Desfazer
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
