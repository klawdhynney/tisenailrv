import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

export interface LoadingContextValue {
  /** Se alguma ação assíncrona está em execução (desabilita botões imediatamente). */
  isLoading: boolean;
  /** Compatibilidade: sem overlay de carregamento. */
  isShowing: boolean;
  /** Texto atual (se houver). */
  texto?: string;
  /** Inicia manualmente uma ação com loading instantâneo. */
  startLoading: (customText?: string) => () => void;
  /** Executa uma função assíncrona instantaneamente sem esperas artificiais. */
  wrapAsync: <T>(
    fn: (signal?: AbortSignal) => Promise<T>,
    options?: { text?: string; abortable?: boolean }
  ) => Promise<T>;
  /** Zera o estado de carregamento imediatamente. */
  resetLoading: () => void;
  /** Retorna sinal de aborto opcional. */
  getSignal: () => AbortSignal | undefined;
}

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [activeCount, setActiveCount] = useState(0);
  const [customTexto, setCustomTexto] = useState<string | undefined>(undefined);

  const resetLoading = useCallback(() => {
    setActiveCount(0);
    setCustomTexto(undefined);
  }, []);

  const startLoading = useCallback((text?: string) => {
    if (text) setCustomTexto(text);
    setActiveCount((prev) => prev + 1);
    let ended = false;
    return () => {
      if (!ended) {
        ended = true;
        setActiveCount((prev) => Math.max(0, prev - 1));
      }
    };
  }, []);

  const wrapAsync = useCallback(
    async <T,>(
      fn: (signal?: AbortSignal) => Promise<T>,
      options?: { text?: string; abortable?: boolean }
    ): Promise<T> => {
      const end = startLoading(options?.text);
      try {
        return await fn();
      } finally {
        end();
      }
    },
    [startLoading]
  );

  const value: LoadingContextValue = {
    isLoading: activeCount > 0,
    isShowing: false,
    texto: customTexto,
    startLoading,
    wrapAsync,
    resetLoading,
    getSignal: () => undefined,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
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
