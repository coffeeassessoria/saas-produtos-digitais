import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, BookOpen, ExternalLink } from 'lucide-react';
import type { ModuleWithAccess } from '@/hooks/useModules';

interface ModuleCardProps {
  module: ModuleWithAccess;
}

const ModuleCard = ({ module }: ModuleCardProps) => {
  const isLocked = !module.isUnlocked;

  if (isLocked) {
    const handleUpsellClick = () => {
      if (module.kiwify_checkout_url) {
        window.open(module.kiwify_checkout_url, '_blank');
      }
    };

    return (
      <Card className="overflow-hidden border-0 shadow-sm">
        <div className="relative aspect-[16/10]">
          <img
            src={module.cover_image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'}
            alt={module.name}
            className="w-full h-full object-cover filter grayscale opacity-70"
          />
          <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center">
            <div className="bg-card/95 rounded-full p-3">
              <Lock className="w-6 h-6 text-muted-foreground" />
            </div>
          </div>
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground mb-1">{module.name}</h3>
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{module.description}</p>
          
          {/* Benefits list */}
          {module.benefits && module.benefits.length > 0 && (
            <ul className="text-xs text-muted-foreground mb-3 space-y-1">
              {module.benefits.slice(0, 3).map((benefit, index) => (
                <li key={index} className="flex items-center gap-1">
                  <span className="text-primary">✓</span> {benefit}
                </li>
              ))}
            </ul>
          )}

          {module.kiwify_checkout_url ? (
            <Button 
              onClick={handleUpsellClick}
              className="w-full h-10" 
              size="sm"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Desbloquear Agora
            </Button>
          ) : (
            <Button variant="outline" className="w-full h-10" size="sm" disabled>
              Em breve
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Link to={`/module/${module.slug}`}>
      <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow touch-manipulation">
        <div className="relative aspect-[16/10]">
          <img
            src={module.cover_image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'}
            alt={module.name}
            className="w-full h-full object-cover"
          />
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground mb-1">{module.name}</h3>
          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{module.description}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{module.recipeCount} receitas</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ModuleCard;
