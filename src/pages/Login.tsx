import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChefHat, Mail, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type LoginStep = 'email' | 'sent';

const Login = () => {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<LoginStep>('email');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading, isAdmin, isAdminLoading } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    // Wait for admin check to complete so admin users can reach /admin reliably
    if (user && !isLoading && !isAdminLoading) {
      const from = location.state?.from?.pathname || '/';
      if (isAdmin && from.startsWith('/admin')) {
        navigate(from);
      } else {
        navigate('/');
      }
    }
  }, [user, isLoading, isAdminLoading, navigate, location, isAdmin]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSendLink = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!email.trim()) {
      toast.error('Digite seu e-mail');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-login-link', {
        body: { email: email.toLowerCase().trim() }
      });
      
      if (error) {
        console.error('Send link error:', error);
        toast.error('Erro ao enviar link. Tente novamente.');
        return;
      }

      if (data?.error === 'email_not_found') {
        toast.error('E-mail não cadastrado. Verifique se usou o e-mail da compra.');
        return;
      }

      if (data?.error) {
        toast.error(data.message || 'Erro ao enviar link.');
        return;
      }

      setStep('sent');
      setResendCooldown(60);
      toast.success('Link enviado para seu e-mail!');
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    await handleSendLink();
  };

  const handleBack = () => {
    setStep('email');
    setEmail('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 safe-top safe-bottom">
      <div className="w-full max-w-md space-y-8">
        
        {/* Logo - Larger for seniors */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center shadow-lg">
            <ChefHat className="w-14 h-14 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Glico Leve</h1>
          <p className="text-lg text-muted-foreground text-center">
            Receitas para controle glicêmico
          </p>
        </div>

        {/* Login Card - Optimized for seniors */}
        <div className="bg-card rounded-2xl shadow-lg border p-8 space-y-6">
          
          {step === 'email' ? (
            <>
              {/* Step 1: Email Input */}
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-foreground">
                  Entrar nas Receitas
                </h2>
                <p className="text-lg text-muted-foreground">
                  Use o e-mail da sua compra
                </p>
              </div>

              <form onSubmit={handleSendLink} className="space-y-6">
                <div className="space-y-3">
                  <label htmlFor="email" className="text-lg font-medium text-foreground block">
                    Seu e-mail
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-14 h-16 text-xl rounded-xl border-2 focus:border-primary"
                      required
                      disabled={isSubmitting}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-16 text-xl font-bold rounded-xl shadow-md"
                  disabled={isSubmitting}
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Receber link de acesso'
                  )}
                </Button>
              </form>

              {/* Help text for seniors */}
              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <p className="text-base text-muted-foreground text-center">
                  💡 <strong>Dica:</strong> Digite o mesmo e-mail que você usou para comprar o produto.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Step 2: Link Sent Confirmation */}
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-12 h-12 text-primary" />
                </div>
                
                <h2 className="text-2xl font-bold text-foreground">
                  Link Enviado!
                </h2>
                
                <div className="space-y-3">
                  <p className="text-xl text-muted-foreground">
                    Enviamos um link para:
                  </p>
                  <p className="text-xl font-semibold text-foreground bg-muted rounded-lg py-3 px-4">
                    {email}
                  </p>
                </div>
              </div>

              {/* Instructions for seniors */}
              <div className="bg-primary/10 border-2 border-primary/30 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-bold text-primary text-center">
                  📧 O que fazer agora:
                </h3>
                <ol className="text-lg text-foreground/80 space-y-3">
                  <li className="flex gap-3">
                    <span className="font-bold">1.</span>
                    <span>Abra o seu e-mail</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold">2.</span>
                    <span>Procure o e-mail do <strong>Glico Leve</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold">3.</span>
                    <span>Clique no <strong>botão verde</strong> "ENTRAR NAS RECEITAS"</span>
                  </li>
                </ol>
              </div>

              {/* Spam warning */}
              <div className="bg-accent border border-accent-foreground/20 rounded-xl p-4">
                <p className="text-base text-accent-foreground text-center">
                  ⚠️ Não encontrou? Verifique a pasta de <strong>spam</strong> ou <strong>lixo eletrônico</strong>
                </p>
              </div>

              {/* Action buttons */}
              <div className="space-y-4">
                <Button 
                  onClick={handleResend}
                  variant="outline"
                  className="w-full h-14 text-lg font-medium rounded-xl"
                  disabled={resendCooldown > 0 || isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-5 w-5 mr-2" />
                  )}
                  {resendCooldown > 0 
                    ? `Reenviar em ${resendCooldown}s` 
                    : 'Reenviar link'
                  }
                </Button>

                <Button 
                  onClick={handleBack}
                  variant="ghost"
                  className="w-full h-12 text-base text-muted-foreground"
                >
                  Usar outro e-mail
                </Button>
              </div>
            </>
          )}
        </div>

        <p className="text-sm text-center text-muted-foreground px-4">
          Ao entrar, você concorda com nossos termos de uso e política de privacidade.
        </p>
      </div>
    </div>
  );
};

export default Login;
