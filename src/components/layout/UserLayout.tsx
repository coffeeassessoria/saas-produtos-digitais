import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ChefHat, Home, Store, LogOut, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserLayoutProps {
  children: React.ReactNode;
}

const UserLayout = ({ children }: UserLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
      toast.error('Erro ao sair');
      return;
    }
    navigate('/login');
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Início' },
    { path: '/favorites', icon: Heart, label: 'Favoritos' },
    { path: '/store', icon: Store, label: 'Loja' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border safe-top">
        <div className="container max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">Receitas</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout} 
              title="Sair"
              className="h-11 w-11"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container max-w-3xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Bottom Navigation - Larger for accessibility */}
      <nav className="sticky bottom-0 bg-card border-t border-border safe-bottom">
        <div className="container max-w-3xl mx-auto px-4 h-20 flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center gap-1.5 px-6 py-3 rounded-xl transition-colors touch-manipulation min-w-[80px]',
                  isActive 
                    ? 'text-primary bg-primary/10' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <item.icon className={cn('w-6 h-6', isActive && 'fill-primary/20')} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default UserLayout;
