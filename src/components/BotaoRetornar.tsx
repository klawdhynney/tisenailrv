import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BotaoRetornar({ className }: { className?: string }) {
  const navigate = useNavigate();

  const handleRetornar = () => {
    if (typeof window !== "undefined") {
      const temHistorico =
        (window.history.state && typeof window.history.state.idx === "number" && window.history.state.idx > 0) ||
        (window.history.length > 1 && document.referrer && document.referrer.includes(window.location.host));

      if (temHistorico) {
        window.history.back();
        return;
      }
    }
    navigate({ to: "/" });
  };

  return (
    <div className={`mt-10 mb-2 w-full flex items-center justify-start ${className || ""}`}>
      <Button
        type="button"
        variant="outline"
        onClick={handleRetornar}
        className="w-full sm:w-auto min-h-[48px] h-12 px-6 rounded-2xl font-bold text-sm sm:text-base border-2 border-border/80 hover:border-g-blue/60 bg-card hover:bg-muted/40 transition-all flex items-center justify-center gap-2.5 shadow-xs"
        aria-label="Retornar à página anterior"
      >
        <ArrowLeft className="size-4.5 text-g-blue shrink-0" />
        <span>Retornar</span>
      </Button>
    </div>
  );
}
