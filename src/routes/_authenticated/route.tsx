import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { emailCorporativo, sessaoMicrosoft } from "@/lib/corporate";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user || !emailCorporativo(data.user.email) || !sessaoMicrosoft(data.user.app_metadata?.provider)) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AreaGestor,
});

function AreaGestor() {
  const { isGestor, authPronto, session } = useStore();
  if (!authPronto) return <p className="py-20 text-center text-muted-foreground">Verificando acesso…</p>;
  if (!isGestor)
    return (
      <div className="mx-auto max-w-lg rounded-2xl border-2 border-[var(--g-yellow)] bg-card p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-[var(--g-yellow)]" />
        <h1 className="mt-4 text-xl font-bold">Acesso restrito à equipe de TI</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sua conta ({session?.user.email}) ainda não tem permissão de gestor. Peça ao responsável pela TI para liberar seu acesso.
        </p>
      </div>
    );
  return <Outlet />;
}
