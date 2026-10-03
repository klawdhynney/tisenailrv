import { useState } from "react";
import { Sparkles, Check, RotateCcw } from "lucide-react";
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
  ocultarIa = false,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  ocultarIa?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [textoAprimorado, setTextoAprimorado] = useState<string | null>(null);
  const [edicaoTexto, setEdicaoTexto] = useState("");
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
    setErro(null);
    try {
      const res = await revisarTexto({ data: { texto: value } });
      const resultado = res.texto || res.versao1 || "";
      setTextoAprimorado(resultado);
      setEdicaoTexto(resultado);
      toast.success("Texto aprimorado com sucesso!");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Não foi possível aprimorar o texto.";
      setErro(msg);
      toast.error(msg);
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
          setTextoAprimorado(null);
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
      {!ocultarIa && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={loading || value.trim().length < 2}
            onClick={revisar}
            className="gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold shadow-xs hover:shadow-md transition-all duration-200 border-0 text-xs"
          >
            <Sparkles className="size-3.5" /> {loading ? "Aprimorando texto…" : "Aprimorar texto"}
          </Button>
          {erro && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={revisar}
              className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
            >
              <RotateCcw className="size-3" /> Tentar de novo
            </Button>
          )}
        </div>
      )}

      {textoAprimorado && (
        <div className="rounded-2xl border-2 border-g-blue/30 bg-card p-4 text-sm shadow-md space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-g-blue" />
              <span className="font-bold text-foreground">Texto aprimorado (editável antes de aplicar):</span>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => setTextoAprimorado(null)}>
              Descartar
            </Button>
          </div>

          <div className="space-y-2">
            <Textarea
              rows={4}
              value={edicaoTexto}
              onChange={(e) => setEdicaoTexto(e.target.value)}
              className="text-xs sm:text-sm bg-background/80 font-sans leading-relaxed"
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
              <Button
                type="button"
                size="sm"
                variant="google-blue"
                className="gap-1.5 text-xs font-bold"
                onClick={() => {
                  onChange(edicaoTexto);
                  setTextoAprimorado(null);
                  toast.success("Texto atualizado com sucesso!");
                }}
              >
                <Check className="size-3.5" /> Aplicar texto aprimorado
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}