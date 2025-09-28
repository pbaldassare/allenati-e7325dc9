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
      .select("stripe_secret_key, stripe_publishable_key, name, stripe_credentials_configured")
      .eq("id", gymId)
      .single();

    if (gymError || !gymData) {
      throw new Error("Gym not found");
    }

    if (!gymData.stripe_credentials_configured || !gymData.stripe_secret_key) {
      throw new Error("Gym Stripe credentials not configured");
    }

    console.log("Gym details:", gymData);

    // Calculate total price
    const totalPrice = creditsAmount * pricePerCredit;

    // Initialize Stripe with gym's secret key
    const stripe = new Stripe(gymData.stripe_secret_key, {
      apiVersion: "2023-10-16",
    });

    // Check if customer exists for this gym's Stripe account
    const customers = await stripe.customers.list({
      email: user.email, 
      limit: 1 
    });

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create checkout session (no application fees for independent accounts)
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
      metadata: {
        user_id: user.id,
        gym_id: gymId,
        credits_amount: creditsAmount.toString(),
        price_per_credit: pricePerCredit.toString(),
      },
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
        },
      });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in create-credits-payment:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});