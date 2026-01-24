import { useState, useMemo } from 'react';
import UserLayout from '@/components/layout/UserLayout';
import RecipeCard from '@/components/RecipeCard';
import { useFavoriteRecipes } from '@/hooks/useFavorites';
import { RecipeCategory, categoryLabels } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const Favorites = () => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | 'all'>('all');
  
  const { data: recipes = [], isLoading } = useFavoriteRecipes();

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      const matchesSearch = recipe.title.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || recipe.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [recipes, search, selectedCategory]);

  const categories: Array<{ value: RecipeCategory | 'all'; label: string }> = [
    { value: 'all', label: 'Todas' },
    { value: 'breakfast', label: categoryLabels.breakfast },
    { value: 'lunch', label: categoryLabels.lunch },
    { value: 'dinner', label: categoryLabels.dinner },
    { value: 'snack', label: categoryLabels.snack },
    { value: 'dessert', label: categoryLabels.dessert },
  ];

  return (
    <UserLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <Heart className="w-6 h-6 text-red-500 fill-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Favoritos</h1>
            <p className="text-muted-foreground">
              {recipes.length} {recipes.length === 1 ? 'receita salva' : 'receitas salvas'}
            </p>
          </div>
        </div>

        {/* Search - larger for accessibility */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar nos favoritos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 pr-12 h-14 text-lg rounded-xl"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1"
            >
              <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Category Filters - larger buttons */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {categories.map((cat) => (
            <Button
              key={cat.value}
              variant={selectedCategory === cat.value ? 'default' : 'outline'}
              size="lg"
              onClick={() => setSelectedCategory(cat.value)}
              className={cn(
                'flex-shrink-0 h-12 px-5 text-base rounded-xl',
                selectedCategory === cat.value && 'shadow-sm'
              )}
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {/* Recipes List */}
        <div className="space-y-4">
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4 p-4 bg-card rounded-xl">
                <Skeleton className="w-28 h-28 rounded-xl" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ))
          ) : filteredRecipes.length > 0 ? (
            filteredRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))
          ) : recipes.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <Heart className="w-16 h-16 mx-auto text-muted-foreground/40" />
              <div>
                <p className="text-xl font-medium text-foreground">Nenhum favorito ainda</p>
                <p className="text-muted-foreground mt-1">
                  Toque no coração nas receitas para salvar aqui
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">Nenhuma receita encontrada</p>
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
};

export default Favorites;
