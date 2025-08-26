import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { gymId } = await req.json();
    
    if (!gymId) {
      throw new Error('Gym ID is required');
    }

    console.log('Generating login link for gym:', gymId);

    // Initialize Stripe with secret key
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Create Supabase admin client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get gym details
    const { data: gym, error: gymError } = await supabase
      .from('gyms')
      .select('name, stripe_connect_account_id, stripe_onboarding_complete')
      .eq('id', gymId)
      .single();

    if (gymError || !gym) {
      throw new Error('Gym not found');
    }

    if (!gym.stripe_connect_account_id) {
      throw new Error('No Stripe Connect account found for this gym');
    }

    if (!gym.stripe_onboarding_complete) {
      throw new Error('Onboarding must be completed before accessing the dashboard');
    }

    // Create login link for Stripe Express dashboard
    const loginLink = await stripe.accounts.createLoginLink(
      gym.stripe_connect_account_id
    );

    // Log the action
    const { data: { user } } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') || ''
    );

    if (user) {
      await supabase.from('admin_action_logs').insert({
        admin_user_id: user.id,
        action_type: 'stripe_login_link_generated',
        target_type: 'gym',
        target_id: gymId,
        details: {
          stripe_account_id: gym.stripe_connect_account_id,
          gym_name: gym.name
        }
      });
    }

    console.log('Successfully generated login link for account:', gym.stripe_connect_account_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: loginLink.url,
        message: 'Dashboard login link generated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-connect-login-link function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});