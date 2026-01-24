import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, FolderOpen, BookOpen, TrendingUp, Key, Eye, EyeOff, Loader2, RefreshCw, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  // Fetch real stats from database
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const [profilesRes, modulesRes, recipesRes, userModulesRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('modules').select('id, is_active', { count: 'exact' }),
        supabase.from('recipes').select('id', { count: 'exact', head: true }),
        supabase.from('user_modules').select('id', { count: 'exact', head: true }),
      ]);

      const activeModules = modulesRes.data?.filter(m => m.is_active).length || 0;

      return {
        totalUsers: profilesRes.count || 0,
        activeModules,
        totalRecipes: recipesRes.count || 0,
        totalAccess: userModulesRes.count || 0,
      };
    },
  });

  // Fetch recent users
  const { data: recentUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-recent-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, name, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch modules with recipe counts
  const { data: popularModules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ['admin-popular-modules'],
    queryFn: async () => {
      const { data: modules, error: modulesError } = await supabase
        .from('modules')
        .select('id, name, slug, cover_image, is_active')
        .eq('is_active', true)
        .order('display_order')
        .limit(4);

      if (modulesError) throw modulesError;

      // Get recipe counts per module
      const { data: recipes } = await supabase
        .from('recipes')
        .select('module');

      const recipeCounts: Record<string, number> = {};
      recipes?.forEach(r => {
        recipeCounts[r.module] = (recipeCounts[r.module] || 0) + 1;
      });

      return (modules || []).map(m => ({
        ...m,
        recipeCount: recipeCounts[m.name] || 0,
      }));
    },
  });

  // Fetch pending suggestions count
  const { data: pendingSuggestions = 0 } = useQuery({
    queryKey: ['admin-pending-suggestions'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('recipe_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) throw error;
      return count || 0;
    },
  });

  const handleSetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsSettingPassword(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('set-admin-password', {
        body: { email: user?.email, newPassword },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.error) {
        toast.error(response.error.message || 'Erro ao definir senha');
        return;
      }

      if (response.data?.error) {
        toast.error(response.data.error);
        return;
      }

      toast.success('Senha definida com sucesso! Agora você pode usar /admin-login');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error('Erro ao definir senha');
      console.error(err);
    } finally {
      setIsSettingPassword(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const statCards = [
    {
      title: 'Total de Usuários',
      value: stats?.totalUsers || 0,
      icon: Users,
    },
    {
      title: 'Módulos Ativos',
      value: stats?.activeModules || 0,
      icon: FolderOpen,
    },
    {
      title: 'Receitas',
      value: stats?.totalRecipes || 0,
      icon: BookOpen,
    },
    {
      title: 'Acessos Liberados',
      value: stats?.totalAccess || 0,
      icon: TrendingUp,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Visão geral do sistema</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => refetchStats()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Pending Suggestions Alert */}
        {pendingSuggestions > 0 && (
          <Alert variant="default" className="border-primary/50 bg-primary/10">
            <Lightbulb className="h-4 w-4 text-primary" />
            <AlertTitle className="text-foreground">
              {pendingSuggestions} {pendingSuggestions === 1 ? 'nova sugestão' : 'novas sugestões'} de receita!
            </AlertTitle>
            <AlertDescription className="text-muted-foreground">
              Você tem sugestões pendentes aguardando análise.{' '}
              <Link to="/admin/suggestions" className="font-medium underline hover:no-underline text-primary">
                Ver sugestões
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <Card key={index} className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Últimos Usuários</CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : recentUsers.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Nenhum usuário cadastrado</p>
              ) : (
                <div className="space-y-4">
                  {recentUsers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">
                            {u.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {u.name || u.email}
                          </p>
                          {u.name && (
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(u.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Módulos</CardTitle>
            </CardHeader>
            <CardContent>
              {modulesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : popularModules.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Nenhum módulo ativo</p>
              ) : (
                <div className="space-y-4">
                  {popularModules.map((module) => (
                    <div key={module.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {module.cover_image ? (
                          <img
                            src={module.cover_image}
                            alt={module.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <FolderOpen className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground">{module.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {module.recipeCount} receitas
                          </p>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                        Ativo
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Set Admin Password Card */}
          <Card className="border-0 shadow-sm border-l-4 border-l-primary">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Definir Senha de Admin</CardTitle>
              </div>
              <CardDescription>
                Configure uma senha para acessar via /admin-login
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Senha</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Repita a senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleSetPassword} 
                  disabled={isSettingPassword}
                  className="w-full"
                >
                  {isSettingPassword ? 'Salvando...' : 'Definir Senha'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;