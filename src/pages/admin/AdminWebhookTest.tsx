import { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WebhookLog {
  id: string;
  timestamp: Date;
  event: string;
  email: string;
  module: string;
  status: 'success' | 'error' | 'pending';
  response?: string;
}

const AdminWebhookTest = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [event, setEvent] = useState<'approved' | 'refunded'>('approved');
  const [moduleSlug, setModuleSlug] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [modules, setModules] = useState<{ id: string; slug: string; name: string }[]>([]);
  const [modulesLoaded, setModulesLoaded] = useState(false);

  // Load modules on first render
  useEffect(() => {
    const loadModules = async () => {
      const { data } = await supabase
        .from('modules')
        .select('id, slug, name')
        .eq('is_active', true)
        .order('display_order');
      
      if (data) {
        setModules(data);
        if (data.length > 0) {
          setModuleSlug(data[0].slug);
        }
      }
      setModulesLoaded(true);
    };
    loadModules();
  }, []);

  const simulateWebhook = async () => {
    if (!email || !moduleSlug) {
      toast.error('Preencha email e selecione um módulo');
      return;
    }

    const logId = crypto.randomUUID();
    const newLog: WebhookLog = {
      id: logId,
      timestamp: new Date(),
      event: event === 'approved' ? 'order.approved' : 'order.refunded',
      email,
      module: moduleSlug,
      status: 'pending',
    };

    setLogs(prev => [newLog, ...prev]);
    setIsLoading(true);

    try {
      // Get the module to find/create a fake product ID
      const selectedModule = modules.find(m => m.slug === moduleSlug);
      
      // Simulate Kiwify webhook payload
      const webhookPayload = {
        order_status: event === 'approved' ? 'paid' : 'refunded',
        Customer: {
          email: email,
          full_name: name || email.split('@')[0],
        },
        Product: {
          product_id: `test_${moduleSlug}`,
          product_name: selectedModule?.name || moduleSlug,
        },
        order_id: `test_${Date.now()}`,
      };

      // Admin test uses a dedicated admin-test endpoint header
      // Real webhooks require proper HMAC signature from Kiwify
      const response = await supabase.functions.invoke('kiwify-webhook', {
        body: webhookPayload,
        headers: {
          'x-admin-test': 'true',
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setLogs(prev => 
        prev.map(log => 
          log.id === logId 
            ? { ...log, status: 'success', response: JSON.stringify(response.data, null, 2) }
            : log
        )
      );

      toast.success(
        event === 'approved' 
          ? `Acesso ao módulo ${moduleSlug} liberado para ${email}`
          : `Acesso ao módulo ${moduleSlug} revogado de ${email}`
      );

    } catch (error: any) {
      console.error('Webhook error:', error);
      setLogs(prev => 
        prev.map(log => 
          log.id === logId 
            ? { ...log, status: 'error', response: error.message }
            : log
        )
      );
      toast.error('Erro ao simular webhook: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: WebhookLog['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
    }
  };

  const getStatusBadge = (status: WebhookLog['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">Sucesso</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      case 'pending':
        return <Badge variant="secondary">Processando</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Teste de Webhooks</h1>
          <p className="text-muted-foreground mt-1">
            Simule eventos da Kiwify para testar liberação/revogação de módulos
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Formulário de Teste */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Simular Webhook
              </CardTitle>
              <CardDescription>
                Envie um evento simulado para testar a integração
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email do Cliente</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="cliente@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome do Cliente (opcional)</Label>
                <Input
                  id="name"
                  placeholder="Nome Completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Evento</Label>
                <Select value={event} onValueChange={(v: 'approved' | 'refunded') => setEvent(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        order.approved (Liberar acesso)
                      </div>
                    </SelectItem>
                    <SelectItem value="refunded">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-500" />
                        order.refunded (Revogar acesso)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Módulo</Label>
                <Select value={moduleSlug} onValueChange={setModuleSlug}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um módulo" />
                  </SelectTrigger>
                  <SelectContent>
                    {modules.map((mod) => (
                      <SelectItem key={mod.id} value={mod.slug}>
                        {mod.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                className="w-full" 
                onClick={simulateWebhook}
                disabled={isLoading || !email || !moduleSlug}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Simular Webhook
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Log de Requisições */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Log de Requisições
              </CardTitle>
              <CardDescription>
                Histórico das simulações realizadas nesta sessão
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {logs.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    Nenhuma simulação realizada ainda
                  </div>
                ) : (
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-lg border bg-card space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(log.status)}
                            <span className="font-mono text-sm">{log.event}</span>
                          </div>
                          {getStatusBadge(log.status)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p><strong>Email:</strong> {log.email}</p>
                          <p><strong>Módulo:</strong> {log.module}</p>
                          <p><strong>Hora:</strong> {log.timestamp.toLocaleTimeString()}</p>
                        </div>
                        {log.response && (
                          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                            {log.response}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminWebhookTest;
