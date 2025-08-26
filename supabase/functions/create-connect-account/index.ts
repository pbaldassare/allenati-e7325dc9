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

    console.log('Creating Stripe Connect account for gym:', gymId);

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
      .select('name, email, owner_email, stripe_connect_account_id')
      .eq('id', gymId)
      .single();

    if (gymError || !gym) {
      throw new Error('Gym not found');
    }

    // Check if Connect account already exists
    if (gym.stripe_connect_account_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Stripe Connect account already exists for this gym',
          accountId: gym.stripe_connect_account_id 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Stripe Connect Express account
    const account = await stripe.accounts.create({
      type: 'express',
      email: gym.email || gym.owner_email,
      business_profile: {
        name: gym.name,
      },
      metadata: {
        gym_id: gymId,
        platform: 'gym_manager'
      }
    });

    // Update gym with Connect account ID
    const { error: updateError } = await supabase
      .from('gyms')
      .update({
        stripe_connect_account_id: account.id,
        stripe_onboarding_complete: false,
        stripe_charges_enabled: false,
        stripe_payouts_enabled: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', gymId);

    if (updateError) {
      console.error('Error updating gym with Connect account:', updateError);
      throw new Error('Failed to save Connect account ID');
    }

    // Log the action
    const { data: { user } } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') || ''
    );

    if (user) {
      await supabase.from('admin_action_logs').insert({
        admin_user_id: user.id,
        action_type: 'stripe_connect_account_created',
        target_type: 'gym',
        target_id: gymId,
        details: {
          stripe_account_id: account.id,
          gym_name: gym.name
        }
      });
    }

    console.log('Successfully created Connect account:', account.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        accountId: account.id,
        message: 'Stripe Connect account created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-connect-account function:', error);
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