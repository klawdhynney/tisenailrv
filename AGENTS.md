<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Dados dos chamados
Os chamados e regras ficam no Lovable Cloud via `store.tsx`; o SLA e relógio de segundos úteis ficam em `sla.ts` para usar a mesma regra.
O dashboard público lê agregados de `ticket_public_stats` e somente id, abertura, categoria, prioridade, status e fechamento pela função `public_ticket_progress`; nunca consulta registros privados completos no navegador público, para proteger dados pessoais.
Importações Excel são validadas no navegador e gravadas por função autenticada com verificação de gestor; a comparação de data, hora, solicitante, setor e descrição evita duplicados sem descartar uma linha só porque seu número coincide com outro chamado.
Chamados públicos exigem e-mail válido e entram com prioridade Média; a abertura retorna ID por `open_public_ticket_with_receipt` sem leitura anônima. Solicitantes veem/complementam somente após entrar com Google/Microsoft e e-mail confirmado; gestão exige papel autorizado no banco.
A planilha completa é exclusiva do gestor; no painel público a planilha de acompanhamento expõe apenas campos sem identificação pessoal, pois descrições, nomes e contatos podem conter dados privados.
O atendimento e a planilha do gestor compartilham `TicketSheet`, e alterações são salvas em uma página individual somente após confirmação; regras usam rascunho e confirmação antes de gravar para evitar edições acidentais.
As exportações de dashboard e planilha são geradas no navegador; dados detalhados só entram nos arquivos após a autorização do gestor, evitando criar cópias públicas no servidor.
`useStore`/contexto ficam separados do `StoreProvider`, e utilitários em `types.ts`, para evitar tela em branco após atualizações.
Temas `claro`, `pastel`, `escuro` usam `tema-ti` e classes exclusivas `.pastel`/`.dark` na raiz, para preservar a preferência e a paleta Google.
O WhatsApp só abre resumo preenchido depois do registro; dados pessoais lembrados ficam apenas no navegador com consentimento, sem guardar descrições.
Sempre que o usuário solicitar qualquer alteração, após validar o build (`bun run build`), faça o commit e o envio (`git push origin main`) para manter o repositório do GitHub e Lovable sincronizados automaticamente.
