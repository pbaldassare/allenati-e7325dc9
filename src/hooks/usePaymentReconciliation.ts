import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Reconciles Stripe payments completed in an external browser that never
 * triggered the success_url (common on Capacitor mobile apps).
 * Runs on mount, on window focus, and on visibility change.
 */
export function usePaymentReconciliation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const running = useRef(false);

  useEffect(() => {
    if (!user) return;

    const reconcile = async () => {
      if (running.current) return;
      running.current = true;
      try {
        const { data, error } = await supabase.functions.invoke(
          "reconcile-pending-payments"
        );
        if (error) {
          console.warn("reconcile-pending-payments error:", error);
          return;
        }
        if (data?.processed > 0) {
          toast({
            title: "Pagamento confermato",
            description:
              "Abbiamo attivato i tuoi acquisti recenti. Aggiornamento dei dati in corso.",
          });
          queryClient.invalidateQueries();
        }
      } catch (e) {
        console.warn("reconcile-pending-payments exception:", e);
      } finally {
        running.current = false;
      }
    };

    reconcile();

    const onFocus = () => reconcile();
    const onVisibility = () => {
      if (document.visibilityState === "visible") reconcile();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user, toast, queryClient]);
}
