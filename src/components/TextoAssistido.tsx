import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { revisarTexto } from "@/lib/revisar-texto.functions";

export function TextoAssistido({ value, onChange, rows = 5 }: { value: string; onChange: (value: string) => void; rows?: number }) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  async function revisar() {
    setLoading(true);
    try { setSuggestion(await revisarTexto({ data: { texto: value, modo: "revisao" } })); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível revisar o texto."); }
    finally { setLoading(false); }
  }
  return <div className="space-y-2">
    <Textarea rows={rows} value={value} onChange={e => { onChange(e.target.value); setSuggestion(null); }} />
    <Button type="button" size="sm" variant="outline" disabled={loading || value.trim().length < 10} onClick={revisar}><Sparkles /> {loading ? "Aguarde…" : "Aprimorar texto com IA"}</Button>
    {suggestion && <div className="rounded-xl border border-g-blue bg-muted p-4 text-sm"><p className="font-semibold">Sugestão de texto</p><p className="mt-2 whitespace-pre-wrap">{suggestion}</p><div className="mt-3 flex gap-2"><Button type="button" size="sm" onClick={() => { onChange(suggestion); setSuggestion(null); }}>Usar sugestão</Button><Button type="button" size="sm" variant="ghost" onClick={() => setSuggestion(null)}>Descartar</Button></div></div>}
  </div>;
}