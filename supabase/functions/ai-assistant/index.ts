import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const { message, user_id, gym_id, conversation_history, confirmAction, actionType, actionData } = await req.json();

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Handle action confirmation
    if (confirmAction) {
      return await handleActionConfirmation(actionType, actionData, user_id, gym_id);
    }

    // Get user context
    const userContext = await getUserContext(user_id, gym_id);
    
    // Prepare conversation context
    const conversationContext = conversation_history?.map((msg: any) => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    })) || [];

    // Call OpenAI with function calling
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Sei un assistente AI per una palestra. Puoi aiutare gli utenti con:
            - Prenotazioni lezioni
            - Informazioni sui corsi e orari
            - Lista partecipanti alle lezioni
            - Gestione crediti
            - Storico prenotazioni
            
            Contesto utente:
            - User ID: ${user_id}
            - Gym ID: ${gym_id}
            - Crediti disponibili: ${userContext.credits}
            - Palestra: ${userContext.gymName}
            
            Rispondi sempre in italiano in modo amichevole. Per azioni critiche come prenotazioni o cancellazioni, usa le function calls appropriate.`
          },
          ...conversationContext,
          { role: 'user', content: message }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'getAvailableCourses',
              description: 'Ottieni la lista dei corsi disponibili per una data specifica',
              parameters: {
                type: 'object',
                properties: {
                  date: { type: 'string', description: 'Data in formato YYYY-MM-DD' },
                  courseType: { type: 'string', description: 'Tipo di corso (opzionale)' }
                },
                required: ['date']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'prepareBookingConfirmation',
              description: 'Prepara la conferma di prenotazione per una lezione specifica',
              parameters: {
                type: 'object',
                properties: {
                  sessionId: { type: 'string', description: 'ID della sessione' },
                  courseName: { type: 'string', description: 'Nome del corso' },
                  date: { type: 'string', description: 'Data della lezione' },
                  time: { type: 'string', description: 'Orario della lezione' }
                },
                required: ['sessionId', 'courseName', 'date', 'time']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'getSessionParticipants',
              description: 'Ottieni la lista dei partecipanti confermati per una sessione',
              parameters: {
                type: 'object',
                properties: {
                  sessionId: { type: 'string', description: 'ID della sessione' }
                },
                required: ['sessionId']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'getUserBookings',
              description: 'Ottieni lo storico delle prenotazioni dell\'utente',
              parameters: {
                type: 'object',
                properties: {
                  status: { type: 'string', description: 'Stato delle prenotazioni (confirmed, cancelled, completed)' }
                }
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'prepareCancellationConfirmation',
              description: 'Prepara la conferma di cancellazione per una prenotazione',
              parameters: {
                type: 'object',
                properties: {
                  bookingId: { type: 'string', description: 'ID della prenotazione' },
                  courseName: { type: 'string', description: 'Nome del corso' },
                  date: { type: 'string', description: 'Data della lezione' }
                },
                required: ['bookingId', 'courseName', 'date']
              }
            }
          }
        ],
        tool_choice: 'auto'
      }),
    });

    const aiResponse = await response.json();
    
    console.log('OpenAI response:', JSON.stringify(aiResponse, null, 2));
    
    // Check if response has choices
    if (!aiResponse.choices || aiResponse.choices.length === 0) {
      throw new Error('Invalid response from OpenAI: no choices');
    }
    
    const choice = aiResponse.choices[0];
    
    // Check for tool calls (new format)
    if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      return await handleFunctionCall({
        name: toolCall.function.name,
        arguments: toolCall.function.arguments
      }, user_id, gym_id);
    }

    return new Response(JSON.stringify({
      response: choice.message?.content || 'Nessuna risposta disponibile'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-assistant function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      response: 'Mi dispiace, si è verificato un errore. Riprova più tardi.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getUserContext(userId: string, gymId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('current_credits, first_name')
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
    credits: gymCredits?.credits || 0,
    userName: profile?.first_name || 'Utente',
    gymName: gym?.name || 'Palestra'
  };
}

async function handleFunctionCall(functionCall: any, userId: string, gymId: string) {
  const functionName = functionCall.name;
  const args = JSON.parse(functionCall.arguments);

  console.log('Function call:', functionName, args);

  try {
    switch (functionName) {
      case 'getAvailableCourses':
        return await getAvailableCourses(args, gymId);
      
      case 'prepareBookingConfirmation':
        return await prepareBookingConfirmation(args, userId, gymId);
      
      case 'getSessionParticipants':
        return await getSessionParticipants(args);
      
      case 'getUserBookings':
        return await getUserBookings(userId, gymId, args.status);
      
      case 'prepareCancellationConfirmation':
        return await prepareCancellationConfirmation(args, userId);
      
      default:
        throw new Error(`Function ${functionName} not implemented`);
    }
  } catch (error) {
    console.error(`Error in ${functionName}:`, error);
    return new Response(JSON.stringify({
      response: `Errore nell'eseguire l'operazione: ${error.message}`
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function getAvailableCourses(args: any, gymId: string) {
  const { data: sessions, error } = await supabase
    .from('course_sessions')
    .select(`
      id,
      session_date,
      start_time,
      available_spots,
      courses!inner(
        name,
        description,
        credits_required,
        gym_id
      )
    `)
    .eq('courses.gym_id', gymId)
    .eq('session_date', args.date)
    .eq('status', 'scheduled')
    .gt('available_spots', 0)
    .order('start_time');

  if (error) throw error;

  if (!sessions || sessions.length === 0) {
    return new Response(JSON.stringify({
      response: `Non ci sono corsi disponibili per il ${args.date}. Prova con un'altra data.`
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const courseList = sessions.map(session => 
    `• ${session.courses.name} alle ${session.start_time} (${session.available_spots} posti liberi, ${session.courses.credits_required} crediti)`
  ).join('\n');

  return new Response(JSON.stringify({
    response: `Ecco i corsi disponibili per il ${args.date}:\n\n${courseList}\n\nVuoi prenotarti a qualche corso?`
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function prepareBookingConfirmation(args: any, userId: string, gymId: string) {
  // Check if user has enough credits
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
    return new Response(JSON.stringify({
      response: 'Sessione non trovata.'
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userCredits = gymCredits?.credits || 0;
  const requiredCredits = session.courses.credits_required;

  if (userCredits < requiredCredits) {
    return new Response(JSON.stringify({
      response: `Non hai abbastanza crediti. Hai ${userCredits} crediti, ma ne servono ${requiredCredits} per questo corso.`
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (session.available_spots <= 0) {
    return new Response(JSON.stringify({
      response: 'Mi dispiace, questo corso è al completo.'
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    response: `Vuoi confermare la prenotazione per:\n\n📅 ${args.courseName}\n🕐 ${args.date} alle ${args.time}\n💳 Costo: ${requiredCredits} crediti\n\nConfermi la prenotazione?`,
    actionRequired: {
      type: 'booking',
      data: {
        sessionId: args.sessionId,
        courseName: args.courseName,
        date: args.date,
        time: args.time,
        creditsRequired: requiredCredits
      }
    }
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function getSessionParticipants(args: any) {
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      profiles!inner(first_name, last_name)
    `)
    .eq('session_id', args.sessionId)
    .eq('status', 'confirmed');

  if (error) throw error;

  if (!bookings || bookings.length === 0) {
    return new Response(JSON.stringify({
      response: 'Non ci sono ancora partecipanti confermati per questa lezione.'
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const participantList = bookings.map(booking => 
    `• ${booking.profiles.first_name} ${booking.profiles.last_name}`
  ).join('\n');

  return new Response(JSON.stringify({
    response: `Partecipanti confermati (${bookings.length}):\n\n${participantList}`
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function getUserBookings(userId: string, gymId: string, status?: string) {
  const query = supabase
    .from('bookings')
    .select(`
      id,
      scheduled_date,
      scheduled_time,
      status,
      courses!inner(name, gym_id)
    `)
    .eq('user_id', userId)
    .eq('courses.gym_id', gymId)
    .order('scheduled_date', { ascending: false })
    .limit(10);

  if (status) {
    query.eq('status', status);
  }

  const { data: bookings, error } = await query;

  if (error) throw error;

  if (!bookings || bookings.length === 0) {
    return new Response(JSON.stringify({
      response: 'Non hai prenotazioni recenti.'
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const bookingList = bookings.map(booking => 
    `• ${booking.courses.name} - ${booking.scheduled_date} alle ${booking.scheduled_time} (${booking.status})`
  ).join('\n');

  return new Response(JSON.stringify({
    response: `Le tue prenotazioni recenti:\n\n${bookingList}`
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function prepareCancellationConfirmation(args: any, userId: string) {
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      *,
      courses!inner(name)
    `)
    .eq('id', args.bookingId)
    .eq('user_id', userId)
    .single();

  if (!booking) {
    return new Response(JSON.stringify({
      response: 'Prenotazione non trovata.'
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    response: `Vuoi confermare la cancellazione di:\n\n📅 ${args.courseName}\n🕐 ${args.date}\n\n⚠️ Questa azione non può essere annullata. Confermi?`,
    actionRequired: {
      type: 'cancellation',
      data: {
        bookingId: args.bookingId,
        courseName: args.courseName,
        date: args.date
      }
    }
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleActionConfirmation(actionType: string, actionData: any, userId: string, gymId: string) {
  try {
    if (actionType === 'booking') {
      return await executeBooking(actionData, userId, gymId);
    } else if (actionType === 'cancellation') {
      return await executeCancellation(actionData, userId, gymId);
    }

    throw new Error('Action type not supported');
  } catch (error) {
    return new Response(JSON.stringify({
      response: `Errore nell'eseguire l'azione: ${error.message}`
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function executeBooking(actionData: any, userId: string, gymId: string) {
  const { sessionId, courseName, date, time, creditsRequired } = actionData;

  // Get session and course details
  const { data: session } = await supabase
    .from('course_sessions')
    .select('*, courses!inner(id)')
    .eq('id', sessionId)
    .single();

  if (!session) throw new Error('Sessione non trovata');

  // Create booking
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      user_id: userId,
      course_id: session.courses.id,
      session_id: sessionId,
      scheduled_date: date,
      scheduled_time: time,
      status: 'confirmed',
      credits_used: creditsRequired
    })
    .select()
    .single();

  if (bookingError) throw bookingError;

  // Deduct credits
  const { error: creditError } = await supabase
    .from('credits_transactions')
    .insert({
      user_id: userId,
      gym_id: gymId,
      amount: -creditsRequired,
      transaction_type: 'booking',
      description: `Prenotazione: ${courseName}`,
      reference_id: booking.id
    });

  if (creditError) throw creditError;

  return new Response(JSON.stringify({
    response: `✅ Prenotazione confermata!\n\n📅 ${courseName}\n🕐 ${date} alle ${time}\n💳 ${creditsRequired} crediti utilizzati\n\nCi vediamo in palestra!`
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function executeCancellation(actionData: any, userId: string, gymId: string) {
  const { bookingId, courseName, date } = actionData;

  // Get booking details
  const { data: booking } = await supabase
    .from('bookings')
    .select('credits_used')
    .eq('id', bookingId)
    .eq('user_id', userId)
    .single();

  if (!booking) throw new Error('Prenotazione non trovata');

  // Cancel booking
  const { error: cancelError } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId);

  if (cancelError) throw cancelError;

  // Refund credits
  const { error: creditError } = await supabase
    .from('credits_transactions')
    .insert({
      user_id: userId,
      gym_id: gymId,
      amount: booking.credits_used,
      transaction_type: 'refund',
      description: `Rimborso cancellazione: ${courseName}`,
      reference_id: bookingId
    });

  if (creditError) throw creditError;

  return new Response(JSON.stringify({
    response: `❌ Prenotazione cancellata\n\n📅 ${courseName}\n🕐 ${date}\n💳 ${booking.credits_used} crediti rimborsati\n\nLa prenotazione è stata annullata con successo.`
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}