import { MessageSquare, RotateCcw, Send, Shield, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CHAT_PADRAO, type ChatConfig } from "@/lib/types";

interface PainelChatChamadoProps {
  config: ChatConfig;
  onChange: (patch: Partial<ChatConfig>) => void;
  onRestaurarPadrao: () => void;
}

export function PainelChatChamado({ config, onChange, onRestaurarPadrao }: PainelChatChamadoProps) {
  const c = { ...CHAT_PADRAO, ...(config ?? {}) };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-2 border-border/80 shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl font-extrabold text-foreground">
              <MessageSquare className="size-5 text-g-blue" />
              Conversa do Chamado (Chat em Tempo Real)
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Personalize títulos, subtítulos, orientações para mensagens e avisos da conversa entre usuário e suporte.
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
            Restaurar chat padrão
          </Button>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Pré-visualização do Chat */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Pré-visualização do Topo e Balões:
            </span>
            <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs max-w-lg mx-auto">
              <div className="p-3 border-b border-border/70 bg-muted/40 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    {(c.titulo || "Conversa do Chamado #{id}").replace("#{id}", "#1042")}
                  </h4>
                  <p className="text-[10px] text-muted-foreground">{c.subtitulo || ""}</p>
                </div>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Tempo real
                </span>
              </div>
              <div className="p-3 space-y-2 bg-muted/5">
                <div className="flex justify-start">
                  <div className="bg-card border border-border text-foreground p-2 rounded-xl text-xs max-w-[80%] shadow-2xs">
                    <p className="font-bold text-[10px] text-muted-foreground">Solicitante (Você)</p>
                    <p>Preciso de auxílio com a impressora do laboratório.</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-g-blue text-white p-2 rounded-xl text-xs max-w-[80%] shadow-2xs">
                    <p className="font-bold text-[10px] text-white/90">TI SENAI</p>
                    <p>Chamado recebido! Estamos a caminho do bloco B.</p>
                  </div>
                </div>
              </div>
              <div className="px-3 py-1.5 bg-muted/30 border-t border-border/60 text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                <CheckCircle2 className="size-3 text-g-green" />
                <span>
                  {(c.avisoFinalizado || c.avisoResolvido || "Chamado {status}").replace(
                    "{status}",
                    "Finalizado",
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Título da conversa (use #{`{id}`} para o número)</Label>
              <Input
                value={c.titulo || ""}
                onChange={(e) => onChange({ titulo: e.target.value })}
                className="text-xs"
                placeholder="Conversa do Chamado #{id}"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Subtítulo da conversa</Label>
              <Input
                value={c.subtitulo || ""}
                onChange={(e) => onChange({ subtitulo: e.target.value })}
                className="text-xs"
                placeholder="Histórico permanente e interação..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Placeholder para o Solicitante</Label>
              <Input
                value={c.placeholderSolicitante || c.placeholderUsuario || ""}
                onChange={(e) => onChange({ placeholderSolicitante: e.target.value })}
                className="text-xs"
                placeholder="Escreva mais detalhes ou esclareça dúvidas..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Placeholder para o Gestor / Técnico de TI</Label>
              <Input
                value={c.placeholderGestor || c.placeholderEquipe || ""}
                onChange={(e) => onChange({ placeholderGestor: e.target.value })}
                className="text-xs"
                placeholder="Escreva uma resposta ou orientação técnica..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Placeholder quando o envio estiver desabilitado</Label>
              <Input
                value={c.placeholderDesabilitado || ""}
                onChange={(e) => onChange({ placeholderDesabilitado: e.target.value })}
                className="text-xs"
                placeholder="Envio desabilitado para este chamado."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Aviso de chamado finalizado (use {`{status}`})</Label>
              <Input
                value={c.avisoFinalizado || c.avisoResolvido || ""}
                onChange={(e) => onChange({ avisoFinalizado: e.target.value })}
                className="text-xs"
                placeholder="Chamado finalizado como {status}..."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Texto quando não houver mensagens ainda</Label>
            <Input
              value={c.vazioTexto || c.textoVazio || ""}
              onChange={(e) => onChange({ vazioTexto: e.target.value })}
              className="text-xs"
              placeholder="Nenhuma mensagem registrada ainda. Envie a primeira mensagem abaixo!"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
