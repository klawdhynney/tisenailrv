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
O dashboard público lê apenas totais agrupados da tabela `ticket_public_stats`, não os registros privados de `tickets`, para proteger dados pessoais.
Importações Excel são validadas no navegador e gravadas por função autenticada com verificação de gestor, preservando IDs existentes e ignorando duplicados.
