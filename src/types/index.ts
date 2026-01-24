// Types for the Recipe PWA

export interface Module {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  kiwifyProductId: string;
  status: 'active' | 'inactive';
  isLocked: boolean;
  benefits?: string[];
  recipeCount: number;
}

export interface Recipe {
  id: string;
  title: string;
  image: string;
  moduleId: string;
  category: RecipeCategory;
  ingredients: string[];
  instructions: string[];
  prepTime: number; // in minutes
  observations?: string;
}

// Database recipe type (from Supabase)
export interface DbRecipe {
  id: string;
  title: string;
  image_url: string | null;
  module: string;
  category: RecipeCategory;
  ingredients: string[];
  instructions: string[];
  prep_time: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  status: 'active' | 'refunded';
  unlockedModules: string[];
  createdAt: string;
}

export type RecipeCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert';

export const categoryLabels: Record<RecipeCategory, string> = {
  breakfast: 'Café da manhã',
  lunch: 'Almoço',
  dinner: 'Janta',
  snack: 'Lanche',
  dessert: 'Sobremesa',
};

export const categoryColors: Record<RecipeCategory, string> = {
  breakfast: 'bg-amber-100 text-amber-800',
  lunch: 'bg-green-100 text-green-800',
  dinner: 'bg-blue-100 text-blue-800',
  snack: 'bg-orange-100 text-orange-800',
  dessert: 'bg-pink-100 text-pink-800',
};
