import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { instructor_user_id, gym_id } = await req.json();

    if (!instructor_user_id || !gym_id) {
      throw new Error('instructor_user_id and gym_id are required');
    }

    console.log('Removing instructor:', { instructor_user_id, gym_id, requesting_user: user.id });

    // Prevent self-removal
    if (instructor_user_id === user.id) {
      throw new Error('Cannot remove yourself from the gym');
    }

    // Verify requesting user has permissions
    const { data: isOwner } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'gym_owner' });
    const { data: hasPrivileges } = await supabase.rpc('instructor_has_owner_privileges_for_gym', { 
      _user_id: user.id, 
      _gym_id: gym_id 
    });

    if (!isOwner && !hasPrivileges) {
      throw new Error('Permission denied: must be gym owner or super instructor');
    }

    // Get instructor_id
    const { data: instructor, error: fetchError } = await supabase
      .from('instructors')
      .select('id')
      .eq('user_id', instructor_user_id)
      .single();

    if (fetchError || !instructor) {
      throw new Error('Instructor not found');
    }

    // Perform soft delete
    const { error: updateError } = await supabase
      .from('instructor_gym_assignments')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('instructor_id', instructor.id)
      .eq('gym_id', gym_id)
      .eq('is_active', true);

    if (updateError) throw updateError;

    console.log('Instructor removed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Instructor removed from gym successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in remove-instructor-from-gym:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
