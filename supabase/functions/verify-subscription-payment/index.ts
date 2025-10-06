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

    // Payment was successful, process the subscription/credits
    const { user_id, plan_id, gym_id, credits_amount } = session.metadata || {};

    if (user_id !== user.id) {
      throw new Error("Session user mismatch");
    }

    let paymentId: string | null = null;
    let subscriptionId: string | null = null;

    // First, create payment record for complete history
    const { data: paymentData, error: paymentError } = await supabaseClient
      .from("payments")
      .insert({
        user_id: user.id,
        amount: session.amount_total / 100, // Convert from cents
        currency: session.currency?.toUpperCase() || "EUR",
        status: "completed",
        payment_method: "stripe",
        transaction_id: session.payment_intent as string,
        reference_type: plan_id ? "subscription" : "credits",
        reference_id: plan_id || gym_id,
        processed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (paymentError) {
      console.error("Error creating payment record:", paymentError);
    } else {
      paymentId = paymentData.id;
      console.log("Payment record created:", paymentId);
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
        // Calculate subscription dates based on plan duration
        const startsAt = new Date();
        const expiresAt = new Date();
        
        // Calculate expiry date correctly
        if (planData.duration_months > 0) {
          // Use months for precise date calculation
          expiresAt.setMonth(expiresAt.getMonth() + planData.duration_months);
        } else if (planData.duration_days > 0) {
          // Use days as fallback
          expiresAt.setDate(expiresAt.getDate() + planData.duration_days);
        } else {
          // Default to 30 days if no duration specified
          expiresAt.setDate(expiresAt.getDate() + 30);
        }
        
        console.log("Subscription dates:", {
          starts_at: startsAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          duration_months: planData.duration_months,
          duration_days: planData.duration_days,
        });

        // Create new subscription without canceling existing ones
        const { data: subscriptionData } = await supabaseClient
          .from("user_subscriptions")
          .insert({
            user_id: user.id,
            plan_id: plan_id,
            gym_id: gym_id,
            status: "active",
            starts_at: startsAt.toISOString(),
            expires_at: expiresAt.toISOString(),
            activated_at: startsAt.toISOString(),
          })
          .select("id")
          .single();

        if (subscriptionData) {
          subscriptionId = subscriptionData.id;
          
          // Update payment record with subscription reference
          if (paymentId) {
            await supabaseClient
              .from("payments")
              .update({ reference_id: subscriptionId })
              .eq("id", paymentId);
          }
        }

        // Add included credits if any (ONLY if credits > 0)
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
              reference_id: subscriptionId, // Link to subscription
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
          reference_id: paymentId, // Link to payment
        });
    }

    // Log successful completion with more details
    await supabaseClient
      .from("admin_action_logs")
      .insert({
        action: "payment_completed",
        admin_id: user.id,
        target_type: plan_id ? "subscription" : "credits",
        target_id: subscriptionId || paymentId || gym_id,
        new_data: {
          session_id: sessionId,
          payment_id: paymentId,
          subscription_id: subscriptionId,
          gym_id: gym_id,
          amount: session.amount_total / 100,
          currency: session.currency?.toUpperCase() || "EUR",
          stripe_payment_intent: session.payment_intent,
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
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});