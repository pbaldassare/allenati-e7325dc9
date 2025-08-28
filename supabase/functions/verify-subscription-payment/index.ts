import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

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

    // Get gym's Stripe Connect account
    const { data: gymData, error: gymError } = await supabaseClient
      .from("gyms")
      .select("stripe_connect_account_id, name")
      .eq("id", gymId)
      .single();

    if (gymError || !gymData?.stripe_connect_account_id) {
      throw new Error("Gym Stripe account not found");
    }

    // Retrieve session from the gym's Stripe account
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      stripeAccount: gymData.stripe_connect_account_id,
    });

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

    // Payment was successful, process the subscription/credits
    const { user_id, plan_id, gym_id, credits_amount } = session.metadata || {};

    if (user_id !== user.id) {
      throw new Error("Session user mismatch");
    }

    if (plan_id) {
      // This is a subscription payment
      console.log("Processing subscription for plan:", plan_id);

      // Get plan details
      const { data: planData } = await supabaseClient
        .from("subscription_plans")
        .select("*")
        .eq("id", plan_id)
        .single();

      if (planData) {
        // Cancel any existing active subscriptions for this gym
        await supabaseClient
          .from("user_subscriptions")
          .update({ status: "cancelled" })
          .eq("user_id", user.id)
          .eq("gym_id", gym_id)
          .eq("status", "active");

        // Create new subscription
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + planData.duration_months);

        await supabaseClient
          .from("user_subscriptions")
          .insert({
            user_id: user.id,
            plan_id: plan_id,
            gym_id: gym_id,
            status: "active",
            expires_at: expiresAt.toISOString(),
          });

        // Add included credits if any
        if (planData.credits_included > 0) {
          await supabaseClient
            .from("credits_transactions")
            .insert({
              user_id: user.id,
              gym_id: gym_id,
              amount: planData.credits_included,
              balance_after: planData.credits_included, // Will be updated by trigger
              transaction_type: "subscription",
              description: `Crediti inclusi nell'abbonamento ${planData.name}`,
            });
        }
      }
    } else if (credits_amount) {
      // This is a credits payment
      const creditsNum = parseInt(credits_amount);
      console.log("Processing credits purchase:", creditsNum);

      await supabaseClient
        .from("credits_transactions")
        .insert({
          user_id: user.id,
          gym_id: gym_id,
          amount: creditsNum,
          balance_after: creditsNum, // Will be updated by trigger
          transaction_type: "purchase",
          description: `Acquisto di ${creditsNum} crediti`,
        });
    }

    // Log successful completion
    await supabaseClient
      .from("admin_action_logs")
      .insert({
        action: "payment_completed",
        admin_id: user.id,
        target_type: plan_id ? "subscription" : "credits",
        target_id: plan_id || gym_id,
        new_data: {
          session_id: sessionId,
          gym_id: gym_id,
          completed_at: new Date().toISOString(),
        },
      });

    return new Response(
      JSON.stringify({ 
        paid: true, 
        processed: true,
        type: plan_id ? "subscription" : "credits"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in verify-subscription-payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});