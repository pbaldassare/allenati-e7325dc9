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
    console.log("Starting create-subscription-payment function");

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
    if (userError || !userData.user?.email) {
      throw new Error("User not authenticated");
    }

    const user = userData.user;
    console.log("User authenticated:", user.id);

    // Parse request body
    const { planId, gymId } = await req.json();
    if (!planId || !gymId) {
      throw new Error("Missing planId or gymId");
    }

    console.log("Processing payment for plan:", planId, "gym:", gymId);

    // Get gym and subscription plan details
    const { data: gymData, error: gymError } = await supabaseClient
      .from("gyms")
      .select("stripe_connect_account_id, name")
      .eq("id", gymId)
      .single();

    if (gymError || !gymData) {
      throw new Error("Gym not found");
    }

    if (!gymData.stripe_connect_account_id) {
      throw new Error("Gym Stripe Connect account not configured");
    }

    const { data: planData, error: planError } = await supabaseClient
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .eq("gym_id", gymId)
      .single();

    if (planError || !planData) {
      throw new Error("Subscription plan not found");
    }

    console.log("Plan details:", planData);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check if customer exists for this gym's Stripe account
    const customers = await stripe.customers.list(
      { email: user.email, limit: 1 },
      { stripeAccount: gymData.stripe_connect_account_id }
    );

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Calculate application fee (2% platform commission)
    const applicationFeeAmount = Math.round(planData.price * 100 * 0.02); // 2% in cents

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `${planData.name} - ${gymData.name}`,
              description: planData.description || undefined,
            },
            unit_amount: Math.round(planData.price * 100), // Convert to cents
            recurring: planData.duration_months > 0 ? {
              interval: "month",
              interval_count: planData.duration_months,
            } : undefined,
          },
          quantity: 1,
        },
      ],
      mode: planData.duration_months > 0 ? "subscription" : "payment",
      success_url: `${req.headers.get("origin")}/subscriptions?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/subscriptions?cancelled=true`,
      payment_intent_data: planData.duration_months === 0 ? {
        application_fee_amount: applicationFeeAmount,
        on_behalf_of: gymData.stripe_connect_account_id,
      } : undefined,
      subscription_data: planData.duration_months > 0 ? {
        application_fee_percent: 2,
        on_behalf_of: gymData.stripe_connect_account_id,
      } : undefined,
      metadata: {
        user_id: user.id,
        plan_id: planId,
        gym_id: gymId,
      },
    }, {
      stripeAccount: gymData.stripe_connect_account_id,
    });

    console.log("Checkout session created:", session.id);

    // Log the payment initiation
    await supabaseClient
      .from("admin_action_logs")
      .insert({
        action: "subscription_payment_initiated",
        admin_id: user.id,
        target_type: "subscription_plan",
        target_id: planId,
        new_data: {
          session_id: session.id,
          gym_id: gymId,
          amount: planData.price,
          application_fee: applicationFeeAmount / 100,
        },
      });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in create-subscription-payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});