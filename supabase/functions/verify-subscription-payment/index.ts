import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting verify-subscription-payment function");

    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }

    const user = userData.user;
    console.log("User authenticated:", user.id);

    // Parse request body
    const { sessionId } = await req.json();
    if (!sessionId) {
      throw new Error("Missing sessionId");
    }

    console.log("Verifying payment for session:", sessionId);

    // We need to find which gym's Stripe account this session belongs to
    // First, try to retrieve the session from admin logs
    const { data: logData } = await supabaseClient
      .from("admin_action_logs")
      .select("new_data")
      .eq("new_data->>session_id", sessionId)
      .in("action", ["subscription_payment_initiated", "credits_payment_initiated"])
      .single();

    if (!logData?.new_data?.gym_id) {
      throw new Error("Payment session not found in logs");
    }

    const gymId = logData.new_data.gym_id;

    // Get gym's Stripe credentials
    const { data: gymData, error: gymError } = await supabaseClient
      .from("gyms")
      .select("stripe_secret_key, name, stripe_credentials_configured")
      .eq("id", gymId)
      .single();

    if (gymError || !gymData?.stripe_secret_key || !gymData.stripe_credentials_configured) {
      throw new Error("Gym Stripe credentials not found");
    }

    // Initialize Stripe with gym's secret key
    const stripe = new Stripe(gymData.stripe_secret_key, {
      apiVersion: "2023-10-16",
    });

    // Retrieve session from the gym's Stripe account
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    console.log("Session status:", session.payment_status);

    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ paid: false, status: session.payment_status }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const { user_id, plan_id, gym_id, credits_amount } = session.metadata || {};

    if (user_id !== user.id) {
      throw new Error("Session user mismatch");
    }

    const paymentIntent = session.payment_intent as string | null;
    if (!paymentIntent) throw new Error("Missing payment intent");

    const { data: finalized, error: finalizeError } = await supabaseClient.rpc(
      "finalize_stripe_payment",
      {
        _user_id: user.id,
        _gym_id: gym_id,
        _plan_id: plan_id || null,
        _credits_amount: credits_amount ? parseInt(credits_amount, 10) : null,
        _amount: (session.amount_total ?? 0) / 100,
        _currency: session.currency?.toUpperCase() || "EUR",
        _payment_intent: paymentIntent,
        _session_id: sessionId,
        _reconciled: false,
      }
    );

    if (finalizeError) throw finalizeError;

    return jsonResponse(finalized as Record<string, unknown>);

  } catch (error) {
    console.error("Error in verify-subscription-payment:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});