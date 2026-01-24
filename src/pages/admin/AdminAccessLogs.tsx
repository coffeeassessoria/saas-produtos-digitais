import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LogIn, LogOut, Users, Calendar, Activity } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface AccessLog {
  id: string;
  user_id: string;
  email: string;
  event_type: 'login' | 'logout';
  created_at: string;
  user_agent: string | null;
}

const AdminAccessLogs = () => {
  // Fetch access logs
  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['admin-access-logs'],
    queryFn: async (): Promise<AccessLog[]> => {
      const { data, error } = await supabase
        .from('user_access_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as AccessLog[];
    },
  });

  // Calculate stats
  const { data: stats } = useQuery({
    queryKey: ['admin-access-stats'],
    queryFn: async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Logins today
      const { count: loginsToday } = await supabase
        .from('user_access_logs')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'login')
        .gte('created_at', today.toISOString());

      // Unique users this week
      const { data: weeklyUsers } = await supabase
        .from('user_access_logs')
        .select('email')
        .eq('event_type', 'login')
        .gte('created_at', weekAgo.toISOString());

      const uniqueUsersThisWeek = new Set(weeklyUsers?.map(u => u.email)).size;

      // Total logins
      const { count: totalLogins } = await supabase
        .from('user_access_logs')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'login');

      return {
        loginsToday: loginsToday || 0,
        uniqueUsersThisWeek,
        totalLogins: totalLogins || 0,
      };
    },
  });

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getDeviceInfo = (userAgent: string | null) => {
    if (!userAgent) return 'Desconhecido';
    
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      return 'Mobile';
    }
    return 'Desktop';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Logs de Acesso</h1>
          <p className="text-muted-foreground">
            Acompanhe a atividade dos usuários na plataforma
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Logins Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {stats?.loginsToday ?? '-'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Usuários Ativos (7 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {stats?.uniqueUsersThisWeek ?? '-'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Total de Logins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {stats?.totalLogins ?? '-'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Últimos 100 eventos</CardTitle>
            <CardDescription>
              Histórico de login e logout dos usuários
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum log de acesso registrado ainda</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div 
                    key={log.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 border border-border"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      log.event_type === 'login' 
                        ? 'bg-green-500/20 text-green-600' 
                        : 'bg-orange-500/20 text-orange-600'
                    }`}>
                      {log.event_type === 'login' ? (
                        <LogIn className="w-5 h-5" />
                      ) : (
                        <LogOut className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {log.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(log.created_at)} • {getDeviceInfo(log.user_agent)}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      log.event_type === 'login'
                        ? 'bg-green-500/20 text-green-700'
                        : 'bg-orange-500/20 text-orange-700'
                    }`}>
                      {log.event_type === 'login' ? 'Login' : 'Logout'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminAccessLogs;
