import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DbRecipe } from '@/types';

interface UserFavorite {
  id: string;
  user_id: string;
  recipe_id: string;
  created_at: string;
}

// Fetch user's favorite recipe IDs
export const useFavoriteIds = () => {
  return useQuery({
    queryKey: ['favorites'],
    queryFn: async (): Promise<string[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_favorites')
        .select('recipe_id')
        .eq('user_id', user.id);

      if (error) throw error;
      return (data || []).map((f: { recipe_id: string }) => f.recipe_id);
    },
  });
};

// Fetch user's favorite recipes with full details
export const useFavoriteRecipes = () => {
  return useQuery({
    queryKey: ['favorite-recipes'],
    queryFn: async (): Promise<DbRecipe[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // First get favorite IDs
      const { data: favorites, error: favError } = await supabase
        .from('user_favorites')
        .select('recipe_id')
        .eq('user_id', user.id);

      if (favError) throw favError;
      if (!favorites || favorites.length === 0) return [];

      const recipeIds = favorites.map((f: { recipe_id: string }) => f.recipe_id);

      // Then fetch the recipes
      const { data: recipes, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .in('id', recipeIds)
        .order('title');

      if (recipeError) throw recipeError;
      return (recipes || []) as DbRecipe[];
    },
  });
};

// Toggle favorite status
export const useToggleFavorite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recipeId, isFavorite }: { recipeId: string; isFavorite: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Você precisa estar logado para favoritar receitas');

      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('recipe_id', recipeId);

        if (error) throw error;
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('user_favorites')
          .insert({ user_id: user.id, recipe_id: recipeId });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['favorite-recipes'] });
    },
  });
};

// Check if a recipe is favorited
export const useIsFavorite = (recipeId: string) => {
  const { data: favoriteIds = [] } = useFavoriteIds();
  return favoriteIds.includes(recipeId);
};
