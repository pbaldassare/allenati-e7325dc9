import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

interface LinkGymRequest {
  gym_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Owner Link Gym Function Started ===');
    
    // Get user from JWT token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id);

    // Parse request body
    const { gym_id }: LinkGymRequest = await req.json();
    
    if (!gym_id) {
      console.error('gym_id is required');
      return new Response(
        JSON.stringify({ error: 'gym_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Linking user to gym:', { user_id: user.id, gym_id });

    // Check if user has gym_owner role
    const { data: hasRole, error: roleError } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'gym_owner'
    });

    if (roleError || !hasRole) {
      console.error('User does not have gym_owner role:', roleError);
      return new Response(
        JSON.stringify({ error: 'Only gym owners can link to additional gyms' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify gym exists and is active
    const { data: gym, error: gymError } = await supabase
      .from('gyms')
      .select('id, name, is_active')
      .eq('id', gym_id)
      .eq('is_active', true)
      .single();

    if (gymError || !gym) {
      console.error('Gym not found or inactive:', gymError);
      return new Response(
        JSON.stringify({ error: 'Gym not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Gym verified:', gym.name);

    // Check if user already has membership for this gym
    const { data: existingMembership, error: membershipCheckError } = await supabase
      .from('user_gym_memberships')
      .select('id, membership_type, status')
      .eq('user_id', user.id)
      .eq('gym_id', gym_id)
      .single();

    if (membershipCheckError && membershipCheckError.code !== 'PGRST116') {
      console.error('Error checking existing membership:', membershipCheckError);
      return new Response(
        JSON.stringify({ error: 'Database error checking membership' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If membership exists, update it to owner type and active status
    if (existingMembership) {
      console.log('Updating existing membership:', existingMembership.id);
      
      const { error: updateError } = await supabase
        .from('user_gym_memberships')
        .update({
          membership_type: 'owner',
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingMembership.id);

      if (updateError) {
        console.error('Error updating membership:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update gym membership' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Membership updated successfully');
    } else {
      // Create new owner membership
      console.log('Creating new owner membership');
      
      const { error: insertError } = await supabase
        .from('user_gym_memberships')
        .insert({
          user_id: user.id,
          gym_id: gym_id,
          membership_type: 'owner',
          status: 'active'
        });

      if (insertError) {
        console.error('Error creating membership:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to create gym membership' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('New membership created successfully');
    }

    // Return success response
    console.log('=== Owner Link Gym Function Completed Successfully ===');
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully linked to ${gym.name}`,
        gym: {
          id: gym.id,
          name: gym.name
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in owner-link-gym function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});