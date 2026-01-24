import { useState, useCallback } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Upload, Send, CheckCircle, XCircle, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ImportedUser {
  name: string;
  email: string;
  status: 'pending' | 'sending' | 'success' | 'error';
  error?: string;
}

const AdminImportUsers = () => {
  const [users, setUsers] = useState<ImportedUser[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({ total: 0, success: 0, error: 0, pending: 0 });

  const parseCSV = (text: string): ImportedUser[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const header = lines[0].toLowerCase();
    
    // Find column indices
    const columns = header.split(',').map(col => col.trim());
    const nameIndex = columns.findIndex(col => col === 'name' || col === 'nome');
    const emailIndex = columns.findIndex(col => col === 'email' || col === 'e-mail');

    if (emailIndex === -1) {
      throw new Error('Coluna "Email" não encontrada no CSV');
    }

    const parsedUsers: ImportedUser[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(val => val.trim());
      const email = values[emailIndex]?.toLowerCase();
      const name = nameIndex >= 0 ? values[nameIndex] : '';

      if (email && email.includes('@')) {
        parsedUsers.push({
          name,
          email,
          status: 'pending'
        });
      }
    }

    return parsedUsers;
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsedUsers = parseCSV(text);
        setUsers(parsedUsers);
        setStats({
          total: parsedUsers.length,
          success: 0,
          error: 0,
          pending: parsedUsers.length
        });
        setProgress(0);
        toast.success(`${parsedUsers.length} usuários carregados do CSV`);
      } catch (error: any) {
        toast.error(error.message || 'Erro ao processar CSV');
      }
    };
    reader.readAsText(file);
  }, []);

  const sendMagicLinks = async () => {
    if (users.length === 0) {
      toast.error('Nenhum usuário para enviar');
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      // Update status to sending
      setUsers(prev => prev.map((u, idx) => 
        idx === i ? { ...u, status: 'sending' } : u
      ));

      try {
        const { data, error } = await supabase.functions.invoke('send-magic-link', {
          body: {
            email: user.email,
            name: user.name,
            moduleId: 'controle-glicemico',
            redirectUrl: window.location.origin
          }
        });

        if (error) throw error;

        // Update status to success
        setUsers(prev => prev.map((u, idx) => 
          idx === i ? { ...u, status: 'success' } : u
        ));
        successCount++;
      } catch (error: any) {
        console.error(`Error sending to ${user.email}:`, error);
        // Update status to error
        setUsers(prev => prev.map((u, idx) => 
          idx === i ? { ...u, status: 'error', error: error.message } : u
        ));
        errorCount++;
      }

      // Update progress
      const newProgress = Math.round(((i + 1) / users.length) * 100);
      setProgress(newProgress);
      setStats(prev => ({
        ...prev,
        success: successCount,
        error: errorCount,
        pending: prev.total - successCount - errorCount
      }));

      // Small delay to avoid rate limiting
      if (i < users.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setIsImporting(false);
    
    if (errorCount === 0) {
      toast.success(`✅ Todos os ${successCount} emails enviados com sucesso!`);
    } else {
      toast.warning(`Enviados: ${successCount} | Erros: ${errorCount}`);
    }
  };

  const getStatusBadge = (status: ImportedUser['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>;
      case 'sending':
        return <Badge variant="outline" className="gap-1 animate-pulse"><Send className="h-3 w-3" /> Enviando...</Badge>;
      case 'success':
        return <Badge className="gap-1 bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle className="h-3 w-3" /> Enviado</Badge>;
      case 'error':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Erro</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Importar Usuários</h1>
          <p className="text-muted-foreground mt-1">Importe clientes do CSV e envie os acessos por email</p>
        </div>

        {/* Upload Card */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload do CSV
            </CardTitle>
            <CardDescription>
              O CSV deve ter as colunas "Name" e "Email"
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <label className="flex-1">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isImporting}
                />
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Clique para selecionar ou arraste o arquivo CSV
                  </p>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Stats and Progress */}
        {users.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                {stats.total} Usuários Carregados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{stats.success}</p>
                  <p className="text-xs text-green-600">Enviados</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">{stats.error}</p>
                  <p className="text-xs text-red-600">Erros</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                  <p className="text-xs text-amber-600">Pendentes</p>
                </div>
              </div>

              {isImporting && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-center text-muted-foreground">{progress}% concluído</p>
                </div>
              )}

              <Button 
                onClick={sendMagicLinks} 
                disabled={isImporting || stats.pending === 0}
                className="w-full"
                size="lg"
              >
                <Send className="h-4 w-4 mr-2" />
                {isImporting ? 'Enviando...' : `Enviar Acesso para ${stats.pending} Usuários`}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Users Table */}
        {users.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">{user.name || '-'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell className="text-right">
                        {getStatusBadge(user.status)}
                        {user.error && (
                          <p className="text-xs text-red-500 mt-1">{user.error}</p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminImportUsers;
