import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DbRecipe, RecipeCategory } from '@/types';

// Fetch all recipes
export const useRecipes = () => {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: async (): Promise<DbRecipe[]> => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('title');

      if (error) throw error;
      return (data || []) as DbRecipe[];
    },
  });
};

// Fetch recipes by module slug
export const useRecipesByModule = (moduleSlug: string) => {
  return useQuery({
    queryKey: ['recipes', 'module', moduleSlug],
    queryFn: async (): Promise<DbRecipe[]> => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('module', moduleSlug)
        .order('title');

      if (error) throw error;
      return (data || []) as DbRecipe[];
    },
    enabled: !!moduleSlug,
  });
};

// Fetch single recipe by ID
export const useRecipe = (id: string) => {
  return useQuery({
    queryKey: ['recipe', id],
    queryFn: async (): Promise<DbRecipe | null> => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as DbRecipe | null;
    },
    enabled: !!id,
  });
};

// Fetch recipes by category
export const useRecipesByCategory = (category: RecipeCategory) => {
  return useQuery({
    queryKey: ['recipes', 'category', category],
    queryFn: async (): Promise<DbRecipe[]> => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('category', category)
        .order('title');

      if (error) throw error;
      return (data || []) as DbRecipe[];
    },
    enabled: !!category,
  });
};
