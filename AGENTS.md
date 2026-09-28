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
Os chamados e as regras de SLA ficam no Lovable Cloud, acessados em `src/lib/store.tsx`; o cálculo de SLA fica isolado em `src/lib/sla.ts` para a planilha do gestor usar a mesma regra.
O dashboard público lê agregados de `ticket_public_stats` e somente id, abertura, categoria, prioridade, status e fechamento pela função `public_ticket_progress`; nunca consulta registros privados completos no navegador público, para proteger dados pessoais.
Importações Excel são validadas no navegador e gravadas por função autenticada com verificação de gestor; a comparação de data, hora, solicitante, setor e descrição evita duplicados sem descartar uma linha só porque seu número coincide com outro chamado.
Chamados públicos podem ser abertos sem login, mas exigem e-mail válido e entram com prioridade Média; o solicitante só vê e complementa os próprios chamados após confirmar esse e-mail por código ou usar conta Google/Microsoft com o mesmo e-mail confirmado, enquanto a gestão completa exige conta gestora autorizada e papel no banco.
A planilha completa é exclusiva do gestor; no painel público a planilha de acompanhamento expõe apenas campos sem identificação pessoal, pois descrições, nomes e contatos podem conter dados privados.
O atendimento e a planilha do gestor compartilham `TicketSheet`, e alterações são salvas em uma página individual somente após confirmação; regras usam rascunho e confirmação antes de gravar para evitar edições acidentais.
As exportações de dashboard e planilha são geradas no navegador; dados detalhados só entram nos arquivos após a autorização do gestor, evitando criar cópias públicas no servidor.
O contexto e o hook `useStore` ficam em módulo separado do `StoreProvider`, e utilitários de chamados ficam em `types.ts`, para atualizações da interface não substituírem o contexto em uso e deixarem a página em branco.
