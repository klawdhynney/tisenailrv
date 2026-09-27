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
Os chamados e as regras de SLA ficam em `src/lib/store.tsx` (contexto React + localStorage, semente em `src/data/tickets.seed.json`); o cálculo de SLA fica isolado em `src/lib/sla.ts` para que planilha e dashboard usem exatamente a mesma regra.
