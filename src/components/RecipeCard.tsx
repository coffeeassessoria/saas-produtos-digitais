import { Link } from 'react-router-dom';
import { DbRecipe, categoryLabels, categoryColors } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Heart } from 'lucide-react';
import { useFavoriteIds, useToggleFavorite } from '@/hooks/useFavorites';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface RecipeCardProps {
  recipe: DbRecipe;
}

const RecipeCard = ({ recipe }: RecipeCardProps) => {
  const { data: favoriteIds = [] } = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();
  const { toast } = useToast();
  
  const isFavorite = favoriteIds.includes(recipe.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
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
      }
    );
  };

  return (
    <Link to={`/recipe/${recipe.id}`}>
      <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow touch-manipulation">
        <div className="flex gap-4 p-4">
          {/* Image - larger for accessibility */}
          <div className="w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-muted">
            {recipe.image_url ? (
              <img
                src={recipe.image_url}
                alt={recipe.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-3xl">
                🍽️
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 flex flex-col justify-between py-1">
            <div>
              {/* Title - larger font */}
              <h3 className="font-semibold text-lg text-foreground line-clamp-2 mb-2 leading-tight">
                {recipe.title}
              </h3>
              <Badge 
                variant="secondary" 
                className={cn('text-sm font-medium px-3 py-1', categoryColors[recipe.category])}
              >
                {categoryLabels[recipe.category]}
              </Badge>
            </div>
            
            {/* Meta row */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{recipe.prep_time} min</span>
              </div>
              
              {/* Favorite button - larger touch target */}
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-11 w-11 rounded-full',
                  isFavorite && 'text-red-500 hover:text-red-600'
                )}
                onClick={handleFavoriteClick}
                disabled={toggleFavorite.isPending}
              >
                <Heart 
                  className={cn('w-5 h-5', isFavorite && 'fill-current')} 
                />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default RecipeCard;
