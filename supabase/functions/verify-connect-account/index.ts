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

    console.log('Verifying Connect account for gym:', gymId);

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
      .select('name, stripe_connect_account_id')
      .eq('id', gymId)
      .single();

    if (gymError || !gym) {
      throw new Error('Gym not found');
    }

    if (!gym.stripe_connect_account_id) {
      throw new Error('No Stripe Connect account found for this gym');
    }

    // Retrieve account from Stripe
    const account = await stripe.accounts.retrieve(gym.stripe_connect_account_id);

    // Check capabilities and requirements
    const chargesEnabled = account.charges_enabled;
    const payoutsEnabled = account.payouts_enabled;
    const onboardingComplete = account.details_submitted && !account.requirements?.eventually_due?.length;

    // Generate dashboard URL if available
    let dashboardUrl = null;
    if (onboardingComplete) {
      try {
        const loginLink = await stripe.accounts.createLoginLink(gym.stripe_connect_account_id);
        dashboardUrl = loginLink.url;
      } catch (error) {
        console.warn('Could not generate dashboard URL:', error.message);
      }
    }

    // Update gym with current status
    const { error: updateError } = await supabase
      .from('gyms')
      .update({
        stripe_onboarding_complete: onboardingComplete,
        stripe_charges_enabled: chargesEnabled,
        stripe_payouts_enabled: payoutsEnabled,
        stripe_dashboard_url: dashboardUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', gymId);

    if (updateError) {
      console.error('Error updating gym status:', updateError);
      throw new Error('Failed to update gym status');
    }

    // Log the action
    const { data: { user } } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') || ''
    );

    if (user) {
      await supabase.from('admin_action_logs').insert({
        admin_user_id: user.id,
        action_type: 'stripe_account_verified',
        target_type: 'gym',
        target_id: gymId,
        details: {
          stripe_account_id: gym.stripe_connect_account_id,
          gym_name: gym.name,
          charges_enabled: chargesEnabled,
          payouts_enabled: payoutsEnabled,
          onboarding_complete: onboardingComplete
        }
      });
    }

    console.log('Successfully verified Connect account:', {
      accountId: gym.stripe_connect_account_id,
      chargesEnabled,
      payoutsEnabled,
      onboardingComplete
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        accountId: gym.stripe_connect_account_id,
        status: {
          onboarding_complete: onboardingComplete,
          charges_enabled: chargesEnabled,
          payouts_enabled: payoutsEnabled,
          dashboard_url: dashboardUrl
        },
        requirements: {
          eventually_due: account.requirements?.eventually_due || [],
          currently_due: account.requirements?.currently_due || [],
          past_due: account.requirements?.past_due || []
        },
        message: 'Account status verified successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-connect-account function:', error);
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