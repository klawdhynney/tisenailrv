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
   */
  wrapAsync: <T>(fn: () => Promise<T>, options?: { text?: string }) => Promise<T>;
}

const LoadingContext = createContext<LoadingContextValue | null>(null);

const DELAY_EXIBICAO_MS = 300;
const DURACAO_MINIMA_MS = 500;

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [activeCount, setActiveCount] = useState(0);
  const [isShowing, setIsShowing] = useState(false);
  const [customTexto, setCustomTexto] = useState<string | undefined>(undefined);

  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleStartTimeRef = useRef<number | null>(null);
  const isShowingRef = useRef(false);
  isShowingRef.current = isShowing;

  // Monitora transições de rota do TanStack Router
  const isNavigating = useRouterState({
    select: (s) => s.status === "pending",
  });

  const stopRequest = useCallback(() => {
    setActiveCount((prev) => {
      const next = Math.max(0, prev - 1);
      if (next === 0) {
        // Se ainda não apareceu na tela (menos de 300ms decorridos), cancela o timer
        if (delayTimerRef.current) {
          clearTimeout(delayTimerRef.current);
          delayTimerRef.current = null;
        }

        // Se já está visível na tela, garante os 500ms mínimos para não piscar
        if (isShowingRef.current && visibleStartTimeRef.current) {
          const decorrido = Date.now() - visibleStartTimeRef.current;
          const restante = Math.max(0, DURACAO_MINIMA_MS - decorrido);

          if (minDurationTimerRef.current) clearTimeout(minDurationTimerRef.current);
          minDurationTimerRef.current = setTimeout(() => {
            setIsShowing(false);
            visibleStartTimeRef.current = null;
            setCustomTexto(undefined);
          }, restante);
        } else {
          setIsShowing(false);
          visibleStartTimeRef.current = null;
          setCustomTexto(undefined);
        }
      }
      return next;
    });
  }, []);

  const startLoading = useCallback((text?: string) => {
    if (text) setCustomTexto(text);

    setActiveCount((prev) => {
      if (prev === 0) {
        if (minDurationTimerRef.current) {
          clearTimeout(minDurationTimerRef.current);
          minDurationTimerRef.current = null;
        }

        // Timer de 300ms: só exibe se a ação ultrapassar este limite
        delayTimerRef.current = setTimeout(() => {
          setIsShowing(true);
          visibleStartTimeRef.current = Date.now();
        }, DELAY_EXIBICAO_MS);
      }
      return prev + 1;
    });

    // Failsafe de segurança: em caso de exceção não tratada, encerra o loading após 18s
    const failsafe = setTimeout(() => {
      stopRequest();
    }, 18000);

    let ended = false;
    return () => {
      if (!ended) {
        ended = true;
        clearTimeout(failsafe);
        stopRequest();
      }
    };
  }, [stopRequest]);

  const wrapAsync = useCallback(
    async <T,>(fn: () => Promise<T>, options?: { text?: string }): Promise<T> => {
      const end = startLoading(options?.text);
      try {
        return await fn();
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
    };
  }, []);

  const value: LoadingContextValue = {
    isLoading: activeCount > 0,
    isShowing,
    texto: customTexto,
    startLoading,
    wrapAsync,
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
