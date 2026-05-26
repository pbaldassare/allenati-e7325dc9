import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Reconcile Stripe payments that completed in an external browser but never
// hit the success_url (typical on Capacitor mobile apps). For the current
// user, find all "*_payment_initiated" sessions in admin_action_logs that
// have NO matching "payment_completed" row, then process the paid ones.
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Not authenticated");
    const user = userData.user;

    // Last 7 days of initiated payments for this user
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: initiated } = await supabase
      .from("admin_action_logs")
      .select("new_data, created_at, action")
      .eq("admin_id", user.id)
      .in("action", ["subscription_payment_initiated", "credits_payment_initiated"])
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!initiated || initiated.length === 0) {
      return new Response(JSON.stringify({ processed: 0, results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessionIds = initiated
      .map((r: any) => r.new_data?.session_id)
      .filter(Boolean) as string[];

    // Find which ones are already completed
    const { data: completed } = await supabase
      .from("admin_action_logs")
      .select("new_data")
      .eq("action", "payment_completed")
      .eq("admin_id", user.id)
      .in("new_data->>session_id", sessionIds);

    const completedSet = new Set(
      (completed ?? []).map((r: any) => r.new_data?.session_id).filter(Boolean)
    );

    const pending = initiated.filter(
      (r: any) => r.new_data?.session_id && !completedSet.has(r.new_data.session_id)
    );

    const results: any[] = [];

    for (const row of pending) {
      const sessionId = row.new_data.session_id as string;
      const gymId = row.new_data.gym_id as string;
      try {
        const { data: gymData } = await supabase
          .from("gyms")
          .select("stripe_secret_key, stripe_credentials_configured")
          .eq("id", gymId)
          .single();

        if (!gymData?.stripe_secret_key || !gymData.stripe_credentials_configured) {
          results.push({ sessionId, skipped: "no_stripe_credentials" });
          continue;
        }

        const stripe = new Stripe(gymData.stripe_secret_key, {
          apiVersion: "2023-10-16",
        });

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== "paid") {
          results.push({ sessionId, status: session.payment_status, processed: false });
          continue;
        }

        const paymentIntent = session.payment_intent as string | null;
        if (!paymentIntent) {
          results.push({ sessionId, skipped: "no_payment_intent" });
          continue;
        }

        const { user_id, plan_id, gym_id, credits_amount } = session.metadata || {};
        if (user_id !== user.id) {
          results.push({ sessionId, skipped: "user_mismatch" });
          continue;
        }

        const { data: finalized, error: finalizeErr } = await supabase.rpc(
          "finalize_stripe_payment",
          {
            _user_id: user.id,
            _gym_id: gym_id,
            _plan_id: plan_id || null,
            _credits_amount: credits_amount ? parseInt(credits_amount as string, 10) : null,
            _amount: (session.amount_total ?? 0) / 100,
            _currency: session.currency?.toUpperCase() || "EUR",
            _payment_intent: paymentIntent,
            _session_id: sessionId,
            _reconciled: true,
          }
        );

        if (finalizeErr) throw finalizeErr;

        results.push({ sessionId, processed: true, result: finalized });
      } catch (e) {
        console.error("Reconcile error for session", sessionId, e);
        results.push({ sessionId, error: (e as Error).message });
      }
    }

    return new Response(
      JSON.stringify({
        processed: results.filter((r) => r.processed).length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("reconcile-pending-payments error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
