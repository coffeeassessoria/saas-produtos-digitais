import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRecipes } from '@/hooks/useRecipes';
import { DbRecipe, RecipeCategory, categoryLabels } from '@/types';
import { Plus, Pencil, Trash2, ImagePlus, Loader2, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useQuery } from '@tanstack/react-query';

const AdminRecipes = () => {
  const { data: recipes = [], isLoading } = useRecipes();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<DbRecipe | null>(null);
  const [generatingImageFor, setGeneratingImageFor] = useState<string | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [refiningRecipe, setRefiningRecipe] = useState<string | null>(null);
  const [refiningAll, setRefiningAll] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch real modules from database
  const { data: modules = [] } = useQuery({
    queryKey: ['admin-modules-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modules')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });
  
  const [formData, setFormData] = useState({
    title: '',
    module: '',
    category: 'lunch' as RecipeCategory,
    ingredients: '',
    instructions: '',
    prep_time: 30,
    notes: '',
  });

  const handleOpenDialog = (recipe?: DbRecipe) => {
    if (recipe) {
      setEditingRecipe(recipe);
      setFormData({
        title: recipe.title,
        module: recipe.module,
        category: recipe.category,
        ingredients: recipe.ingredients.join('\n'),
        instructions: recipe.instructions.join('\n'),
        prep_time: recipe.prep_time,
        notes: recipe.notes || '',
      });
    } else {
      setEditingRecipe(null);
      setFormData({
        title: '',
        module: '',
        category: 'lunch',
        ingredients: '',
        instructions: '',
        prep_time: 30,
        notes: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const recipeData = {
      title: formData.title,
      module: formData.module,
      category: formData.category,
      ingredients: formData.ingredients.split('\n').filter((i) => i.trim()),
      instructions: formData.instructions.split('\n').filter((i) => i.trim()),
      prep_time: formData.prep_time,
      notes: formData.notes || null,
    };

    try {
      if (editingRecipe) {
        const { error } = await supabase
          .from('recipes')
          .update(recipeData)
          .eq('id', editingRecipe.id);
        
        if (error) throw error;
        toast({ title: 'Receita atualizada com sucesso!' });
      } else {
        const { error } = await supabase
          .from('recipes')
          .insert(recipeData);
        
        if (error) throw error;
        toast({ title: 'Receita criada com sucesso!' });
      }
      
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      setIsDialogOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: 'Erro ao salvar receita', description: message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('recipes').delete().eq('id', id);
      if (error) throw error;
      
      toast({ title: 'Receita excluída com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: 'Erro ao excluir receita', description: message, variant: 'destructive' });
    }
  };

  const handleGenerateImage = async (recipe: DbRecipe) => {
    setGeneratingImageFor(recipe.id);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-recipe-image', {
        body: {
          recipeId: recipe.id,
          recipeTitle: recipe.title,
          category: recipe.category,
        },
      });

      if (error) throw error;
      
      toast({ 
        title: 'Imagem gerada com sucesso!', 
        description: recipe.title 
      });
      
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ 
        title: 'Erro ao gerar imagem', 
        description: message, 
        variant: 'destructive' 
      });
    } finally {
      setGeneratingImageFor(null);
    }
  };

  const handleGenerateAllImages = async () => {
    const recipesWithoutImages = recipes.filter(r => !r.image_url);
    
    if (recipesWithoutImages.length === 0) {
      toast({ title: 'Todas as receitas já têm imagens!' });
      return;
    }

    setGeneratingAll(true);
    let successCount = 0;
    let errorCount = 0;

    for (const recipe of recipesWithoutImages) {
      try {
        const { error } = await supabase.functions.invoke('generate-recipe-image', {
          body: {
            recipeId: recipe.id,
            recipeTitle: recipe.title,
            category: recipe.category,
          },
        });

        if (error) throw error;
        successCount++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error generating image for ${recipe.title}:`, error);
        errorCount++;
      }
    }

    setGeneratingAll(false);
    queryClient.invalidateQueries({ queryKey: ['recipes'] });
    
    toast({ 
      title: 'Geração concluída!', 
      description: `${successCount} imagens geradas, ${errorCount} erros` 
    });
  };

  const handleRefineRecipe = async (recipe: DbRecipe) => {
    setRefiningRecipe(recipe.id);
    
    try {
      const { data, error } = await supabase.functions.invoke('refine-recipe', {
        body: { recipeId: recipe.id },
      });

      if (error) throw error;
      
      toast({ 
        title: 'Receita refinada com sucesso!', 
        description: recipe.title 
      });
      
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ 
        title: 'Erro ao refinar receita', 
        description: message, 
        variant: 'destructive' 
      });
    } finally {
      setRefiningRecipe(null);
    }
  };

  const handleRefineAllRecipes = async () => {
    if (recipes.length === 0) {
      toast({ title: 'Nenhuma receita para refinar!' });
      return;
    }

    setRefiningAll(true);
    let successCount = 0;
    let errorCount = 0;

    for (const recipe of recipes) {
      try {
        const { error } = await supabase.functions.invoke('refine-recipe', {
          body: { recipeId: recipe.id },
        });

        if (error) throw error;
        successCount++;
        
        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        console.error(`Error refining ${recipe.title}:`, error);
        errorCount++;
      }
    }

    setRefiningAll(false);
    queryClient.invalidateQueries({ queryKey: ['recipes'] });
    
    toast({ 
      title: 'Refinamento concluído!', 
      description: `${successCount} receitas refinadas, ${errorCount} erros` 
    });
  };

  const recipesWithoutImages = recipes.filter(r => !r.image_url).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Receitas</h1>
            <p className="text-muted-foreground mt-1">
              {recipes.length} receitas • {recipesWithoutImages} sem imagem
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              onClick={handleRefineAllRecipes}
              disabled={refiningAll || generatingAll}
            >
              {refiningAll ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Refinando...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Refinar Todas ({recipes.length})
                </>
              )}
            </Button>
            {recipesWithoutImages > 0 && (
              <Button 
                variant="outline" 
                onClick={handleGenerateAllImages}
                disabled={generatingAll || refiningAll}
              >
                {generatingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <ImagePlus className="w-4 h-4 mr-2" />
                    Gerar Todas Imagens ({recipesWithoutImages})
                  </>
                )}
              </Button>
            )}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Receita
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingRecipe ? 'Editar Receita' : 'Nova Receita'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Nome da receita"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="module">Módulo</Label>
                      <Select
                        value={formData.module}
                        onValueChange={(value) => setFormData({ ...formData, module: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {modules.map((module) => (
                            <SelectItem key={module.id} value={module.name}>
                              {module.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Categoria</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) =>
                          setFormData({ ...formData, category: value as RecipeCategory })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(categoryLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prep_time">Tempo de Preparo (minutos)</Label>
                    <Input
                      id="prep_time"
                      type="number"
                      value={formData.prep_time}
                      onChange={(e) =>
                        setFormData({ ...formData, prep_time: parseInt(e.target.value) || 0 })
                      }
                      placeholder="30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ingredients">Ingredientes (um por linha)</Label>
                    <Textarea
                      id="ingredients"
                      value={formData.ingredients}
                      onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                      placeholder="200g de frango&#10;1 colher de azeite&#10;..."
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instructions">Modo de Preparo (um passo por linha)</Label>
                    <Textarea
                      id="instructions"
                      value={formData.instructions}
                      onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                      placeholder="Tempere o frango&#10;Grelhe por 5 minutos&#10;..."
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações/Dica Glicêmica</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Dicas especiais sobre a receita..."
                      rows={2}
                    />
                  </div>
                  <Button onClick={handleSave} className="w-full">
                    {editingRecipe ? 'Salvar Alterações' : 'Criar Receita'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                Carregando receitas...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receita</TableHead>
                    <TableHead className="hidden md:table-cell">Módulo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipes.map((recipe) => (
                    <TableRow key={recipe.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                            {recipe.image_url ? (
                              <img
                                src={recipe.image_url}
                                alt={recipe.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-lg">🍽️</span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{recipe.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {recipe.prep_time} min
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {recipe.module}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                          {categoryLabels[recipe.category]}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRefineRecipe(recipe)}
                            disabled={refiningRecipe === recipe.id || refiningAll || generatingAll}
                            title="Refinar com IA"
                          >
                            {refiningRecipe === recipe.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Wand2 className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleGenerateImage(recipe)}
                            disabled={generatingImageFor === recipe.id || generatingAll || refiningAll}
                            title="Gerar imagem"
                          >
                            {generatingImageFor === recipe.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <ImagePlus className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(recipe)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(recipe.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminRecipes;
