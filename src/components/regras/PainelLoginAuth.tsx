import { Lock, RotateCcw, ShieldCheck, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LOGIN_PADRAO, type LoginConfig } from "@/lib/types";

interface PainelLoginAuthProps {
  config: LoginConfig;
  onChange: (patch: Partial<LoginConfig>) => void;
  onRestaurarPadrao: () => void;
}

export function PainelLoginAuth({ config, onChange, onRestaurarPadrao }: PainelLoginAuthProps) {
  const c = { ...LOGIN_PADRAO, ...(config ?? {}) };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-2 border-border/80 shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl font-extrabold text-foreground">
              <Lock className="size-5 text-g-blue" />
              Tela de Login e Autenticação
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Personalize o título, instruções, botões de login corporativo e avisos legais da tela de acesso (/auth).
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
            Restaurar login padrão
          </Button>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Pré-visualização da Tela de Login */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Pré-visualização do Card de Login:
            </span>
            <div className="rounded-2xl border border-border/80 bg-card p-5 max-w-sm mx-auto shadow-sm space-y-3 text-center">
              <span className="inline-flex items-center gap-1 rounded-full bg-g-blue/10 px-2.5 py-0.5 text-[10px] font-bold text-g-blue">
                <ShieldCheck className="size-3" /> {c.badge}
              </span>
              <h3 className="text-base font-extrabold text-foreground">{c.titulo}</h3>
              <p className="text-xs text-muted-foreground">{c.subtitulo}</p>

              <div className="space-y-2 pt-2">
                <div className="w-full h-8 rounded-lg border border-border flex items-center justify-center text-xs font-semibold text-foreground bg-muted/40">
                  {c.botaoGoogle}
                </div>
                <div className="w-full h-8 rounded-lg border border-border flex items-center justify-center text-xs font-semibold text-foreground bg-muted/40">
                  {c.botaoMicrosoft}
                </div>
                <div className="w-full h-8 rounded-lg bg-g-blue text-white flex items-center justify-center text-xs font-bold">
                  {c.botaoIdentificar}
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                {c.avisoLgpd}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Badge superior</Label>
              <Input
                value={c.badge}
                onChange={(e) => onChange({ badge: e.target.value })}
                className="text-xs"
                placeholder="Acesso Seguro"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Título principal</Label>
              <Input
                value={c.titulo}
                onChange={(e) => onChange({ titulo: e.target.value })}
                className="text-xs"
                placeholder="Entrar no Sistema"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-bold">Subtítulo explicativo</Label>
              <Input
                value={c.subtitulo}
                onChange={(e) => onChange({ subtitulo: e.target.value })}
                className="text-xs"
                placeholder="Identifique-se com sua conta Google, Microsoft ou informe seu e-mail/WhatsApp..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Rótulo do Botão Google</Label>
              <Input
                value={c.botaoGoogle}
                onChange={(e) => onChange({ botaoGoogle: e.target.value })}
                className="text-xs"
                placeholder="Continuar com Google"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Rótulo do Botão Microsoft</Label>
              <Input
                value={c.botaoMicrosoft}
                onChange={(e) => onChange({ botaoMicrosoft: e.target.value })}
                className="text-xs"
                placeholder="Continuar com Microsoft"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Rótulo do Botão de Identificação Direta</Label>
              <Input
                value={c.botaoIdentificar}
                onChange={(e) => onChange({ botaoIdentificar: e.target.value })}
                className="text-xs"
                placeholder="Acessar meus chamados"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-bold">Aviso LGPD no rodapé da autenticação</Label>
              <Textarea
                rows={2}
                value={c.avisoLgpd}
                onChange={(e) => onChange({ avisoLgpd: e.target.value })}
                className="text-xs"
                placeholder="Ao entrar, você concorda com os termos da LGPD..."
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
