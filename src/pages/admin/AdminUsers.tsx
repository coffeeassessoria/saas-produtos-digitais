import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Send, Loader2, Trash2, RefreshCw, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserWithModules {
  id: string;
  email: string;
  name: string | null;
  user_id: string | null;
  created_at: string;
  modules: string[];
}

const AdminUsers = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithModules | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [sendingEmailFor, setSendingEmailFor] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch profiles with their modules
  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async (): Promise<UserWithModules[]> => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get all user modules
      const { data: userModules, error: modulesError } = await supabase
        .from('user_modules')
        .select('*');

      if (modulesError) throw modulesError;

      // Combine data - deduplicate modules by using Set
      return (profiles || []).map(profile => {
        const moduleIds = userModules
          ?.filter(m => m.user_id === profile.user_id || m.email === profile.email)
          .map(m => m.module_id) || [];
        
        // Remove duplicates using Set
        const uniqueModules = [...new Set(moduleIds)];
        
        return {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          user_id: profile.user_id,
          created_at: profile.created_at,
          modules: uniqueModules
        };
      });
    },
  });

  const handleCreateUser = async () => {
    if (!newUserEmail.trim()) {
      toast({ title: 'Email é obrigatório', variant: 'destructive' });
      return;
    }

    setIsCreating(true);

    try {
      // Call send-magic-link which creates user + sends welcome email
      const { data, error } = await supabase.functions.invoke('send-magic-link', {
        body: {
          email: newUserEmail.toLowerCase().trim(),
          name: newUserName.trim() || null,
          moduleId: 'controle-glicemico',
        }
      });

      if (error) throw error;

      toast({ 
        title: 'Usuário criado com sucesso!',
        description: 'Email de acesso enviado automaticamente.'
      });
      
      setIsDialogOpen(false);
      setNewUserEmail('');
      setNewUserName('');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({ 
        title: 'Erro ao criar usuário', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendLoginEmail = async (email: string) => {
    setSendingEmailFor(email);

    try {
      const { error } = await supabase.functions.invoke('send-login-link', {
        body: { email }
      });

      if (error) throw error;

      toast({ 
        title: 'Email enviado!',
        description: `Link de acesso enviado para ${email}`
      });
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({ 
        title: 'Erro ao enviar email', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setSendingEmailFor(null);
    }
  };

  const handleDeleteUser = async (userId: string | null, email: string) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${email}?`)) return;

    try {
      // Delete profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('email', email);

      if (profileError) throw profileError;

      // Delete user modules
      const { error: modulesError } = await supabase
        .from('user_modules')
        .delete()
        .eq('email', email);

      if (modulesError) console.error('Error deleting modules:', modulesError);

      toast({ title: 'Usuário excluído com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({ 
        title: 'Erro ao excluir usuário', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  };

  const handleEditUser = (user: UserWithModules) => {
    setEditingUser(user);
    setEditEmail(user.email);
    setEditName(user.name || '');
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !editEmail.trim()) {
      toast({ title: 'Email é obrigatório', variant: 'destructive' });
      return;
    }

    setIsUpdating(true);

    try {
      const oldEmail = editingUser.email;
      const newEmail = editEmail.toLowerCase().trim();
      const newName = editName.trim() || null;

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          email: newEmail, 
          name: newName 
        })
        .eq('id', editingUser.id);

      if (profileError) throw profileError;

      // If email changed, update user_modules records
      if (oldEmail !== newEmail) {
        const { error: modulesError } = await supabase
          .from('user_modules')
          .update({ email: newEmail })
          .eq('email', oldEmail);

        if (modulesError) {
          console.error('Error updating user_modules:', modulesError);
        }
      }

      toast({ title: 'Usuário atualizado com sucesso!' });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({ 
        title: 'Erro ao atualizar usuário', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
            <p className="text-muted-foreground mt-1">
              {users.length} usuários cadastrados
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Criar Novo Usuário</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="cliente@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome (opcional)</Label>
                    <Input
                      id="name"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Nome do cliente"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    O usuário receberá um email com link de acesso às receitas.
                  </p>
                  <Button 
                    onClick={handleCreateUser} 
                    className="w-full"
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Criar e Enviar Acesso
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit User Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Editar Usuário</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email *</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="cliente@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Nome</Label>
                    <Input
                      id="edit-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nome do cliente"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Ao alterar o email, os acessos aos módulos serão atualizados automaticamente.
                  </p>
                  <Button 
                    onClick={handleUpdateUser} 
                    className="w-full"
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar Alterações'
                    )}
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
                Carregando usuários...
              </div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhum usuário cadastrado ainda.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead className="hidden md:table-cell">Módulos</TableHead>
                    <TableHead className="hidden md:table-cell">Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-medium text-primary">
                              {user.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {user.name || user.email}
                            </p>
                            {user.name && (
                              <p className="text-xs text-muted-foreground truncate">
                                {user.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {user.modules.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.modules.map(mod => (
                              <Badge 
                                key={mod} 
                                variant="secondary" 
                                className="text-xs"
                              >
                                {mod}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Nenhum</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditUser(user)}
                            title="Editar usuário"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSendLoginEmail(user.email)}
                            disabled={sendingEmailFor === user.email}
                            title="Reenviar email de acesso"
                          >
                            {sendingEmailFor === user.email ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(user.user_id, user.email)}
                            title="Excluir usuário"
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

export default AdminUsers;
