import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import UserLayout from '@/components/layout/UserLayout';
import RecipeCard from '@/components/RecipeCard';
import RecipeSuggestionBanner from '@/components/RecipeSuggestionBanner';
import { useRecipesByModule } from '@/hooks/useRecipes';
import { useModuleBySlug } from '@/hooks/useModules';
import { RecipeCategory, categoryLabels } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const ModuleRecipes = () => {
  const { id: slug } = useParams<{ id: string }>();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | 'all'>('all');

  const { data: module, isLoading: moduleLoading } = useModuleBySlug(slug || '');
  
  // Use module slug for recipe query
  const { data: moduleRecipes = [], isLoading: recipesLoading } = useRecipesByModule(slug || '');

  const isLoading = moduleLoading || recipesLoading;

  const filteredRecipes = useMemo(() => {
    return moduleRecipes.filter((recipe) => {
      const matchesSearch = recipe.title.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || recipe.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [moduleRecipes, search, selectedCategory]);

  const categories: Array<{ value: RecipeCategory | 'all'; label: string }> = [
    { value: 'all', label: 'Todas' },
    { value: 'breakfast', label: categoryLabels.breakfast },
    { value: 'lunch', label: categoryLabels.lunch },
    { value: 'dinner', label: categoryLabels.dinner },
    { value: 'snack', label: categoryLabels.snack },
    { value: 'dessert', label: categoryLabels.dessert },
  ];

  if (moduleLoading) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </UserLayout>
    );
  }

  if (!module) {
    return (
      <UserLayout>
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">Módulo não encontrado</p>
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
        {/* Recipe Suggestion Banner */}
        <RecipeSuggestionBanner />
        {/* Breadcrumb - larger */}
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="flex items-center gap-1 text-base text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Início</span>
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-base font-semibold text-foreground">{module.name}</span>
        </div>

        {/* Header - larger image and text */}
        <div className="relative rounded-2xl overflow-hidden">
          <img
            src={module.cover_image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'}
            alt={module.name}
            className="w-full h-40 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h1 className="text-2xl font-bold text-white">{module.name}</h1>
            <p className="text-base text-white/90 mt-1">
              {moduleRecipes.length} {moduleRecipes.length === 1 ? 'receita' : 'receitas'}
            </p>
          </div>
        </div>

        {/* Search - larger for accessibility */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar receita..."
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

        {/* Category Filters - larger buttons for accessibility */}
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
          {recipesLoading ? (
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

export default ModuleRecipes;
