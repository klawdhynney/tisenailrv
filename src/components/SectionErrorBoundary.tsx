import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { reportLovableError } from "@/lib/lovable-error-reporting";

interface Props {
  title?: string;
  fallbackMessage?: string;
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[SectionErrorBoundary:${this.props.title || "DashboardSection"}]`, error, errorInfo);
    reportLovableError(error, {
      boundary: this.props.title || "DashboardSection",
      componentStack: errorInfo.componentStack,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-amber-500/40 bg-amber-500/5 my-4">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 px-5 text-center sm:text-left">
            <div className="flex items-center gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  {this.props.title || "Não foi possível exibir esta seção"}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {this.props.fallbackMessage ||
                    "Ocorreu uma instabilidade pontual ao carregar os dados deste componente. O restante do dashboard continua disponível."}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={this.handleReset}
              className="gap-2 shrink-0 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 text-xs font-semibold"
            >
              <RotateCcw className="size-3.5" />
              Recarregar seção
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
