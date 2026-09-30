import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { revisarTexto } from "@/lib/revisar-texto.functions";

const vocabulario = ["computador", "impressora", "internet", "conexão", "rede", "sistema", "senha", "acesso", "monitor", "teclado", "mouse", "projetor", "toner", "WhatsApp", "laboratório", "sala", "bloco", "andar", "problema", "atendimento", "notebook", "Microsoft", "login"];

export function TextoAssistido({ value, onChange, rows = 5, placeholder }: { value: string; onChange: (value: string) => void; rows?: number; placeholder?: string }) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [cursor, setCursor] = useState(value.length);
  const fragmento = value.slice(0, cursor).match(/(?:^|\s)([\p{L}]{3,})$/u)?.[1] ?? "";
  const palavras = fragmento.length >= 3 ? vocabulario.filter(p => p.toLocaleLowerCase("pt-BR").startsWith(fragmento.toLocaleLowerCase("pt-BR")) && p.toLocaleLowerCase("pt-BR") !== fragmento.toLocaleLowerCase("pt-BR")).slice(0, 3) : [];
  async function revisar() {
    setLoading(true);
    try { setSuggestion(await revisarTexto({ data: { texto: value, modo: "revisao" } })); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível revisar o texto."); }
    finally { setLoading(false); }
  }
  return <div className="space-y-2">
    <Textarea rows={rows} value={value} placeholder={placeholder} autoComplete="on" onClick={e => setCursor(e.currentTarget.selectionStart)} onKeyUp={e => setCursor(e.currentTarget.selectionStart)} onChange={e => { onChange(e.target.value); setCursor(e.target.selectionStart); setSuggestion(null); }} />
    {palavras.length > 0 && <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>Sugestões:</span>{palavras.map(p => <Button type="button" key={p} size="sm" variant="outline" onClick={() => { onChange(value.slice(0, cursor - fragmento.length) + p + " " + value.slice(cursor)); setCursor(cursor - fragmento.length + p.length + 1); }}>{p}</Button>)}</div>}
    <Button type="button" size="sm" variant="outline" disabled={loading || value.trim().length < 10} onClick={revisar}><Sparkles /> {loading ? "Aguarde…" : "Aprimorar texto com IA"}</Button>
    {suggestion && <div className="rounded-xl border border-g-blue bg-muted p-4 text-sm"><p className="font-semibold">Sugestão de texto</p><p className="mt-2 whitespace-pre-wrap">{suggestion}</p><div className="mt-3 flex gap-2"><Button type="button" size="sm" onClick={() => { onChange(suggestion); setSuggestion(null); }}>Usar sugestão</Button><Button type="button" size="sm" variant="ghost" onClick={() => setSuggestion(null)}>Descartar</Button></div></div>}
  </div>;
}