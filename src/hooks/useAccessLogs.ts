import { supabase } from '@/integrations/supabase/client';

// Log user access events (login/logout)
export const logAccessEvent = async (
  userId: string,
  email: string,
  eventType: 'login' | 'logout'
) => {
  try {
    const { error } = await supabase
      .from('user_access_logs')
      .insert({
        user_id: userId,
        email: email,
        event_type: eventType,
        user_agent: navigator.userAgent,
      });

    if (error) {
      console.error('Error logging access event:', error);
    }
  } catch (err) {
    console.error('Error in logAccessEvent:', err);
  }
};
