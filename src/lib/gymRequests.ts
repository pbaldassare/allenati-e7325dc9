import { supabase } from '@/integrations/supabase/client';

// Edge function per approvare/rifiutare richieste di accesso
export async function approveGymRequest(requestId: string) {
  const { data, error } = await supabase.functions.invoke('approve-gym-request', {
    body: { requestId, action: 'approve' }
  });
  
  if (error) throw error;
  return data;
}

export async function rejectGymRequest(requestId: string, reason?: string) {
  const { data, error } = await supabase.functions.invoke('approve-gym-request', {
    body: { requestId, action: 'reject', reason }
  });
  
  if (error) throw error;
  return data;
}