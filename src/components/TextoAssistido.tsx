import { useState } from "react";
import { Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { revisarTexto } from "@/lib/revisar-texto.functions";

const vocabulario = [
  "computador",
  "impressora",
  "internet",
  "conexão",
  "rede",
  "sistema",
  "senha",
  "acesso",
  "monitor",
  "teclado",
  "mouse",
  "projetor",
  "toner",
  "WhatsApp",
  "laboratório",
  "sala",
  "bloco",
  "andar",
  "problema",
  "atendimento",
  "notebook",
  "Microsoft",
  "login",
];

export function TextoAssistido({
  value,
  onChange,
  rows = 5,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [sugestoes, setSugestoes] = useState<{ versao1: string; versao2: string } | null>(null);
  const [cursor, setCursor] = useState(value.length);
  const fragmento = value.slice(0, cursor).match(/(?:^|\s)([\p{L}]{3,})$/u)?.[1] ?? "";
  const palavras =
    fragmento.length >= 3
      ? vocabulario
          .filter(
            (p) =>
              p.toLocaleLowerCase("pt-BR").startsWith(fragmento.toLocaleLowerCase("pt-BR")) &&
              p.toLocaleLowerCase("pt-BR") !== fragmento.toLocaleLowerCase("pt-BR"),
          )
          .slice(0, 3)
      : [];

  async function revisar() {
    setLoading(true);
    try {
      const res = await revisarTexto({ data: { texto: value, modo: "revisao" } });
      setSugestoes(res);
      toast.info("A IA gerou 2 versões para você escolher.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível revisar o texto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        rows={rows}
        value={value}
        placeholder={placeholder}
        autoComplete="on"
        onClick={(e) => setCursor(e.currentTarget.selectionStart)}
        onKeyUp={(e) => setCursor(e.currentTarget.selectionStart)}
        onChange={(e) => {
          onChange(e.target.value);
          setCursor(e.target.selectionStart);
          setSugestoes(null);
        }}
      />
      {palavras.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Sugestões:</span>
          {palavras.map((p) => (
            <Button
              type="button"
              key={p}
              size="sm"
              variant="outline"
              onClick={() => {
                onChange(value.slice(0, cursor - fragmento.length) + p + " " + value.slice(cursor));
                setCursor(cursor - fragmento.length + p.length + 1);
              }}
            >
              {p}
            </Button>
          ))}
        </div>
      )}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={loading || value.trim().length < 5}
        onClick={revisar}
      >
        <Sparkles className="size-4" /> {loading ? "Gerando 2 versões com IA…" : "Aprimorar texto com IA (2 versões)"}
      </Button>

      {sugestoes && (
        <div className="rounded-2xl border-2 border-g-blue/30 bg-card p-4 text-sm shadow-md space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-g-blue" />
              <span className="font-bold text-foreground">Escolha uma das 2 versões aprimoradas pela IA:</span>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => setSugestoes(null)}>
              Descartar
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Versão 1 */}
            <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-muted/40 p-3.5 transition-all hover:border-g-blue hover:shadow-sm">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded-full bg-g-blue/15 px-2.5 py-0.5 text-xs font-bold text-g-blue">
                    Versão 1 · Formal & Direta
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-foreground/90">{sugestoes.versao1}</p>
              </div>
              <div className="mt-4 pt-2 border-t border-border/50">
                <Button
                  type="button"
                  size="sm"
                  variant="google-blue"
                  className="w-full gap-1.5"
                  onClick={() => {
                    onChange(sugestoes.versao1);
                    setSugestoes(null);
                    toast.success("Versão 1 aplicada com sucesso!");
                  }}
                >
                  <Check className="size-3.5" /> Usar Versão 1
                </Button>
              </div>
            </div>

            {/* Versão 2 */}
            <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-muted/40 p-3.5 transition-all hover:border-g-green hover:shadow-sm">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded-full bg-g-green/15 px-2.5 py-0.5 text-xs font-bold text-g-green">
                    Versão 2 · Técnica & Descritiva
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-foreground/90">{sugestoes.versao2}</p>
              </div>
              <div className="mt-4 pt-2 border-t border-border/50">
                <Button
                  type="button"
                  size="sm"
                  variant="google-green"
                  className="w-full gap-1.5"
                  onClick={() => {
                    onChange(sugestoes.versao2);
                    setSugestoes(null);
                    toast.success("Versão 2 aplicada com sucesso!");
                  }}
                >
                  <Check className="size-3.5" /> Usar Versão 2
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}