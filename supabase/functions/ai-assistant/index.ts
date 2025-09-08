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
    const startTime = Date.now();
    
    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      throw new Error('Invalid JSON in request body');
    }

    const { message, user_id, gym_id, conversation_history, confirmAction, actionType, actionData } = requestBody;

    console.log('📥 Raw request parameters:', { 
      user_id: typeof user_id, 
      gym_id: typeof gym_id, 
      hasMessage: !!message, 
      confirmAction,
      messageLength: message?.length || 0,
      historyLength: conversation_history?.length || 0
    });

    // Enhanced parameter validation with detailed logging
    if (!user_id || user_id === 'undefined' || user_id === 'null' || typeof user_id !== 'string') {
      console.error('❌ Invalid user_id:', { 
        value: user_id, 
        type: typeof user_id, 
        isString: typeof user_id === 'string',
        length: user_id?.length || 0
      });
      throw new Error('User ID is required and must be a valid string');
    }

    if (!gym_id || gym_id === 'undefined' || gym_id === 'null' || typeof gym_id !== 'string') {
      console.error('❌ Invalid gym_id:', { 
        value: gym_id, 
        type: typeof gym_id,
        isString: typeof gym_id === 'string',
        length: gym_id?.length || 0
      });
      throw new Error('Gym ID is required and must be a valid string');
    }

    // UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(user_id)) {
      console.error('❌ Invalid user_id format:', { user_id, length: user_id.length });
      throw new Error('User ID must be a valid UUID format');
    }

    if (!uuidRegex.test(gym_id)) {
      console.error('❌ Invalid gym_id format:', { gym_id, length: gym_id.length });
      throw new Error('Gym ID must be a valid UUID format');
    }

    console.log('✅ Request parameters validated successfully:', { 
      user_id: user_id.substring(0, 8) + '...', 
      gym_id: gym_id.substring(0, 8) + '...', 
      hasMessage: !!message, 
      confirmAction 
    });

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
        model: 'gpt-5-mini-2025-08-07', // Using faster mini model
        messages: [
          {
            role: 'system',
            content: `Sei l'assistente AI intelligente di ${userContext.gymName}, specializzato nel supporto completo per palestre e centri fitness italiani. 

🎯 **LE TUE CAPACITÀ PRINCIPALI:**
• 📅 Gestione prenotazioni e cancellazioni lezioni
• 👥 Informazioni dettagliate su corsi, istruttori e partecipanti  
• 💳 Gestione crediti e storico transazioni
• 📊 Statistiche personali e progressi
• 🔍 Ricerca corsi per livello, orario e tipo
• ❓ Supporto generale sulla palestra

👤 **CONTESTO UTENTE:**
• Nome: ${userContext.userName}
• Crediti disponibili: ${userContext.credits}
• Palestra: ${userContext.gymName}

🎨 **STILE DI COMUNICAZIONE:**
• Usa un tono amichevole e professionale
• Includi emoji pertinenti per rendere i messaggi più accattivanti
• Fornisci risposte chiare e actionable
• Per azioni critiche (prenotazioni/cancellazioni), usa sempre le function calls
• Suggerisci alternative quando possibile
• Celebra i successi dell'utente

💡 **ESEMPI DI CONVERSAZIONE:**
• "Voglio prenotarmi per la lezione di domani" 
• "Chi partecipa al corso di BJJ di giovedì?"
• "Quanto crediti ho ancora?"
• "Mostrami le mie statistiche di allenamento"

Rispondi sempre in italiano con entusiasmo e competenza!`
          },
          ...conversationContext,
          { role: 'user', content: message }
        ],
        max_completion_tokens: 1000, // Reduced for faster responses
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
          },
          {
            type: 'function',
            function: {
              name: 'getCourseDetails',
              description: 'Ottieni informazioni dettagliate su un corso specifico',
              parameters: {
                type: 'object',
                properties: {
                  courseName: { type: 'string', description: 'Nome del corso' },
                  courseId: { type: 'string', description: 'ID del corso (opzionale)' }
                },
                required: ['courseName']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'getInstructorSchedule',
              description: 'Ottieni gli orari e i corsi di un istruttore specifico',
              parameters: {
                type: 'object',
                properties: {
                  instructorName: { type: 'string', description: 'Nome dell\'istruttore' },
                  date: { type: 'string', description: 'Data specifica (YYYY-MM-DD), opzionale' }
                },
                required: ['instructorName']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'getUserStats',
              description: 'Ottieni statistiche e progressi dell\'utente',
              parameters: {
                type: 'object',
                properties: {
                  period: { type: 'string', description: 'Periodo: week, month, year' }
                }
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'getUserCreditsHistory',
              description: 'Ottieni lo storico delle transazioni crediti dell\'utente',
              parameters: {
                type: 'object',
                properties: {
                  limit: { type: 'number', description: 'Numero massimo di transazioni (default 10)' }
                }
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'getUpcomingBookings',
              description: 'Ottieni le prossime prenotazioni dell\'utente',
              parameters: {
                type: 'object',
                properties: {
                  days: { type: 'number', description: 'Giorni futuri da considerare (default 7)' }
                }
              }
            }
          }
        ].slice(0, 8), // Limit to 8 most important tools for better performance
        tool_choice: 'auto'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const openAITime = Date.now() - startTime;
    console.log(`OpenAI API call completed in ${openAITime}ms`);
    
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

    const totalTime = Date.now() - startTime;
    console.log(`Total function execution time: ${totalTime}ms`);
    
    console.log(`✅ Sending successful response. Total execution time: ${totalTime}ms`);
    
    return new Response(JSON.stringify({
      response: choice.message?.content || 'Nessuna risposta disponibile',
      execution_time_ms: totalTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const totalTime = Date.now() - (Date.now() - 10000); // Fallback timing
    console.error('❌ Complete error in ai-assistant function:', {
      error: error.message || 'Unknown error',
      stack: error.stack || 'No stack trace',
      type: error.constructor.name || 'Unknown error type',
      execution_time_ms: totalTime
    });
    
    // Enhanced error categorization and messaging
    let errorMessage = 'Internal server error';
    let statusCode = 500;
    let userFriendlyMessage = 'Mi dispiace, si è verificato un errore interno. Riprova più tardi.';
    
    if (error.message?.includes('timeout')) {
      errorMessage = 'Request timeout - please try again';
      userFriendlyMessage = 'La richiesta ha impiegato troppo tempo. Riprova con una domanda più semplice.';
      statusCode = 408;
    } else if (error.message?.includes('OpenAI') || error.message?.includes('API error')) {
      errorMessage = 'AI service temporarily unavailable';
      userFriendlyMessage = 'Il servizio AI è temporaneamente non disponibile. Riprova tra qualche minuto.';
      statusCode = 503;
    } else if (error.message?.includes('User ID') || error.message?.includes('Gym ID') || error.message?.includes('UUID')) {
      errorMessage = 'Invalid request parameters';
      userFriendlyMessage = 'Parametri della richiesta non validi. Prova a rifare il login.';
      statusCode = 400;
    } else if (error.message?.includes('JSON')) {
      errorMessage = 'Invalid request format';
      userFriendlyMessage = 'Formato della richiesta non valido. Riprova.';
      statusCode = 400;
    } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
      errorMessage = 'Network error';
      userFriendlyMessage = 'Errore di connessione. Controlla la tua connessione internet.';
      statusCode = 502;
    }
    
    console.log(`💥 Sending error response with status ${statusCode}`);
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      response: userFriendlyMessage,
      details: Deno.env.get('DENO_ENV') === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getUserContext(userId: string, gymId: string) {
  console.log('🔍 Fetching user context for:', { 
    userId: userId.substring(0, 8) + '...', 
    gymId: gymId.substring(0, 8) + '...' 
  });

  try {
    // Parallel queries for better performance
    const [profileResult, gymResult, gymCreditsResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('current_credits, first_name')
        .eq('user_id', userId)
        .maybeSingle(),
      
      supabase
        .from('gyms')
        .select('name')
        .eq('id', gymId)
        .maybeSingle(),
      
      supabase
        .from('gym_credits')
        .select('credits')
        .eq('user_id', userId)
        .eq('gym_id', gymId)
        .maybeSingle()
    ]);

    console.log('📊 User context query results:', {
      profileFound: !!profileResult.data,
      gymFound: !!gymResult.data,
      gymCreditsFound: !!gymCreditsResult.data,
      profileError: profileResult.error?.message,
      gymError: gymResult.error?.message,
      gymCreditsError: gymCreditsResult.error?.message
    });

    const context = {
      credits: gymCreditsResult.data?.credits || 0,
      userName: profileResult.data?.first_name || 'Utente',
      gymName: gymResult.data?.name || 'Palestra'
    };

    console.log('✅ User context prepared:', {
      credits: context.credits,
      userName: context.userName,
      gymName: context.gymName
    });

    return context;
  } catch (error) {
    console.error('❌ Error fetching user context:', error);
    
    // Return fallback values to prevent complete failure
    return {
      credits: 0,
      userName: 'Utente',
      gymName: 'Palestra'
    };
  }
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
      
      case 'getCourseDetails':
        return await getCourseDetails(args, gymId);
      
      case 'getInstructorSchedule':
        return await getInstructorSchedule(args, gymId);
      
      case 'getUserStats':
        return await getUserStats(userId, gymId, args.period);
      
      case 'getUserCreditsHistory':
        return await getUserCreditsHistory(userId, gymId, args.limit);
      
      case 'getUpcomingBookings':
        return await getUpcomingBookings(userId, gymId, args.days);
      
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

// ============= NUOVE FUNZIONI AVANZATE =============

async function getCourseDetails(args: any, gymId: string) {
  const { data: courses, error } = await supabase
    .from('courses')
    .select(`
      id,
      name,
      description,
      difficulty_level,
      duration_minutes,
      credits_required,
      max_participants,
      requirements,
      benefits,
      equipment_needed,
      course_categories(name, description),
      instructors(first_name, last_name, bio, specializations),
      course_schedules(day_of_week, start_time, end_time, gym_rooms(name))
    `)
    .eq('gym_id', gymId)
    .ilike('name', `%${args.courseName}%`)
    .eq('is_active', true);

  if (error) throw error;

  if (!courses || courses.length === 0) {
    return new Response(JSON.stringify({
      response: `❌ Non ho trovato corsi con il nome "${args.courseName}". Prova a verificare il nome o chiedi la lista completa dei corsi disponibili.`
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const course = courses[0];
  const scheduleText = course.course_schedules.map((s: any) => {
    const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    return `${dayNames[s.day_of_week]} ${s.start_time}-${s.end_time} (${s.gym_rooms?.name || 'Sala TBD'})`;
  }).join('\n• ');

  const difficultyText = course.difficulty_level ? 
    ['Principiante', 'Intermedio', 'Avanzato', 'Esperto'][course.difficulty_level - 1] : 'N/A';

  const equipmentText = course.equipment_needed?.length ? 
    course.equipment_needed.join(', ') : 'Nessuno specifico';

  const instructorText = course.instructors ? 
    `${course.instructors.first_name} ${course.instructors.last_name}` : 'TBD';

  const response = `🏋️ **${course.name}**

📝 **Descrizione:** ${course.description || 'Descrizione non disponibile'}

👨‍🏫 **Istruttore:** ${instructorText}
📊 **Livello:** ${difficultyText}
⏱️ **Durata:** ${course.duration_minutes} minuti
💳 **Crediti:** ${course.credits_required}
👥 **Max partecipanti:** ${course.max_participants}

📅 **Orari:**
• ${scheduleText}

🎯 **Benefici:** ${course.benefits?.join(', ') || 'Miglioramento forma fisica generale'}
📋 **Requisiti:** ${course.requirements?.join(', ') || 'Nessuno specifico'}
🥊 **Attrezzatura:** ${equipmentText}

Vuoi prenotarti per questo corso? Dimmi per quale giorno!`;

  return new Response(JSON.stringify({
    response
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function getInstructorSchedule(args: any, gymId: string) {
  const { data: instructors, error } = await supabase
    .from('instructors')
    .select(`
      id,
      first_name,
      last_name,
      bio,
      specializations,
      courses(
        name,
        course_schedules(day_of_week, start_time, end_time, gym_rooms(name))
      )
    `)
    .eq('gym_id', gymId)
    .eq('is_active', true)
    .or(`first_name.ilike.%${args.instructorName}%,last_name.ilike.%${args.instructorName}%`);

  if (error) throw error;

  if (!instructors || instructors.length === 0) {
    return new Response(JSON.stringify({
      response: `❌ Non ho trovato istruttori con il nome "${args.instructorName}". Verifica il nome o chiedi la lista completa dello staff.`
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const instructor = instructors[0];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  
  let scheduleText = '';
  instructor.courses.forEach((course: any) => {
    course.course_schedules.forEach((schedule: any) => {
      scheduleText += `• ${dayNames[schedule.day_of_week]} ${schedule.start_time}-${schedule.end_time}: **${course.name}** (${schedule.gym_rooms?.name || 'Sala TBD'})\n`;
    });
  });

  const response = `👨‍🏫 **${instructor.first_name} ${instructor.last_name}**

${instructor.bio ? `📝 **Bio:** ${instructor.bio}\n` : ''}
${instructor.specializations?.length ? `🎯 **Specializzazioni:** ${instructor.specializations.join(', ')}\n` : ''}

📅 **Orari settimanali:**
${scheduleText || '• Nessun corso programmato al momento'}

${args.date ? `📌 Per una data specifica come ${args.date}, verifica la disponibilità dei singoli corsi.` : ''}

Vuoi prenotarti per uno dei suoi corsi?`;

  return new Response(JSON.stringify({
    response
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function getUserStats(userId: string, gymId: string, period: string = 'month') {
  const now = new Date();
  let startDate = new Date();
  
  switch (period) {
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setMonth(now.getMonth() - 1);
  }

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      id,
      status,
      scheduled_date,
      courses!inner(name, gym_id)
    `)
    .eq('user_id', userId)
    .eq('courses.gym_id', gymId)
    .gte('scheduled_date', startDate.toISOString().split('T')[0]);

  if (error) throw error;

  const totalBookings = bookings?.length || 0;
  const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0;
  const cancelledBookings = bookings?.filter(b => b.status === 'cancelled').length || 0;
  const attendanceRate = totalBookings > 0 ? ((completedBookings / totalBookings) * 100).toFixed(1) : '0';

  // Conta corsi per tipo
  const courseTypes = bookings?.reduce((acc: any, booking) => {
    if (booking.status === 'completed') {
      acc[booking.courses.name] = (acc[booking.courses.name] || 0) + 1;
    }
    return acc;
  }, {}) || {};

  const topCourse = Object.keys(courseTypes).reduce((a, b) => 
    courseTypes[a] > courseTypes[b] ? a : b, 'Nessuno');

  const periodText = period === 'week' ? 'ultima settimana' : 
                    period === 'month' ? 'ultimo mese' : 'ultimo anno';

  const response = `📊 **Le tue statistiche (${periodText})**

🏋️ **Allenamenti:**
• Totali: ${totalBookings}
• Completati: ${completedBookings}
• Cancellati: ${cancelledBookings}
• Tasso di partecipazione: ${attendanceRate}%

${Object.keys(courseTypes).length > 0 ? `🥇 **Corso preferito:** ${topCourse} (${courseTypes[topCourse]} volte)

📈 **Breakdown corsi:**
${Object.entries(courseTypes).map(([course, count]) => `• ${course}: ${count} volte`).join('\n')}` : ''}

${completedBookings >= 10 ? '🏆 **Ottimo lavoro!** Stai mantenendo una routine costante!' : 
  completedBookings >= 5 ? '💪 **Bene!** Continua così!' : 
  '🚀 **Forza!** Prenota più lezioni per migliorare le tue statistiche!'}

Vuoi vedere le statistiche per un altro periodo?`;

  return new Response(JSON.stringify({
    response
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function getUserCreditsHistory(userId: string, gymId: string, limit: number = 10) {
  const { data: transactions, error } = await supabase
    .from('credits_transactions')
    .select('amount, transaction_type, description, created_at')
    .eq('user_id', userId)
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  if (!transactions || transactions.length === 0) {
    return new Response(JSON.stringify({
      response: '📝 Non hai ancora transazioni crediti per questa palestra.'
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const transactionList = transactions.map(t => {
    const date = new Date(t.created_at).toLocaleDateString('it-IT');
    const icon = t.amount > 0 ? '➕' : '➖';
    const amountText = t.amount > 0 ? `+${t.amount}` : t.amount.toString();
    return `${icon} ${amountText} crediti - ${t.description} (${date})`;
  }).join('\n');

  const response = `💳 **Storico crediti (ultimi ${limit})**

${transactionList}

💡 **Suggerimento:** Usa i crediti regolarmente per mantenere una routine di allenamento costante!`;

  return new Response(JSON.stringify({
    response
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function getUpcomingBookings(userId: string, gymId: string, days: number = 7) {
  console.log(`[getUpcomingBookings] Input - userId: ${userId}, gymId: ${gymId}, days: ${days}`);
  
  // Validazione parametri di input
  if (!userId || !gymId) {
    console.error('[getUpcomingBookings] Missing required parameters');
    return new Response(JSON.stringify({
      response: '❌ Errore: parametri mancanti per recuperare le prenotazioni.'
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + days);
  
  console.log(`[getUpcomingBookings] Date range: ${now.toISOString().split('T')[0]} to ${futureDate.toISOString().split('T')[0]}`);

  const { data: bookings, error } = await supabase
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
    .eq('status', 'confirmed')
    .gte('scheduled_date', now.toISOString().split('T')[0])
    .lte('scheduled_date', futureDate.toISOString().split('T')[0])
    .order('scheduled_date')
    .order('scheduled_time');

  console.log(`[getUpcomingBookings] Query result - error: ${error}, bookings count: ${bookings?.length || 0}`);
  
  if (error) {
    console.error('[getUpcomingBookings] Database error:', error);
    return new Response(JSON.stringify({
      response: '❌ Errore nel recuperare le prenotazioni. Riprova tra poco.'
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!bookings || bookings.length === 0) {
    console.log('[getUpcomingBookings] No upcoming bookings found');
    return new Response(JSON.stringify({
      response: `📅 Non hai prenotazioni confermate nei prossimi ${days} giorni. 

💡 **Suggerimento:** Prenota un corso ora per mantenere la tua routine di allenamento!

Vuoi vedere i corsi disponibili?`
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log(`[getUpcomingBookings] Found ${bookings.length} upcoming bookings`);
  
  const upcomingList = bookings.map((booking, index) => {
    console.log(`[getUpcomingBookings] Processing booking ${index + 1}:`, booking);
    const date = new Date(booking.scheduled_date).toLocaleDateString('it-IT');
    const courseName = booking.courses?.name || 'Corso sconosciuto';
    return `📅 ${courseName} - ${date} alle ${booking.scheduled_time}`;
  }).join('\n');

  const response = `🗓️ **Le tue prossime lezioni (${days} giorni)**

${upcomingList}

🎯 **Preparati!** ${bookings.length === 1 ? 'Hai 1 lezione' : `Hai ${bookings.length} lezioni`} in programma.

Vuoi cancellare qualche prenotazione o prenotarne di nuove?`;

  console.log('[getUpcomingBookings] Response prepared successfully');
  
  return new Response(JSON.stringify({
    response
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}