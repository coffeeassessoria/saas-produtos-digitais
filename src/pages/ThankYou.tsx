import { Check, Mail, MousePointer, ChefHat, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const ThankYou = () => {
  const steps = [
    {
      number: 1,
      icon: Mail,
      title: "Verifique seu E-mail",
      description: "Enviamos um link de acesso para o e-mail cadastrado na compra. Confira também a pasta de spam.",
      tip: "O e-mail chega em até 5 minutos"
    },
    {
      number: 2,
      icon: MousePointer,
      title: "Clique no Botão ENTRAR",
      description: "No e-mail, você verá um botão grande e verde escrito 'ENTRAR'. Clique nele para acessar.",
      tip: "Não precisa de senha!"
    },
    {
      number: 3,
      icon: ChefHat,
      title: "Acesse Suas Receitas",
      description: "Pronto! Você será direcionado diretamente para suas receitas exclusivas.",
      tip: "Salve o site nos favoritos"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-8 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-12 h-12" strokeWidth={3} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Compra Confirmada! 🎉
          </h1>
          <p className="text-xl opacity-90">
            Seu acesso às receitas já está liberado
          </p>
        </div>
      </div>

      {/* Steps Section */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">
          Como Acessar Suas Receitas
        </h2>
        <p className="text-center text-muted-foreground mb-10 text-lg">
          Siga estes 3 passos simples
        </p>

        <div className="space-y-6">
          {steps.map((step, index) => (
            <Card key={step.number} className="p-6 md:p-8 relative overflow-hidden">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Step Number */}
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl md:text-3xl font-bold">
                    {step.number}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <step.icon className="w-6 h-6 text-primary" />
                    <h3 className="text-xl md:text-2xl font-semibold">
                      {step.title}
                    </h3>
                  </div>
                  
                  <p className="text-lg text-muted-foreground mb-4">
                    {step.description}
                  </p>

                  {/* Tip */}
                  <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                    <span>💡</span>
                    <span>{step.tip}</span>
                  </div>
                </div>
              </div>

              {/* Arrow between steps */}
              {index < steps.length - 1 && (
                <div className="hidden md:flex absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="w-12 h-12 bg-background border-2 border-primary/20 rounded-full flex items-center justify-center">
                    <ArrowRight className="w-5 h-5 text-primary rotate-90" />
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Email Preview Mock */}
        <div className="mt-12 bg-muted/50 rounded-2xl p-6 md:p-8">
          <h3 className="text-xl font-semibold text-center mb-6">
            📧 Veja como será o e-mail que você vai receber:
          </h3>
          
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto border">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <ChefHat className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-semibold text-lg mb-2">Receitas Exclusivas</h4>
              <p className="text-muted-foreground text-sm mb-6">
                Clique no botão abaixo para acessar suas receitas
              </p>
              <div className="bg-primary text-primary-foreground font-bold py-4 px-8 rounded-lg text-lg">
                ENTRAR
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Este link é pessoal e intransferível
              </p>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-12 text-center">
          <Card className="p-6 md:p-8 bg-primary/5 border-primary/20">
            <h3 className="text-xl font-semibold mb-3">
              Precisa de Ajuda? 🤝
            </h3>
            <p className="text-muted-foreground mb-4">
              Se não receber o e-mail em 10 minutos ou tiver qualquer dúvida:
            </p>
            <ul className="text-left max-w-md mx-auto space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Verifique a pasta de <strong>Spam</strong> ou <strong>Lixo Eletrônico</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Confirme se o e-mail da compra está correto</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Entre em contato pelo suporte da Kiwify</span>
              </li>
            </ul>
          </Card>
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <p className="text-muted-foreground mb-4">
            Já recebeu o e-mail? Acesse agora:
          </p>
          <Button size="lg" asChild className="text-lg px-8 py-6">
            <a href="/login">
              Ir para a Página de Login
              <ArrowRight className="ml-2 w-5 h-5" />
            </a>
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-muted/30 py-6 text-center text-muted-foreground text-sm">
        <p>© {new Date().getFullYear()} Receitas Exclusivas. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default ThankYou;
