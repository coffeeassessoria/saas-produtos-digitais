import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { Plus, Pencil, Trash2, Loader2, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ImageUpload from '@/components/admin/ImageUpload';

interface DbModule {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  kiwify_checkout_url: string | null;
  benefits: string[];
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const AdminModules = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<DbModule | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    cover_image: '',
    kiwify_checkout_url: '',
    benefits: '',
    display_order: 0,
    is_active: true,
  });

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ['admin-modules'],
    queryFn: async (): Promise<DbModule[]> => {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .order('display_order');

      if (error) throw error;
      return data as DbModule[];
    },
  });

  const handleOpenDialog = (module?: DbModule) => {
    if (module) {
      setEditingModule(module);
      setFormData({
        name: module.name,
        slug: module.slug,
        description: module.description || '',
        cover_image: module.cover_image || '',
        kiwify_checkout_url: module.kiwify_checkout_url || '',
        benefits: (module.benefits || []).join('\n'),
        display_order: module.display_order,
        is_active: module.is_active,
      });
    } else {
      setEditingModule(null);
      setFormData({
        name: '',
        slug: '',
        description: '',
        cover_image: '',
        kiwify_checkout_url: '',
        benefits: '',
        display_order: modules.length + 1,
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.slug.trim()) {
      toast({ title: 'Nome e slug são obrigatórios', variant: 'destructive' });
      return;
    }

    setIsSaving(true);

    const moduleData = {
      name: formData.name.trim(),
      slug: formData.slug.trim().toLowerCase().replace(/\s+/g, '-'),
      description: formData.description.trim() || null,
      cover_image: formData.cover_image.trim() || null,
      kiwify_checkout_url: formData.kiwify_checkout_url.trim() || null,
      benefits: formData.benefits.split('\n').filter(b => b.trim()),
      display_order: formData.display_order,
      is_active: formData.is_active,
    };

    try {
      if (editingModule) {
        const { error } = await supabase
          .from('modules')
          .update(moduleData)
          .eq('id', editingModule.id);

        if (error) throw error;
        toast({ title: 'Módulo atualizado com sucesso!' });
      } else {
        const { error } = await supabase
          .from('modules')
          .insert(moduleData);

        if (error) throw error;
        toast({ title: 'Módulo criado com sucesso!' });
      }

      queryClient.invalidateQueries({ queryKey: ['admin-modules'] });
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving module:', error);
      toast({ 
        title: 'Erro ao salvar módulo', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este módulo?')) return;

    try {
      const { error } = await supabase.from('modules').delete().eq('id', id);
      if (error) throw error;

      toast({ title: 'Módulo excluído com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['admin-modules'] });
    } catch (error: any) {
      console.error('Error deleting module:', error);
      toast({ 
        title: 'Erro ao excluir módulo', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Módulos</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie os módulos e links de upsell
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Módulo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingModule ? 'Editar Módulo' : 'Novo Módulo'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Controle Glicêmico"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="controle-glicemico"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição do módulo"
                    rows={2}
                  />
                </div>

                <ImageUpload
                  value={formData.cover_image}
                  onChange={(url) => setFormData({ ...formData, cover_image: url })}
                />

                <div className="space-y-2 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <Label htmlFor="kiwify_checkout_url" className="flex items-center gap-2 text-primary">
                    <LinkIcon className="w-4 h-4" />
                    Link de Checkout Kiwify (Upsell)
                  </Label>
                  <Input
                    id="kiwify_checkout_url"
                    value={formData.kiwify_checkout_url}
                    onChange={(e) => setFormData({ ...formData, kiwify_checkout_url: e.target.value })}
                    placeholder="https://pay.kiwify.com.br/XXXXXX"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Cole aqui o link de pagamento do Kiwify para este módulo. 
                    Usuários que não têm acesso verão um botão para comprar.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="benefits">Benefícios (um por linha)</Label>
                  <Textarea
                    id="benefits"
                    value={formData.benefits}
                    onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                    placeholder="12 receitas exclusivas&#10;Sem açúcar refinado&#10;Baixo índice glicêmico"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="display_order">Ordem de Exibição</Label>
                    <Input
                      id="display_order"
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-6">
                    <Label htmlFor="is_active">Ativo</Label>
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>
                </div>

                <Button onClick={handleSave} className="w-full" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    editingModule ? 'Salvar Alterações' : 'Criar Módulo'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                Carregando módulos...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Módulo</TableHead>
                    <TableHead className="hidden md:table-cell">Link Upsell</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modules.map((module) => (
                    <TableRow key={module.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {module.cover_image ? (
                            <img
                              src={module.cover_image}
                              alt={module.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                              📚
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-foreground">{module.name}</p>
                            <p className="text-xs text-muted-foreground">{module.slug}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {module.kiwify_checkout_url ? (
                          <a 
                            href={module.kiwify_checkout_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary text-sm hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Configurado
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">Não configurado</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            module.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {module.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(module)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(module.id)}
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

export default AdminModules;
