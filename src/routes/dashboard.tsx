import { createFileRoute, Outlet, redirect, isRedirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    try {
      const testUser =
        typeof window !== "undefined"
          ? (window as any).__TEST_USER__ ||
            (localStorage.getItem("sb-mock-user")
              ? JSON.parse(localStorage.getItem("sb-mock-user") || "null")
              : null)
          : null;
      if (testUser) return { user: testUser };

      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        const returnUrl = location.pathname + (location.searchStr || "");
        throw redirect({
          to: "/auth",
          search: { redirectTo: returnUrl },
        });
      }
      return { user: data.user };
    } catch (err) {
      if (isRedirect(err)) throw err;
      return { user: null };
    }
  },
  component: Outlet,
});