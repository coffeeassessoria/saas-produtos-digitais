import { useParams, Link } from 'react-router-dom';
import UserLayout from '@/components/layout/UserLayout';
import { useRecipe } from '@/hooks/useRecipes';
import { useFavoriteIds, useToggleFavorite } from '@/hooks/useFavorites';
import { categoryLabels, categoryColors } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Clock, Heart, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const RecipeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: recipe, isLoading } = useRecipe(id || '');
  const { data: favoriteIds = [] } = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();
  const { toast } = useToast();
  
  const isFavorite = recipe ? favoriteIds.includes(recipe.id) : false;

  // Fetch module data from database
  const { data: module } = useQuery({
    queryKey: ['module-by-name', recipe?.module],
    queryFn: async () => {
      if (!recipe?.module) return null;
      const { data, error } = await supabase
        .from('modules')
        .select('id, name, slug')
        .eq('name', recipe.module)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!recipe?.module,
  });

  const handleFavoriteClick = () => {
    if (!recipe) return;
    
    toggleFavorite.mutate(
      { recipeId: recipe.id, isFavorite },
      {
        onError: (error: Error) => {
          toast({
            title: 'Erro',
            description: error.message,
            variant: 'destructive',
          });
        },
        onSuccess: () => {
          toast({
            title: isFavorite ? 'Removido dos favoritos' : 'Adicionado aos favoritos',
            description: isFavorite 
              ? 'Receita removida da sua lista' 
              : 'Receita salva na sua lista de favoritos',
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <UserLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="w-full aspect-video rounded-2xl" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        </div>
      </UserLayout>
    );
  }

  if (!recipe) {
    return (
      <UserLayout>
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">Receita não encontrada</p>
          <Link to="/" className="text-primary mt-4 inline-block text-lg font-medium">
            Voltar ao início
          </Link>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="space-y-6">
        {/* Back Button - larger and clearer */}
        <div className="flex items-center justify-between">
          <Link
            to={module ? `/module/${module.id}` : '/'}
            className="inline-flex items-center gap-2 text-base text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Voltar</span>
          </Link>
          
          {/* Favorite Button - prominent */}
          <Button
            variant={isFavorite ? 'default' : 'outline'}
            size="lg"
            onClick={handleFavoriteClick}
            disabled={toggleFavorite.isPending}
            className={cn(
              'h-12 px-5 rounded-xl gap-2',
              isFavorite && 'bg-red-500 hover:bg-red-600 text-white border-0'
            )}
          >
            <Heart className={cn('w-5 h-5', isFavorite && 'fill-current')} />
            <span className="text-base">{isFavorite ? 'Favoritado' : 'Favoritar'}</span>
          </Button>
        </div>

        {/* Hero Image - larger */}
        <div className="relative rounded-2xl overflow-hidden bg-muted">
          {recipe.image_url ? (
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="w-full aspect-[4/3] object-cover"
            />
          ) : (
            <div className="w-full aspect-[4/3] flex items-center justify-center text-6xl">
              🍽️
            </div>
          )}
        </div>

        {/* Title & Meta - larger fonts */}
        <div className="space-y-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
            {recipe.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <Badge className={cn('text-base px-4 py-1.5', categoryColors[recipe.category])}>
              {categoryLabels[recipe.category]}
            </Badge>
            <div className="flex items-center gap-2 text-base text-muted-foreground bg-muted px-4 py-1.5 rounded-full">
              <Clock className="w-5 h-5" />
              <span>{recipe.prep_time} minutos</span>
            </div>
          </div>
        </div>

        {/* Ingredients - larger text and spacing */}
        <section className="space-y-4 bg-card rounded-2xl p-5 border border-border">
          <h2 className="text-xl font-bold text-foreground">Ingredientes</h2>
          <ul className="space-y-3">
            {recipe.ingredients.map((ingredient, index) => (
              <li key={index} className="flex items-start gap-4">
                <span className="w-3 h-3 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span className="text-lg text-foreground leading-relaxed">{ingredient}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Instructions - larger text and spacing */}
        <section className="space-y-4 bg-card rounded-2xl p-5 border border-border">
          <h2 className="text-xl font-bold text-foreground">Modo de Preparo</h2>
          <ol className="space-y-5">
            {recipe.instructions.map((step, index) => (
              <li key={index} className="flex gap-4">
                <span className="w-9 h-9 rounded-full bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center flex-shrink-0">
                  {index + 1}
                </span>
                <span className="text-lg text-foreground pt-1 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Notes/Observations - highlighted section */}
        {recipe.notes && (
          <section className="bg-accent rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Dica Glicêmica</h2>
            </div>
            <p className="text-lg text-foreground/90 leading-relaxed">{recipe.notes}</p>
          </section>
        )}
      </div>
    </UserLayout>
  );
};

export default RecipeDetail;
