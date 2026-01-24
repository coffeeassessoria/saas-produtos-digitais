import UserLayout from '@/components/layout/UserLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Check, BookOpen, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const Store = () => {
  const { user } = useAuth();

  // Fetch all modules
  const { data: allModules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ['store-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch user's unlocked modules
  const { data: userModules = [], isLoading: userModulesLoading } = useQuery({
    queryKey: ['user-modules', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const { data, error } = await supabase
        .from('user_modules')
        .select('module_id')
        .eq('email', user.email);
      if (error) throw error;
      return data?.map(m => m.module_id) || [];
    },
    enabled: !!user?.email,
  });

  // Fetch recipe counts per module
  const { data: recipeCounts = {} } = useQuery({
    queryKey: ['recipe-counts'],
    queryFn: async () => {
      const { data } = await supabase.from('recipes').select('module');
      const counts: Record<string, number> = {};
      data?.forEach(r => {
        // Match by module name (recipes.module stores module name)
        counts[r.module] = (counts[r.module] || 0) + 1;
      });
      return counts;
    },
  });

  // Filter to show only locked modules (modules user doesn't have access to)
  const lockedModules = allModules.filter(m => !userModules.includes(m.slug));

  const isLoading = modulesLoading || userModulesLoading;

  return (
    <UserLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Loja</h1>
          <p className="text-muted-foreground mt-1">Desbloqueie novos módulos de receitas</p>
        </div>

        {/* Store Items */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : lockedModules.length > 0 ? (
            lockedModules.map((module) => (
              <Card key={module.id} className="overflow-hidden border-0 shadow-sm">
                <div className="relative aspect-[21/9]">
                  {module.cover_image ? (
                    <img
                      src={module.cover_image}
                      alt={module.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-lg font-bold text-white">{module.name}</h3>
                    <p className="text-sm text-white/80">{module.description}</p>
                  </div>
                </div>
                <CardContent className="p-4 space-y-4">
                  {/* Benefits */}
                  {module.benefits && module.benefits.length > 0 && (
                    <ul className="space-y-2">
                      {module.benefits.map((benefit: string, index: number) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-foreground">
                          <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Recipe Count */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="w-4 h-4" />
                    <span>{recipeCounts[module.name] || 0} receitas exclusivas</span>
                  </div>

                  {/* CTA */}
                  {module.kiwify_checkout_url ? (
                    <Button asChild className="w-full h-12">
                      <a
                        href={module.kiwify_checkout_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <span>Comprar na Kiwify</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  ) : (
                    <Button disabled className="w-full h-12">
                      Em breve
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Você já possui todos os módulos! 🎉</p>
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
};

export default Store;