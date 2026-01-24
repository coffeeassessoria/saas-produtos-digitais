import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface DbModule {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  kiwify_checkout_url: string | null;
  benefits: string[];
  display_order: number;
  is_active: boolean;
}

export interface ModuleWithAccess extends DbModule {
  isUnlocked: boolean;
  recipeCount: number;
}

// Fetch all active modules with user access info
export const useModulesWithAccess = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['modules-with-access', user?.id],
    queryFn: async (): Promise<ModuleWithAccess[]> => {
      // Get all active modules
      const { data: modules, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (modulesError) throw modulesError;

      // Get user's unlocked modules - check by user_id OR email
      let userModuleSlugs: string[] = [];
      if (user) {
        // Try to get by user_id first
        const { data: userModulesByUserId } = await supabase
          .from('user_modules')
          .select('module_id')
          .eq('user_id', user.id);

        // Also try to get by email (for users imported before login)
        const { data: userModulesByEmail } = await supabase
          .from('user_modules')
          .select('module_id')
          .eq('email', user.email || '');

        // Combine results and remove duplicates
        const allModules = [...(userModulesByUserId || []), ...(userModulesByEmail || [])];
        userModuleSlugs = [...new Set(allModules.map(m => m.module_id))];
      }

      // Get recipe counts per module
      const { data: recipes } = await supabase
        .from('recipes')
        .select('module');

      const recipeCounts: Record<string, number> = {};
      (recipes || []).forEach(r => {
        // Match module name to slug
        const moduleSlug = r.module.toLowerCase().replace(/\s+/g, '-');
        recipeCounts[moduleSlug] = (recipeCounts[moduleSlug] || 0) + 1;
        // Also try exact match
        recipeCounts[r.module] = (recipeCounts[r.module] || 0) + 1;
      });

      // Combine data - "controle-glicemico" is always unlocked for all users
      const alwaysUnlockedSlugs = ['controle-glicemico'];
      
      return (modules || []).map(module => ({
        ...module,
        isUnlocked: alwaysUnlockedSlugs.includes(module.slug) || userModuleSlugs.includes(module.slug),
        recipeCount: recipeCounts[module.slug] || recipeCounts[module.name] || 0,
      })) as ModuleWithAccess[];
    },
    enabled: true,
  });
};

// Fetch a single module by slug
export const useModuleBySlug = (slug: string) => {
  return useQuery({
    queryKey: ['module', slug],
    queryFn: async (): Promise<DbModule | null> => {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data as DbModule | null;
    },
    enabled: !!slug,
  });
};
