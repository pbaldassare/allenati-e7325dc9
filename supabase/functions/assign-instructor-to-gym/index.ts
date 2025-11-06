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

    if (!instructor_user_id) {
      throw new Error('instructor_user_id is required');
    }

    // Determine target gym_id
    let targetGymId = gym_id;
    if (!targetGymId) {
      const { data: ownerGym } = await supabase.rpc('get_user_gym_id', { _user_id: user.id });
      targetGymId = ownerGym;
    }

    if (!targetGymId) {
      throw new Error('gym_id could not be determined');
    }

    console.log('Assigning instructor:', { instructor_user_id, gym_id: targetGymId, requesting_user: user.id });

    // Verify requesting user has permissions (owner or super instructor)
    const { data: isOwner } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'gym_owner' });
    const { data: hasPrivileges } = await supabase.rpc('instructor_has_owner_privileges_for_gym', { 
      _user_id: user.id, 
      _gym_id: targetGymId 
    });

    if (!isOwner && !hasPrivileges) {
      throw new Error('Permission denied: must be gym owner or super instructor');
    }

    // Verify target user has instructor role
    const { data: targetRole } = await supabase.rpc('has_role', { 
      _user_id: instructor_user_id, 
      _role: 'instructor' 
    });

    if (!targetRole) {
      throw new Error('Target user does not have instructor role');
    }

    // Check if instructor record exists
    const { data: existingInstructor, error: fetchError } = await supabase
      .from('instructors')
      .select('id')
      .eq('user_id', instructor_user_id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    let instructorId = existingInstructor?.id;

    // Create instructor record if it doesn't exist
    if (!instructorId) {
      console.log('Creating new instructor record for user:', instructor_user_id);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', instructor_user_id)
        .single();

      const { data: newInstructor, error: createError } = await supabase
        .from('instructors')
        .insert({
          user_id: instructor_user_id,
          gym_id: null, // Always NULL for multi-gym support
          first_name: profile?.first_name || 'Nome',
          last_name: profile?.last_name || 'Cognome',
          is_active: true,
          has_owner_privileges: false
        })
        .select('id')
        .single();

      if (createError) throw createError;
      instructorId = newInstructor.id;
    }

    // Check if assignment already exists
    const { data: existingAssignment, error: assignmentFetchError } = await supabase
      .from('instructor_gym_assignments')
      .select('id, is_active')
      .eq('instructor_id', instructorId)
      .eq('gym_id', targetGymId)
      .maybeSingle();

    if (assignmentFetchError) throw assignmentFetchError;

    let assignmentId;

    if (existingAssignment) {
      if (existingAssignment.is_active) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Instructor already assigned to this gym',
            instructor_id: instructorId,
            assignment_id: existingAssignment.id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Reactivate existing assignment
      console.log('Reactivating existing assignment:', existingAssignment.id);
      const { error: updateError } = await supabase
        .from('instructor_gym_assignments')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', existingAssignment.id);

      if (updateError) throw updateError;
      assignmentId = existingAssignment.id;
    } else {
      // Create new assignment
      console.log('Creating new assignment');
      const { data: newAssignment, error: insertError } = await supabase
        .from('instructor_gym_assignments')
        .insert({
          instructor_id: instructorId,
          gym_id: targetGymId,
          is_active: true,
          has_owner_privileges: false,
          assigned_by: user.id
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      assignmentId = newAssignment.id;
    }

    console.log('Assignment successful:', { instructor_id: instructorId, assignment_id: assignmentId });

    return new Response(
      JSON.stringify({
        success: true,
        instructor_id: instructorId,
        assignment_id: assignmentId,
        message: 'Instructor assigned successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in assign-instructor-to-gym:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
