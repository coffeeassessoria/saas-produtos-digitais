import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Mail, Plus, Send, Eye, Trash2, Loader2, BarChart3, Users, MousePointerClick,
  CheckCircle, XCircle, Clock, AlertCircle, TrendingUp, DollarSign
} from 'lucide-react';
import {
  useCampaigns, useTemplates, useCreateCampaign, useUpdateCampaign,
  useDeleteCampaign, useSendCampaign, useCampaignStats, useCampaignConversions,
  EmailCampaign, EmailTemplate
} from '@/hooks/useCampaigns';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Rascunho', variant: 'secondary' },
  scheduled: { label: 'Agendada', variant: 'outline' },
  sending: { label: 'Enviando', variant: 'default' },
  sent: { label: 'Enviada', variant: 'default' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
};

const AdminCampaigns = () => {
  const { data: campaigns = [], isLoading } = useCampaigns();
  const { data: templates = [] } = useTemplates();
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();
  const sendCampaign = useSendCampaign();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<EmailCampaign | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    template_id: '',
    content: {} as Record<string, string>,
  });

  const { data: stats } = useCampaignStats(selectedCampaignId || undefined);
  const { data: conversions = [] } = useCampaignConversions(selectedCampaignId || undefined);

  const selectedTemplate = templates.find(t => t.id === formData.template_id);

  const handleOpenDialog = (campaign?: EmailCampaign) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setFormData({
        name: campaign.name,
        subject: campaign.subject,
        template_id: campaign.template_id,
        content: campaign.content || {},
      });
    } else {
      setEditingCampaign(null);
      setFormData({
        name: '',
        subject: '',
        template_id: templates[0]?.id || '',
        content: {},
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.subject || !formData.template_id) return;

    if (editingCampaign) {
      await updateCampaign.mutateAsync({
        id: editingCampaign.id,
        name: formData.name,
        subject: formData.subject,
        template_id: formData.template_id,
        content: formData.content,
      });
    } else {
      await createCampaign.mutateAsync({
        name: formData.name,
        subject: formData.subject,
        template_id: formData.template_id,
        content: formData.content,
        status: 'draft',
        scheduled_at: null,
        sent_at: null,
      });
    }

    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta campanha?')) return;
    await deleteCampaign.mutateAsync(id);
  };

  const handleSend = async (id: string) => {
    if (!confirm('Enviar esta campanha para todos os usuários?')) return;
    await sendCampaign.mutateAsync(id);
  };

  const handleViewStats = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    setIsStatsDialogOpen(true);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const totalConversionValue = conversions.reduce((sum, c) => sum + (c.amount || 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Campanhas de Email</h1>
            <p className="text-muted-foreground mt-1">
              {campaigns.length} {campaigns.length === 1 ? 'campanha' : 'campanhas'}
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Campanha
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : campaigns.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Mail className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma campanha</h3>
              <p className="text-muted-foreground text-center mb-4">
                Crie sua primeira campanha de email para comunicar com seus clientes.
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Campanha
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campanha</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enviada em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => {
                  const template = templates.find(t => t.id === campaign.template_id);
                  const status = statusConfig[campaign.status] || statusConfig.draft;

                  return (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{campaign.name}</p>
                          <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                        </div>
                      </TableCell>
                      <TableCell>{template?.name || campaign.template_id}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(campaign.sent_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {campaign.status === 'sent' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewStats(campaign.id)}
                            >
                              <BarChart3 className="w-4 h-4" />
                            </Button>
                          )}
                          {campaign.status === 'draft' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenDialog(campaign)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleSend(campaign.id)}
                                disabled={sendCampaign.isPending}
                              >
                                {sendCampaign.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Send className="w-4 h-4" />
                                )}
                              </Button>
                            </>
                          )}
                          {campaign.status !== 'sending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(campaign.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Create/Edit Campaign Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Campanha</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Lançamento Módulo GlicoFit"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template">Template</Label>
                  <Select
                    value={formData.template_id}
                    onValueChange={(value) => setFormData({ ...formData, template_id: value, content: {} })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Assunto do Email</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Ex: 🎉 Novo módulo disponível para você!"
                />
              </div>

              {selectedTemplate && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium">Conteúdo do Email</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedTemplate.description}
                  </p>

                  {(selectedTemplate.variables as string[]).map((variable) => (
                    <div key={variable} className="space-y-2">
                      <Label htmlFor={variable}>
                        {variable.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Label>
                      {['message', 'description', 'recipe_description', 'offer_details'].includes(variable) ? (
                        <Textarea
                          id={variable}
                          value={formData.content[variable] || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            content: { ...formData.content, [variable]: e.target.value }
                          })}
                          placeholder={`Insira ${variable.replace(/_/g, ' ')}`}
                          rows={3}
                        />
                      ) : (
                        <Input
                          id={variable}
                          value={formData.content[variable] || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            content: { ...formData.content, [variable]: e.target.value }
                          })}
                          placeholder={`Insira ${variable.replace(/_/g, ' ')}`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={createCampaign.isPending || updateCampaign.isPending}
              >
                {(createCampaign.isPending || updateCampaign.isPending) ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {editingCampaign ? 'Salvar' : 'Criar Campanha'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stats Dialog */}
        <Dialog open={isStatsDialogOpen} onOpenChange={setIsStatsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Estatísticas da Campanha</DialogTitle>
            </DialogHeader>

            {stats && (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                  <TabsTrigger value="conversions">Conversões</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Total
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">{stats.total}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-primary" />
                          Entregues
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">{stats.delivered}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-primary" />
                          Abertos
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">{stats.opened}</p>
                        <p className="text-sm text-muted-foreground">{stats.openRate}%</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                          <MousePointerClick className="w-4 h-4 text-primary" />
                          Cliques
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">{stats.clicked}</p>
                        <p className="text-sm text-muted-foreground">{stats.clickRate}%</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Detalhes de Entrega</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>Pendentes</span>
                          </div>
                          <span className="font-medium">{stats.total - stats.sent}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Send className="w-4 h-4 text-primary" />
                            <span>Enviados</span>
                          </div>
                          <span className="font-medium">{stats.sent}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-muted-foreground" />
                            <span>Bounced</span>
                          </div>
                          <span className="font-medium">{stats.bounced}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-destructive" />
                            <span>Falhas</span>
                          </div>
                          <span className="font-medium">{stats.failed}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="conversions" className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-primary" />
                          Conversões
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">{conversions.length}</p>
                        {stats.clicked > 0 && (
                          <p className="text-sm text-muted-foreground">
                            {Math.round((conversions.length / stats.clicked) * 100)}% dos cliques
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-primary" />
                          Receita Gerada
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">
                          R$ {totalConversionValue.toFixed(2).replace('.', ',')}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {conversions.length > 0 ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Detalhes das Conversões</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Email</TableHead>
                              <TableHead>Produto</TableHead>
                              <TableHead>Valor</TableHead>
                              <TableHead>Data</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {conversions.map((conversion) => (
                              <TableRow key={conversion.id}>
                                <TableCell>{conversion.email}</TableCell>
                                <TableCell>{conversion.product_name || '-'}</TableCell>
                                <TableCell>
                                  {conversion.amount 
                                    ? `R$ ${conversion.amount.toFixed(2).replace('.', ',')}` 
                                    : '-'
                                  }
                                </TableCell>
                                <TableCell>{formatDate(conversion.converted_at)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <TrendingUp className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Nenhuma conversão ainda</h3>
                        <p className="text-muted-foreground text-center">
                          As conversões são rastreadas automaticamente via UTM quando um cliente
                          compra após clicar no link do email.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminCampaigns;
