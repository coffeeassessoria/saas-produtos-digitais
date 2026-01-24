import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface RecipeSuggestion {
  id: string;
  user_id: string;
  user_email: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'completed';
  vote_count: number;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface RecipeSuggestionVote {
  id: string;
  suggestion_id: string;
  user_id: string;
  created_at: string;
}

// Fetch all suggestions (for users to see and vote)
export const useRecipeSuggestions = () => {
  return useQuery({
    queryKey: ['recipe-suggestions'],
    queryFn: async (): Promise<RecipeSuggestion[]> => {
      const { data, error } = await supabase
        .from('recipe_suggestions')
        .select('*')
        .order('vote_count', { ascending: false });

      if (error) throw error;
      return (data || []) as RecipeSuggestion[];
    },
  });
};

// Fetch user's own votes
export const useUserVotes = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-suggestion-votes', user?.id],
    queryFn: async (): Promise<RecipeSuggestionVote[]> => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('recipe_suggestion_votes')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return (data || []) as RecipeSuggestionVote[];
    },
    enabled: !!user?.id,
  });
};

// Create a new suggestion
export const useCreateSuggestion = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ title, description }: { title: string; description?: string }) => {
      if (!user?.id || !user?.email) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('recipe_suggestions')
        .insert({
          user_id: user.id,
          user_email: user.email,
          title,
          description,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-suggestions'] });
    },
  });
};

// Toggle vote on a suggestion
export const useToggleVote = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ suggestionId, hasVoted }: { suggestionId: string; hasVoted: boolean }) => {
      if (!user?.id) throw new Error('User not authenticated');

      if (hasVoted) {
        // Remove vote
        const { error } = await supabase
          .from('recipe_suggestion_votes')
          .delete()
          .eq('suggestion_id', suggestionId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Add vote
        const { error } = await supabase
          .from('recipe_suggestion_votes')
          .insert({
            suggestion_id: suggestionId,
            user_id: user.id,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['user-suggestion-votes'] });
    },
  });
};

// Admin: Update suggestion status
export const useUpdateSuggestionStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      admin_notes 
    }: { 
      id: string; 
      status: RecipeSuggestion['status']; 
      admin_notes?: string;
    }) => {
      const { error } = await supabase
        .from('recipe_suggestions')
        .update({ status, admin_notes })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-suggestions'] });
    },
  });
};
