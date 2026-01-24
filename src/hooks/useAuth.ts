import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { logAccessEvent } from './useAccessLogs';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  isAdminLoading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    isLoading: true,
    isAdmin: false,
    isAdminLoading: true,
  });

  useEffect(() => {
    // Function to sync user_modules with user_id
    const syncUserModules = async (userId: string, email: string) => {
      try {
        const { error } = await supabase
          .from('user_modules')
          .update({ user_id: userId })
          .eq('email', email)
          .is('user_id', null);
        
        if (error) {
          console.error('Error syncing user_modules:', error);
        } else {
          console.log('User modules synced for:', email);
        }
      } catch (err) {
        console.error('Error in syncUserModules:', err);
      }
    };

    // Function to check admin role
    const checkAdminRole = async (userId: string) => {
      try {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .maybeSingle();
        
        setAuthState(prev => ({
          ...prev,
          isAdmin: !!roleData,
          isAdminLoading: false,
        }));
      } catch (err) {
        console.error('Error checking admin role:', err);
        setAuthState(prev => ({
          ...prev,
          isAdminLoading: false,
        }));
      }
    };

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (session?.user) {
          // Sync user_modules and log access when user signs in
          if (event === 'SIGNED_IN' && session.user.email) {
            syncUserModules(session.user.id, session.user.email);
            logAccessEvent(session.user.id, session.user.email, 'login');
          }
          
          // Log logout event
          if (event === 'SIGNED_OUT') {
            // Note: user info might not be available here
          }

          setAuthState(prev => ({
            ...prev,
            session,
            user: session.user,
            isLoading: false,
            isAdminLoading: true,
          }));

          // Check admin role
          checkAdminRole(session.user.id);
        } else {
          setAuthState({
            session: null,
            user: null,
            isLoading: false,
            isAdmin: false,
            isAdminLoading: false,
          });
        }
      }
    );

    // Then get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuthState(prev => ({
          ...prev,
          session,
          user: session.user,
          isLoading: false,
          isAdminLoading: true,
        }));
        checkAdminRole(session.user.id);
      } else {
        setAuthState({
          session: null,
          user: null,
          isLoading: false,
          isAdmin: false,
          isAdminLoading: false,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithOtp = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    ...authState,
    signInWithOtp,
    signOut,
  };
};
