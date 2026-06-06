import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('authorization');
    if (!authHeader) throw new Error('No authorization header');
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) throw new Error('Invalid or expired token');

    const body = await req.json();
    const target_user_id: string = body.user_id;
    const gym_ids: string[] = Array.isArray(body.gym_ids) ? body.gym_ids : [];

    if (!target_user_id || typeof target_user_id !== 'string') {
      throw new Error('user_id is required');
    }

    // Get all gyms where caller is owner
    const { data: ownedRows, error: ownErr } = await supabase
      .from('user_gym_memberships')
      .select('gym_id')
      .eq('user_id', user.id)
      .eq('membership_type', 'owner')
      .eq('status', 'active');

    if (ownErr) throw ownErr;
    const ownedGymIds = new Set((ownedRows || []).map((r: any) => r.gym_id));

    // Verify every requested gym belongs to caller
    for (const gid of gym_ids) {
      if (!ownedGymIds.has(gid)) {
        throw new Error(`Not authorized for gym ${gid}`);
      }
    }

    // For every owned gym: if selected -> upsert active, if not -> set inactive (if exists)
    for (const gymId of ownedGymIds) {
      const selected = gym_ids.includes(gymId);

      const { data: existing } = await supabase
        .from('user_gym_memberships')
        .select('id, status, membership_type')
        .eq('user_id', target_user_id)
        .eq('gym_id', gymId)
        .maybeSingle();

      // Never touch owner/staff memberships
      if (existing && (existing.membership_type === 'owner' || existing.membership_type === 'staff')) {
        continue;
      }

      if (selected) {
        if (existing) {
          if (existing.status !== 'active') {
            await supabase
              .from('user_gym_memberships')
              .update({ status: 'active', updated_at: new Date().toISOString() })
              .eq('id', existing.id);
          }
        } else {
          await supabase
            .from('user_gym_memberships')
            .insert({
              user_id: target_user_id,
              gym_id: gymId,
              membership_type: 'member',
              status: 'active',
            });
        }
      } else {
        if (existing && existing.status === 'active') {
          await supabase
            .from('user_gym_memberships')
            .update({ status: 'inactive', updated_at: new Date().toISOString() })
            .eq('id', existing.id);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('owner-manage-user-gyms error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
