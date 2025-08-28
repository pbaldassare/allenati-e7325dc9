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
    console.log("Starting create-credits-payment function");

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
    const { creditsAmount, gymId, pricePerCredit = 5 } = await req.json();
    if (!creditsAmount || !gymId || creditsAmount <= 0) {
      throw new Error("Missing or invalid creditsAmount or gymId");
    }

    console.log("Processing credits purchase:", creditsAmount, "for gym:", gymId);

    // Get gym details
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

    console.log("Gym details:", gymData);

    // Calculate total price
    const totalPrice = creditsAmount * pricePerCredit;
    const applicationFeeAmount = Math.round(totalPrice * 100 * 0.02); // 2% platform commission in cents

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

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `${creditsAmount} Crediti - ${gymData.name}`,
              description: `Acquisto di ${creditsAmount} crediti per ${gymData.name}`,
            },
            unit_amount: Math.round(totalPrice * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/shop?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/shop?cancelled=true`,
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        on_behalf_of: gymData.stripe_connect_account_id,
      },
      metadata: {
        user_id: user.id,
        gym_id: gymId,
        credits_amount: creditsAmount.toString(),
        price_per_credit: pricePerCredit.toString(),
      },
    }, {
      stripeAccount: gymData.stripe_connect_account_id,
    });

    console.log("Checkout session created:", session.id);

    // Log the payment initiation
    await supabaseClient
      .from("admin_action_logs")
      .insert({
        action: "credits_payment_initiated",
        admin_id: user.id,
        target_type: "gym_credits",
        target_id: gymId,
        new_data: {
          session_id: session.id,
          gym_id: gymId,
          credits_amount: creditsAmount,
          total_price: totalPrice,
          application_fee: applicationFeeAmount / 100,
        },
      });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in create-credits-payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});