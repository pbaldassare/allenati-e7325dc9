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

    console.log('Generating onboarding link for gym:', gymId);

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

    if (gym.stripe_onboarding_complete) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Onboarding already completed for this gym'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: gym.stripe_connect_account_id,
      refresh_url: `${req.headers.get('origin')}/owner/dashboard?refresh=stripe`,
      return_url: `${req.headers.get('origin')}/owner/dashboard?success=stripe`,
      type: 'account_onboarding',
    });

    // Log the action
    const { data: { user } } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') || ''
    );

    if (user) {
      await supabase.from('admin_action_logs').insert({
        admin_user_id: user.id,
        action_type: 'stripe_onboarding_link_generated',
        target_type: 'gym',
        target_id: gymId,
        details: {
          stripe_account_id: gym.stripe_connect_account_id,
          gym_name: gym.name
        }
      });
    }

    console.log('Successfully generated onboarding link for account:', gym.stripe_connect_account_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: accountLink.url,
        message: 'Onboarding link generated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-connect-onboarding-link function:', error);
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