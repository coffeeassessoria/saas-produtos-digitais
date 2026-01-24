import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Lightbulb, ThumbsUp, MessageSquare, Check, X, Clock, Search, Filter } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateSuggestionStatus } from '@/hooks/useRecipeSuggestions';
import { cn } from '@/lib/utils';

interface RecipeSuggestion {
  id: string;
  user_id: string;
  user_email: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'completed';
  vote_count: number;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

const AdminSuggestions = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSuggestion, setSelectedSuggestion] = useState<RecipeSuggestion | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const updateStatus = useUpdateSuggestionStatus();

  // Fetch all suggestions
  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['admin-suggestions'],
    queryFn: async (): Promise<RecipeSuggestion[]> => {
      const { data, error } = await supabase
        .from('recipe_suggestions')
        .select('*')
        .order('vote_count', { ascending: false });

      if (error) throw error;
      return (data || []) as RecipeSuggestion[];
    },
  });

  // Filter suggestions
  const filteredSuggestions = suggestions.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.user_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: suggestions.length,
    pending: suggestions.filter(s => s.status === 'pending').length,
    inReview: suggestions.filter(s => s.status === 'in_review').length,
    completed: suggestions.filter(s => s.status === 'completed').length,
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
  };

  const getStatusInfo = (status: string) => {
    const info: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      pending: { 
        label: 'Pendente', 
        className: 'bg-muted text-muted-foreground',
        icon: <Clock className="w-3 h-3" />
      },
      in_review: { 
        label: 'Em Análise', 
        className: 'bg-primary/20 text-primary',
        icon: <Search className="w-3 h-3" />
      },
      approved: { 
        label: 'Aprovado', 
        className: 'bg-green-500/20 text-green-700',
        icon: <Check className="w-3 h-3" />
      },
      rejected: { 
        label: 'Rejeitado', 
        className: 'bg-destructive/20 text-destructive',
        icon: <X className="w-3 h-3" />
      },
      completed: { 
        label: 'Concluído', 
        className: 'bg-green-500/20 text-green-700',
        icon: <Check className="w-3 h-3" />
      },
    };
    return info[status] || info.pending;
  };

  const handleUpdateStatus = async (status: RecipeSuggestion['status']) => {
    if (!selectedSuggestion) return;

    try {
      await updateStatus.mutateAsync({
        id: selectedSuggestion.id,
        status,
        admin_notes: adminNotes || undefined,
      });
      toast.success('Status atualizado com sucesso!');
      setSelectedSuggestion(null);
      setAdminNotes('');
    } catch (error) {
      toast.error('Erro ao atualizar status');
      console.error(error);
    }
  };

  const openSuggestionDialog = (suggestion: RecipeSuggestion) => {
    setSelectedSuggestion(suggestion);
    setAdminNotes(suggestion.admin_notes || '');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sugestões de Receitas</h1>
          <p className="text-muted-foreground">
            Veja o que os usuários estão pedindo e priorize pela quantidade de votos
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Em Análise
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.inReview}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Concluídas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por título ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="in_review">Em Análise</SelectItem>
                  <SelectItem value="approved">Aprovados</SelectItem>
                  <SelectItem value="rejected">Rejeitados</SelectItem>
                  <SelectItem value="completed">Concluídos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Suggestions List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              Sugestões ({filteredSuggestions.length})
            </CardTitle>
            <CardDescription>
              Ordenadas por número de votos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredSuggestions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma sugestão encontrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSuggestions.map((suggestion) => {
                  const statusInfo = getStatusInfo(suggestion.status);
                  
                  return (
                    <div 
                      key={suggestion.id}
                      className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => openSuggestionDialog(suggestion)}
                    >
                      {/* Vote Count */}
                      <div className="flex-shrink-0 w-16 h-16 bg-primary/10 rounded-lg flex flex-col items-center justify-center">
                        <ThumbsUp className="w-5 h-5 text-primary mb-1" />
                        <span className="text-lg font-bold text-primary">{suggestion.vote_count}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {suggestion.title}
                        </p>
                        {suggestion.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {suggestion.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {suggestion.user_email} • {formatDate(suggestion.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span className={cn(
                        "flex items-center gap-1 text-xs px-2 py-1 rounded-full flex-shrink-0",
                        statusInfo.className
                      )}>
                        {statusInfo.icon}
                        {statusInfo.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={!!selectedSuggestion} onOpenChange={() => setSelectedSuggestion(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ThumbsUp className="w-5 h-5 text-primary" />
                {selectedSuggestion?.vote_count} votos
              </DialogTitle>
              <DialogDescription>
                Gerencie esta sugestão de receita
              </DialogDescription>
            </DialogHeader>
            
            {selectedSuggestion && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Receita sugerida</label>
                  <p className="text-lg font-semibold text-foreground">{selectedSuggestion.title}</p>
                </div>

                {selectedSuggestion.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                    <p className="text-sm text-foreground">{selectedSuggestion.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Usuário</label>
                    <p className="text-sm text-foreground">{selectedSuggestion.user_email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Data</label>
                    <p className="text-sm text-foreground">{formatDate(selectedSuggestion.created_at)}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Notas do Admin</label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Adicione notas sobre esta sugestão..."
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateStatus('in_review')}
                    disabled={updateStatus.isPending}
                    className="flex-1"
                  >
                    <Clock className="w-4 h-4 mr-1" />
                    Em Análise
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateStatus('approved')}
                    disabled={updateStatus.isPending}
                    className="flex-1 border-green-500 text-green-600 hover:bg-green-50"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Aprovar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateStatus('completed')}
                    disabled={updateStatus.isPending}
                    className="flex-1 bg-green-500 text-white hover:bg-green-600"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Concluído
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateStatus('rejected')}
                    disabled={updateStatus.isPending}
                    className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Rejeitar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminSuggestions;
