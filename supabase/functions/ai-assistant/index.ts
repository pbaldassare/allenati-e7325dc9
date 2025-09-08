import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 AI Assistant request started');
    const { message, user_id, gym_id, conversation_history, confirmAction, actionType, actionData } = await req.json();

    console.log('📥 Request:', { 
      user_id: user_id?.substring(0, 8) + '...', 
      gym_id: gym_id?.substring(0, 8) + '...',
      hasMessage: !!message,
      messageLength: message?.length || 0,
      confirmAction
    });

    if (!user_id || !gym_id) {
      throw new Error('user_id e gym_id sono obbligatori');
    }

    if (!message && !confirmAction) {
      throw new Error('Messaggio richiesto');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Handle action confirmation
    if (confirmAction) {
      console.log('🔄 Handling action confirmation:', actionType);
      return await handleActionConfirmation(actionType, actionData, user_id, gym_id);
    }

    // Get simplified user context
    console.log('👤 Getting user context...');
    const userContext = await getUserContext(user_id, gym_id);
    console.log('✅ User context:', { name: userContext.userName, credits: userContext.credits });

    // Simplified AI prompt
    const systemPrompt = `Sei un assistente AI per una palestra italiana. 
Utente: ${userContext.userName}, Crediti: ${userContext.credits}, Palestra: ${userContext.gymName}

Rispondi in italiano, sii conciso e amichevole. Puoi aiutare con:
- Prenotazioni corsi
- Informazioni crediti
- Informazioni sui corsi

Disponibili solo 2 funzioni:
1. getAvailableCourses(date) - per vedere corsi disponibili
2. prepareBookingConfirmation(sessionId, courseName) - per prenotare`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message.substring(0, 300) }
    ];

    console.log('🤖 Calling OpenAI...');
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 500,
        temperature: 0.7,
        tools: [
          {
            type: 'function',
            function: {
              name: 'getAvailableCourses',
              description: 'Ottieni corsi disponibili per una data specifica',
              parameters: {
                type: 'object',
                properties: {
                  date: { type: 'string', description: 'Data nel formato YYYY-MM-DD' }
                },
                required: ['date']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'prepareBookingConfirmation',
              description: 'Prepara conferma prenotazione per un corso',
              parameters: {
                type: 'object',
                properties: {
                  sessionId: { type: 'string', description: 'ID della sessione' },
                  courseName: { type: 'string', description: 'Nome del corso' }
                },
                required: ['sessionId', 'courseName']
              }
            }
          }
        ]
      })
    });

    if (!openAIResponse.ok) {
      console.error('❌ OpenAI Error:', openAIResponse.status, await openAIResponse.text());
      throw new Error('Errore nella comunicazione con OpenAI');
    }

    const openAIData = await openAIResponse.json();
    console.log('✅ OpenAI Response received');

    const choice = openAIData.choices?.[0];
    if (!choice) {
      throw new Error('Nessuna risposta da OpenAI');
    }

    // Handle function calls
    if (choice.message?.tool_calls?.length > 0) {
      console.log('🔧 Processing function calls...');
      const toolCall = choice.message.tool_calls[0];
      const functionName = toolCall.function.name;
      
      let functionArgs;
      try {
        functionArgs = typeof toolCall.function.arguments === 'string' 
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
      } catch (parseError) {
        console.error('❌ Function args parse error:', parseError);
        throw new Error('Errore nel parsing degli argomenti della funzione');
      }

      console.log('🎯 Calling function:', functionName, functionArgs);
      const functionResult = await handleFunctionCall(functionName, functionArgs, user_id, gym_id);
      
      return new Response(JSON.stringify({
        response: functionResult.response,
        actionRequired: functionResult.actionRequired
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Regular response
    const aiResponse = choice.message?.content || 'Mi dispiace, non ho capito la tua richiesta.';
    console.log('💬 AI Response:', aiResponse.substring(0, 50) + '...');

    return new Response(JSON.stringify({
      response: aiResponse
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ AI Assistant Error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Errore interno del server',
      response: 'Mi dispiace, c\'è stato un errore. Riprova tra qualche istante.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Simplified user context
async function getUserContext(userId: string, gymId: string) {
  console.log('👤 Getting user context');
  
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, current_credits')
      .eq('user_id', userId)
      .single();

    const { data: gym } = await supabase
      .from('gyms')
      .select('name')
      .eq('id', gymId)
      .single();

    const { data: gymCredits } = await supabase
      .from('gym_credits')
      .select('credits')
      .eq('user_id', userId)
      .eq('gym_id', gymId)
      .single();

    return {
      userName: profile ? `${profile.first_name} ${profile.last_name}` : 'Utente',
      credits: gymCredits?.credits || 0,
      gymName: gym?.name || 'Palestra'
    };
  } catch (error) {
    console.error('❌ Error getting user context:', error);
    return {
      userName: 'Utente',
      credits: 0,
      gymName: 'Palestra'
    };
  }
}

async function handleFunctionCall(functionName: string, args: any, userId: string, gymId: string) {
  console.log('🔧 Function call:', functionName, args);

  try {
    switch (functionName) {
      case 'getAvailableCourses':
        return await getAvailableCourses(args, gymId);
      
      case 'prepareBookingConfirmation':
        return await prepareBookingConfirmation(args, userId, gymId);
      
      default:
        return { response: `Funzione ${functionName} non supportata.` };
    }
  } catch (error) {
    console.error(`❌ Error in ${functionName}:`, error);
    return { response: `Errore nell'eseguire l'operazione: ${error.message}` };
  }
}

async function getAvailableCourses(args: any, gymId: string) {
  console.log('📅 Getting available courses for:', args.date);
  
  const { data: sessions, error } = await supabase
    .from('course_sessions')
    .select(`
      id,
      session_date,
      start_time,
      available_spots,
      courses!inner(name, credits_required, gym_id)
    `)
    .eq('courses.gym_id', gymId)
    .eq('session_date', args.date)
    .eq('status', 'scheduled')
    .gt('available_spots', 0)
    .order('start_time')
    .limit(10);

  if (error) {
    console.error('❌ Error getting courses:', error);
    return { response: 'Errore nel recuperare i corsi disponibili.' };
  }

  if (!sessions || sessions.length === 0) {
    return { response: `Non ci sono corsi disponibili per il ${args.date}. Prova con un'altra data.` };
  }

  const courseList = sessions.map(session => 
    `• ${session.courses.name} alle ${session.start_time} (${session.available_spots} posti, ${session.courses.credits_required} crediti)`
  ).join('\n');

  return { response: `Corsi disponibili per il ${args.date}:\n\n${courseList}\n\nVuoi prenotarti?` };
}

async function prepareBookingConfirmation(args: any, userId: string, gymId: string) {
  console.log('🎫 Preparing booking confirmation for session:', args.sessionId);
  
  const { data: gymCredits } = await supabase
    .from('gym_credits')
    .select('credits')
    .eq('user_id', userId)
    .eq('gym_id', gymId)
    .single();

  const { data: session } = await supabase
    .from('course_sessions')
    .select(`
      *,
      courses!inner(name, credits_required)
    `)
    .eq('id', args.sessionId)
    .single();

  if (!session) {
    return { response: 'Sessione non trovata.' };
  }

  const userCredits = gymCredits?.credits || 0;
  const requiredCredits = session.courses.credits_required;

  if (userCredits < requiredCredits) {
    return {
      response: `Non hai abbastanza crediti. Hai ${userCredits} crediti, ma ne servono ${requiredCredits} per questo corso.`
    };
  }

  if (session.available_spots <= 0) {
    return { response: 'Mi dispiace, questo corso è al completo.' };
  }

  return {
    response: `Vuoi confermare la prenotazione per:\n\n📅 ${args.courseName}\n🕐 ${session.session_date} alle ${session.start_time}\n💳 Costo: ${requiredCredits} crediti\n\nConfermi la prenotazione?`,
    actionRequired: {
      type: 'booking',
      data: {
        sessionId: args.sessionId,
        courseName: args.courseName,
        creditsRequired: requiredCredits
      }
    }
  };
}

async function handleActionConfirmation(actionType: string, actionData: any, userId: string, gymId: string) {
  console.log('✅ Executing action:', actionType, actionData);
  
  if (actionType === 'booking') {
    return await executeBooking(actionData, userId, gymId);
  }
  
  return new Response(JSON.stringify({
    response: 'Azione non supportata.'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function executeBooking(actionData: any, userId: string, gymId: string) {
  try {
    // Get session details
    const { data: session } = await supabase
      .from('course_sessions')
      .select(`
        id,
        course_id,
        session_date,
        start_time,
        available_spots,
        courses!inner(name, credits_required)
      `)
      .eq('id', actionData.sessionId)
      .single();

    if (!session || session.available_spots <= 0) {
      return new Response(JSON.stringify({
        response: 'Sessione non disponibile o esaurita.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create booking
    const { error: bookingError } = await supabase
      .from('bookings')
      .insert({
        user_id: userId,
        course_id: session.course_id,
        session_id: actionData.sessionId,
        scheduled_date: session.session_date,
        scheduled_time: session.start_time,
        status: 'confirmed',
        credits_used: actionData.creditsRequired
      });

    if (bookingError) {
      console.error('❌ Booking error:', bookingError);
      return new Response(JSON.stringify({
        response: 'Errore nella prenotazione: ' + bookingError.message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Deduct credits
    const { error: creditError } = await supabase
      .from('credits_transactions')
      .insert({
        user_id: userId,
        gym_id: gymId,
        amount: -actionData.creditsRequired,
        transaction_type: 'booking',
        description: `Prenotazione ${actionData.courseName}`
      });

    if (creditError) {
      console.error('❌ Credit deduction error:', creditError);
    }

    return new Response(JSON.stringify({
      response: `✅ Prenotazione confermata per ${actionData.courseName}!\n\nHai usato ${actionData.creditsRequired} crediti.`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Execute booking error:', error);
    return new Response(JSON.stringify({
      response: 'Errore durante la prenotazione. Riprova.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}