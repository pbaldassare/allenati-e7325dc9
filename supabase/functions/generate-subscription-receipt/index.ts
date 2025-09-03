import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import jsPDF from "https://esm.sh/jspdf@2.5.1";

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
    // Check environment variables first
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    console.log('Environment check - URL exists:', !!supabaseUrl);
    console.log('Environment check - Service role key exists:', !!serviceRoleKey);
    
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing required environment variables');
    }

    // Initialize Supabase client with service role key for database access
    const supabaseClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      { 
        auth: { persistSession: false },
        db: { schema: 'public' }
      }
    );

    const { subscriptionId } = await req.json();
    
    if (!subscriptionId) {
      throw new Error('ID abbonamento non fornito');
    }

    console.log('Generating receipt for subscription:', subscriptionId);

    // Test basic connectivity first
    const { data: testConnection, error: testError } = await supabaseClient
      .from('user_subscriptions')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('Database connection test failed:', testError);
      throw new Error('Impossibile connettersi al database');
    }
    
    console.log('Database connection test successful');

    // Get subscription details first
    const { data: subscription, error: subError } = await supabaseClient
      .from('user_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .maybeSingle();

    if (subError || !subscription) {
      console.error('Subscription query error:', subError);
      throw new Error('Abbonamento non trovato');
    }

    console.log('Found subscription:', subscription.id, 'for user:', subscription.user_id);

    // Get subscription plan details
    const { data: plan, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('name, price, duration_days, credits_included, unlimited_access')
      .eq('id', subscription.plan_id)
      .maybeSingle();

    if (planError) {
      console.error('Plan query error:', planError);
      throw new Error('Errore nel recupero del piano abbonamento');
    }
    
    if (!plan) {
      console.error('Plan not found for ID:', subscription.plan_id);
      throw new Error('Piano abbonamento non trovato');
    }

    console.log('Found plan:', plan.name);

    // Get user profile details including residence
    const { data: user, error: userError } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name, fiscal_code, email, address, city, postal_code')
      .eq('user_id', subscription.user_id)
      .maybeSingle();

    if (userError) {
      console.error('User query error:', userError);
      throw new Error('Errore nel recupero dati utente');
    }
    
    if (!user) {
      console.error('User not found for ID:', subscription.user_id);
      throw new Error('Dati utente non trovati');
    }

    console.log('Found user:', user.first_name, user.last_name);

    // Get gym details
    const { data: gym, error: gymError } = await supabaseClient
      .from('gyms')
      .select('name, address, city, postal_code, phone, email, logo_url, business_name, partita_iva, codice_fiscale')
      .eq('id', subscription.gym_id)
      .maybeSingle();

    if (gymError) {
      console.error('Gym query error:', gymError);
      throw new Error('Errore nel recupero dati palestra');
    }
    
    if (!gym) {
      console.error('Gym not found for ID:', subscription.gym_id);
      throw new Error('Dati palestra non trovati');
    }

    console.log('Found gym:', gym.name);

    // Generate receipt number (timestamp-based for uniqueness)
    const receiptNumber = `RIC-${subscription.id.substring(0, 8)}-${Date.now()}`;
    
    // Format dates
    const issueDate = new Date().toLocaleDateString('it-IT');
    const startDate = new Date(subscription.starts_at).toLocaleDateString('it-IT');
    const endDate = new Date(subscription.expires_at).toLocaleDateString('it-IT');

    console.log('Creating PDF with jsPDF...');

    // Create PDF using jsPDF
    const doc = new jsPDF();
    
    // Set up colors
    const primaryColor = [74, 144, 226]; // #4A90E2
    const textColor = [51, 51, 51]; // #333
    const lightGray = [102, 102, 102]; // #666
    const greenColor = [39, 174, 96]; // #27AE60
    
    let yPosition = 20;
    
    // Logo temporarily disabled to prevent PDF rendering issues
    
    // Header - Gym name (use business name if available)
    doc.setFontSize(20);
    doc.setTextColor(...primaryColor);
    const displayName = gym.business_name || gym.name;
    doc.text(displayName, 105, yPosition, { align: 'center' });
    yPosition += 8;
    
    // Gym address
    doc.setFontSize(10);
    doc.setTextColor(...lightGray);
    const gymAddress = `${gym.address}, ${gym.city}${gym.postal_code ? ` ${gym.postal_code}` : ''}`;
    doc.text(gymAddress, 105, yPosition, { align: 'center' });
    yPosition += 5;
    
    // Gym contacts and fiscal data
    if (gym.phone || gym.email) {
      const contacts = `${gym.phone ? `Tel: ${gym.phone}` : ''}${gym.phone && gym.email ? ' | ' : ''}${gym.email ? `Email: ${gym.email}` : ''}`;
      doc.text(contacts, 105, yPosition, { align: 'center' });
      yPosition += 5;
    }
    
    // Add fiscal information if available
    if (gym.partita_iva || gym.codice_fiscale) {
      const fiscalData = `${gym.partita_iva ? `P.IVA: ${gym.partita_iva}` : ''}${gym.partita_iva && gym.codice_fiscale ? ' | ' : ''}${gym.codice_fiscale ? `C.F.: ${gym.codice_fiscale}` : ''}`;
      doc.text(fiscalData, 105, yPosition, { align: 'center' });
      yPosition += 5;
    }
    
    yPosition += 10;
    
    // Horizontal line under header
    doc.setDrawColor(...textColor);
    doc.setLineWidth(0.5);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 15;
    
    // Receipt title
    doc.setFontSize(22);
    doc.setTextColor(...textColor);
    doc.text('RICEVUTA FISCALE', 105, yPosition, { align: 'center' });
    yPosition += 15;
    
    // Receipt date (right aligned)
    doc.setFontSize(10);
    doc.setTextColor(...lightGray);
    doc.text(`Data emissione: ${issueDate}`, 190, yPosition, { align: 'right' });
    yPosition += 20;
    
    // Customer data section
    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.text('Dati Cliente', 20, yPosition);
    yPosition += 8;
    
    // Calculate customer section height based on available data
    let customerSectionHeight = 18; // Base height for name and email
    if (user.fiscal_code) customerSectionHeight += 6;
    if (user.address && user.city) customerSectionHeight += 6;
    
    // Section background
    doc.setFillColor(248, 249, 250);
    doc.rect(20, yPosition - 3, 170, customerSectionHeight, 'F');
    
    // Left border accent
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(2);
    doc.line(20, yPosition - 3, 20, yPosition + customerSectionHeight - 3);
    
    // Customer info
    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    doc.text('Nome e Cognome:', 25, yPosition);
    doc.text(`${user.first_name} ${user.last_name}`, 90, yPosition);
    yPosition += 6;
    
    doc.text('Email:', 25, yPosition);
    doc.text(user.email, 90, yPosition);
    yPosition += 6;
    
    if (user.fiscal_code) {
      doc.text('Codice Fiscale:', 25, yPosition);
      doc.text(user.fiscal_code, 90, yPosition);
      yPosition += 6;
    }
    
    // Add residence if available
    if (user.address && user.city) {
      doc.text('Residenza:', 25, yPosition);
      const residence = `${user.address}, ${user.city}${user.postal_code ? ` ${user.postal_code}` : ''}`;
      doc.text(residence, 90, yPosition);
      yPosition += 6;
    }
    
    yPosition += 15;
    
    // Subscription details section
    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.text('Dettagli Abbonamento', 20, yPosition);
    yPosition += 8;
    
    // Calculate section height (reduced since we removed "Tipo")
    let subscriptionHeight = 30;
    if (plan.credits_included && !plan.unlimited_access) subscriptionHeight += 6;
    
    // Section background
    doc.setFillColor(248, 249, 250);
    doc.rect(20, yPosition - 3, 170, subscriptionHeight, 'F');
    
    // Left border accent
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(2);
    doc.line(20, yPosition - 3, 20, yPosition + subscriptionHeight - 3);
    
    // Subscription details
    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    
    doc.text('Piano:', 25, yPosition);
    doc.text(plan.name, 90, yPosition);
    yPosition += 6;
    
    doc.text('Durata:', 25, yPosition);
    doc.text(`${plan.duration_days} giorni`, 90, yPosition);
    yPosition += 6;
    
    doc.text('Periodo:', 25, yPosition);
    doc.text(`dal ${startDate} al ${endDate}`, 90, yPosition);
    yPosition += 6;
    
    
    if (plan.credits_included && !plan.unlimited_access) {
      doc.text('Crediti inclusi:', 25, yPosition);
      doc.text(`${plan.credits_included}`, 90, yPosition);
      yPosition += 6;
    }
    
    yPosition += 15;
    
    // Amount section with highlighted background
    doc.setFillColor(249, 249, 249);
    doc.rect(20, yPosition - 3, 170, 20, 'F');
    doc.setDrawColor(204, 204, 204);
    doc.setLineWidth(0.5);
    doc.rect(20, yPosition - 3, 170, 20);
    
    doc.setFontSize(16);
    doc.setTextColor(...greenColor);
    const amount = `Euro ${plan.price ? parseFloat(plan.price).toFixed(2) : '0.00'}`;
    doc.text('Importo:', 25, yPosition + 8);
    doc.text(amount, 90, yPosition + 8);
    yPosition += 25;
    
    // Thank you message
    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text(`Grazie per aver scelto ${gym.name}!`, 105, yPosition, { align: 'center' });
    yPosition += 15;
    
    
    // Generate PDF as ArrayBuffer
    const pdfBuffer = doc.output('arraybuffer');

    console.log('PDF generated successfully for subscription:', subscriptionId);

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ricevuta-abbonamento-${receiptNumber}.pdf"`
      }
    });

  } catch (error) {
    console.error('Error generating receipt:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Errore nella generazione della ricevuta' 
    }), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    });
  }
});