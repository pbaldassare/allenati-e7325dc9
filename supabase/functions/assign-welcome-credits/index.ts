import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting assign welcome credits process...');

    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Find all users who don't have a welcome_bonus transaction
    const { data: usersWithoutWelcomeCredit, error: queryError } = await supabaseAdmin
      .from('profiles')
      .select(`
        user_id, 
        current_credits,
        email
      `)
      .not('user_id', 'in', `(
        SELECT DISTINCT user_id 
        FROM credits_transactions 
        WHERE transaction_type = 'welcome_bonus'
      )`);

    if (queryError) {
      console.error('Error finding users without welcome credit:', queryError);
      throw new Error(`Failed to query users: ${queryError.message}`);
    }

    console.log(`Found ${usersWithoutWelcomeCredit?.length || 0} users without welcome credit`);

    let processedCount = 0;
    let errorCount = 0;

    if (usersWithoutWelcomeCredit && usersWithoutWelcomeCredit.length > 0) {
      // Process each user
      for (const user of usersWithoutWelcomeCredit) {
        try {
          const currentCredits = user.current_credits || 0;
          const newBalance = currentCredits + 1;

          // Create welcome credit transaction
          const { error: creditError } = await supabaseAdmin
            .from('credits_transactions')
            .insert({
              user_id: user.user_id,
              amount: 1,
              balance_after: newBalance,
              transaction_type: 'welcome_bonus',
              description: 'Credito di benvenuto retroattivo'
            });

          if (creditError) {
            console.error(`Error creating welcome credit for user ${user.user_id}:`, creditError);
            errorCount++;
          } else {
            console.log(`Assigned welcome credit to user: ${user.user_id} (${user.email})`);
            processedCount++;
          }
        } catch (userError) {
          console.error(`Error processing user ${user.user_id}:`, userError);
          errorCount++;
        }
      }
    }

    console.log(`Welcome credits assignment completed. Processed: ${processedCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: processedCount,
        errors: errorCount,
        totalFound: usersWithoutWelcomeCredit?.length || 0,
        message: `Assigned welcome credits to ${processedCount} users. ${errorCount} errors occurred.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in assign-welcome-credits function:', error);
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