import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  isRedirect,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { StoreProvider } from "@/lib/store";
import { LoadingProvider } from "@/lib/loading-context";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { TEMA_INLINE_SCRIPT } from "@/lib/tema";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-4 py-16">
      <div className="max-w-md text-center space-y-4">
        <span className="inline-block rounded-2xl bg-primary/10 px-4 py-1 text-sm font-bold text-primary">
          Erro 404
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Página não encontrada
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          O endereço digitado não existe, foi alterado ou a página foi movida para outro local.
        </p>
        <div className="pt-4 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Voltar ao Início
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center rounded-xl border border-input bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
          >
            Página anterior
          </button>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  if (isRedirect(error)) {
    throw error;
  }
  console.error("[TanStackRootError]", error);
  const router = useRouter();

  console.error("[TanStack Root Error]", error?.stack || error);

  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
    console.error("[TanStack Root Error Boundary]", error?.stack || error);

    // Recuperação automática de erro de chunk desatualizado pós-deploy
    const isChunkError = /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(
      error?.message || ""
    );
    if (isChunkError && typeof window !== "undefined") {
      const recarregado = sessionStorage.getItem("chunk_reload_attempted");
      if (!recarregado) {
        sessionStorage.setItem("chunk_reload_attempted", "true");
        window.location.reload();
      }
    }
  }, [error]);

  const isChunk = /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(
    error?.message || ""
  );

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-4 py-16">
      <div className="max-w-md text-center space-y-4">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <span className="text-2xl font-bold">!</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {isChunk ? "Atualização disponível" : "Não foi possível carregar a página"}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isChunk
            ? "Uma nova versão do sistema foi publicada. Clique em recarregar para atualizar os arquivos em cache."
            : "Ocorreu uma instabilidade inesperada ao exibir esta tela. Você pode tentar novamente ou retornar ao início."}
        </p>
        <div className="pt-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (isChunk) {
                sessionStorage.removeItem("chunk_reload_attempted");
                window.location.reload();
              } else {
                router.invalidate();
                reset();
              }
            }}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            {isChunk ? "Recarregar página" : "Tentar novamente"}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-input bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
          >
            Página Inicial
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
         { title: "TI SENAI LRV" },
       { name: "description", content: "Abertura e acompanhamento de chamados de TI SENAI LRV." },
      { name: "author", content: "Lovable" },
         { property: "og:title", content: "TI SENAI LRV" },
       { property: "og:description", content: "Abertura e acompanhamento de chamados de TI SENAI LRV." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/capa.png?v=20261006_v6" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/capa.png?v=20261006_v6" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png?v=20261006_v6", type: "image/png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png?v=20261006_v6" },
      { rel: "manifest", href: "/manifest.json?v=20261006_v6" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: TEMA_INLINE_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <LoadingProvider>
          <AppShell>
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
          </AppShell>
          <Toaster richColors position="top-right" />
        </LoadingProvider>
      </StoreProvider>
    </QueryClientProvider>
  );
}
