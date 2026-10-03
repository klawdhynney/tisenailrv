import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { EmaLoader } from "@/components/EmaLoader";

export interface LoadingContextValue {
  /** Se alguma ação assíncrona está em execução (útil para desabilitar botões imediatamente). */
  isLoading: boolean;
  /** Se o loader visual da ema está sendo exibido na tela (após o delay de 300ms). */
  isShowing: boolean;
  /** Texto atual exibido no loader. */
  texto?: string;
  /**
   * Inicia manualmente uma ação com loading.
   * Retorna uma função que deve ser chamada para finalizar o loading.
   */
  startLoading: (customText?: string) => () => void;
  /**
   * Executa uma função assíncrona garantindo o delay de 300ms e duração mínima de 500ms caso apareça.
   * Recebe um AbortSignal opcional que é cancelado se o usuário sair ou a ação expirar.
   */
  wrapAsync: <T>(
    fn: (signal?: AbortSignal) => Promise<T>,
    options?: { text?: string; abortable?: boolean }
  ) => Promise<T>;
  /**
   * Zera e remove imediatamente qualquer animação ou trava de carregamento na tela.
   * Chamado automaticamente ao cancelar, voltar ou trocar de rota.
   */
  resetLoading: () => void;
  /** Retorna o sinal de aborto da ação em andamento (se houver). */
  getSignal: () => AbortSignal | undefined;
}

const LoadingContext = createContext<LoadingContextValue | null>(null);

const DELAY_EXIBICAO_MS = 300;
const DURACAO_MINIMA_MS = 500;
const TIMEOUT_SEGURANCA_MS = 15000; // 15 segundos de segurança máxima

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [activeCount, setActiveCount] = useState(0);
  const [isShowing, setIsShowing] = useState(false);
  const [customTexto, setCustomTexto] = useState<string | undefined>(undefined);

  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleStartTimeRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isShowingRef = useRef(false);
  isShowingRef.current = isShowing;

  // Monitora transições de rota do TanStack Router
  const routerState = useRouterState();
  const isNavigating = routerState.status === "pending";
  const currentPath = routerState.location.pathname;
  const previousPathRef = useRef(currentPath);

  // Função para zerar tudo imediatamente (sem esperar 500ms)
  const resetLoading = useCallback(() => {
    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
    if (minDurationTimerRef.current) {
      clearTimeout(minDurationTimerRef.current);
      minDurationTimerRef.current = null;
    }
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    visibleStartTimeRef.current = null;
    setIsShowing(false);
    setActiveCount(0);
    setCustomTexto(undefined);
  }, []);

  // Proteção: botão voltar do navegador / celular (popstate) e restauração de cache (pageshow)
  useEffect(() => {
    const handlePopState = () => {
      // Ao voltar no navegador ou celular, limpa imediatamente qualquer loading preso
      resetLoading();
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      // Se a página foi restaurada do bfcache, zera o loading
      if (event.persisted) {
        resetLoading();
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [resetLoading]);

  // Ao trocar de rota concluída, se a rota anterior mudou, zera qualquer loading pendente
  useEffect(() => {
    if (previousPathRef.current !== currentPath) {
      previousPathRef.current = currentPath;
      resetLoading();
    }
  }, [currentPath, resetLoading]);

  const stopRequest = useCallback(() => {
    setActiveCount((prev) => {
      const next = Math.max(0, prev - 1);
      if (next === 0) {
        if (safetyTimeoutRef.current) {
          clearTimeout(safetyTimeoutRef.current);
          safetyTimeoutRef.current = null;
        }

        // Se ainda não apareceu na tela (menos de 300ms decorridos), cancela o timer
        if (delayTimerRef.current) {
          clearTimeout(delayTimerRef.current);
          delayTimerRef.current = null;
        }

        // Se já está visível na tela, cumpre a duração mínima de 500ms para suavidade
        if (isShowingRef.current && visibleStartTimeRef.current) {
          const decorrido = Date.now() - visibleStartTimeRef.current;
          const restante = Math.max(0, DURACAO_MINIMA_MS - decorrido);

          if (minDurationTimerRef.current) clearTimeout(minDurationTimerRef.current);
          minDurationTimerRef.current = setTimeout(() => {
            setIsShowing(false);
            visibleStartTimeRef.current = null;
            setCustomTexto(undefined);
            if (abortControllerRef.current) {
              abortControllerRef.current = null;
            }
          }, restante);
        } else {
          setIsShowing(false);
          visibleStartTimeRef.current = null;
          setCustomTexto(undefined);
          if (abortControllerRef.current) {
            abortControllerRef.current = null;
          }
        }
      }
      return next;
    });
  }, []);

  const startLoading = useCallback(
    (text?: string) => {
      if (text) setCustomTexto(text);

      setActiveCount((prev) => {
        if (prev === 0) {
          if (minDurationTimerRef.current) {
            clearTimeout(minDurationTimerRef.current);
            minDurationTimerRef.current = null;
          }

          abortControllerRef.current = new AbortController();

          // Timer de 300ms: só exibe se a ação demorar mais de 300ms
          delayTimerRef.current = setTimeout(() => {
            setIsShowing(true);
            visibleStartTimeRef.current = Date.now();
          }, DELAY_EXIBICAO_MS);

          // Timeout de segurança de 15 segundos: cancela e notifica o usuário
          if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
          safetyTimeoutRef.current = setTimeout(() => {
            console.warn("Loading safety timeout atingido (15s). Liberando interface.");
            resetLoading();
            toast.error(
              "A operação demorou mais que o esperado e foi cancelada com segurança. Verifique sua conexão e tente novamente."
            );
          }, TIMEOUT_SEGURANCA_MS);
        }
        return prev + 1;
      });

      let ended = false;
      return () => {
        if (!ended) {
          ended = true;
          stopRequest();
        }
      };
    },
    [stopRequest, resetLoading]
  );

  const wrapAsync = useCallback(
    async <T,>(
      fn: (signal?: AbortSignal) => Promise<T>,
      options?: { text?: string; abortable?: boolean }
    ): Promise<T> => {
      const end = startLoading(options?.text);
      const signal = abortControllerRef.current?.signal;
      try {
        return await fn(signal);
      } catch (err: unknown) {
        // Se foi abortado por navegação ou cancelamento, não dispara alerta falso
        if (err instanceof DOMException && err.name === "AbortError") {
          console.info("Ação cancelada pelo usuário.");
        }
        throw err;
      } finally {
        end();
      }
    },
    [startLoading]
  );

  // Integração com a navegação de páginas do TanStack Router
  const navEndRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (isNavigating) {
      if (!navEndRef.current) {
        navEndRef.current = startLoading("Carregando página...");
      }
    } else {
      if (navEndRef.current) {
        navEndRef.current();
        navEndRef.current = null;
      }
    }
  }, [isNavigating, startLoading]);

  // Limpeza ao desmontar
  useEffect(() => {
    return () => {
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
      if (minDurationTimerRef.current) clearTimeout(minDurationTimerRef.current);
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    };
  }, []);

  const value: LoadingContextValue = {
    isLoading: activeCount > 0,
    isShowing,
    texto: customTexto,
    startLoading,
    wrapAsync,
    resetLoading,
    getSignal: () => abortControllerRef.current?.signal,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {isShowing && <EmaLoader overlay texto={customTexto} />}
    </LoadingContext.Provider>
  );
}

export function useLoading(): LoadingContextValue {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error("useLoading deve ser utilizado dentro de um LoadingProvider");
  }
  return ctx;
}
