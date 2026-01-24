import { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Key, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Module {
  id: string;
  slug: string;
  name: string;
}

interface Profile {
  id: string;
  email: string;
  name: string | null;
  user_id: string | null;
}

interface UserModule {
  email: string;
  module_id: string;
}

const AdminUserModules = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userModules, setUserModules] = useState<UserModule[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load modules
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select('id, slug, name')
        .eq('is_active', true)
        .order('display_order');

      if (modulesError) throw modulesError;

      // Load profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, name, user_id')
        .order('email');

      if (profilesError) throw profilesError;

      // Load user_modules
      const { data: userModulesData, error: userModulesError } = await supabase
        .from('user_modules')
        .select('email, module_id');

      if (userModulesError) throw userModulesError;

      setModules(modulesData || []);
      setProfiles(profilesData || []);
      setUserModules(userModulesData || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const hasAccess = (email: string, moduleSlug: string) => {
    return userModules.some(um => um.email === email && um.module_id === moduleSlug);
  };

  const toggleAccess = async (profile: Profile, moduleSlug: string) => {
    const cellKey = `${profile.email}-${moduleSlug}`;
    setSavingCells(prev => new Set(prev).add(cellKey));

    try {
      const currentlyHasAccess = hasAccess(profile.email, moduleSlug);

      if (currentlyHasAccess) {
        // Remove access
        const { error } = await supabase
          .from('user_modules')
          .delete()
          .eq('email', profile.email)
          .eq('module_id', moduleSlug);

        if (error) throw error;

        setUserModules(prev => 
          prev.filter(um => !(um.email === profile.email && um.module_id === moduleSlug))
        );

        toast.success(`Acesso ao módulo removido de ${profile.email}`);
      } else {
        // Grant access
        const { error } = await supabase
          .from('user_modules')
          .insert({
            email: profile.email,
            module_id: moduleSlug,
            user_id: profile.user_id,
          });

        if (error) throw error;

        setUserModules(prev => [
          ...prev,
          { email: profile.email, module_id: moduleSlug }
        ]);

        toast.success(`Acesso ao módulo liberado para ${profile.email}`);
      }
    } catch (error: any) {
      console.error('Error toggling access:', error);
      toast.error('Erro ao atualizar acesso: ' + error.message);
    } finally {
      setSavingCells(prev => {
        const next = new Set(prev);
        next.delete(cellKey);
        return next;
      });
    }
  };

  const filteredProfiles = profiles.filter(profile =>
    profile.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (profile.name && profile.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const countUserModules = (email: string) => {
    return userModules.filter(um => um.email === email).length;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gerenciar Acessos</h1>
          <p className="text-muted-foreground mt-1">
            Libere ou revogue manualmente o acesso aos módulos para cada usuário
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Acessos por Usuário
            </CardTitle>
            <CardDescription>
              Marque os módulos que cada usuário deve ter acesso
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por email ou nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredProfiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                        Usuário
                      </th>
                      {modules.map((mod) => (
                        <th
                          key={mod.id}
                          className="text-center py-3 px-2 font-medium text-muted-foreground min-w-[100px]"
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs">{mod.name}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProfiles.map((profile) => (
                      <tr key={profile.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{profile.email}</span>
                            <span className="text-sm text-muted-foreground">
                              {profile.name || 'Sem nome'}
                            </span>
                            <Badge variant="secondary" className="w-fit mt-1 text-xs">
                              {countUserModules(profile.email)} módulo(s)
                            </Badge>
                          </div>
                        </td>
                        {modules.map((mod) => {
                          const cellKey = `${profile.email}-${mod.slug}`;
                          const isSaving = savingCells.has(cellKey);
                          const checked = hasAccess(profile.email, mod.slug);

                          return (
                            <td key={mod.id} className="text-center py-3 px-2">
                              <div className="flex items-center justify-center">
                                {isSaving ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                ) : (
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={() => toggleAccess(profile, mod.slug)}
                                    className={checked ? 'bg-primary border-primary' : ''}
                                  />
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminUserModules;
