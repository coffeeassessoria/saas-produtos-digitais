import { useState } from 'react';
import { Lightbulb, Send, X, ThumbsUp, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { useRecipeSuggestions, useUserVotes, useCreateSuggestion, useToggleVote } from '@/hooks/useRecipeSuggestions';
import { cn } from '@/lib/utils';

const RecipeSuggestionBanner = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: suggestions = [] } = useRecipeSuggestions();
  const { data: userVotes = [] } = useUserVotes();
  const createSuggestion = useCreateSuggestion();
  const toggleVote = useToggleVote();

  const pendingSuggestions = suggestions.filter(s => s.status !== 'completed' && s.status !== 'rejected');

  const hasVoted = (suggestionId: string) => {
    return userVotes.some(v => v.suggestion_id === suggestionId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Digite o nome da receita que você quer');
      return;
    }

    try {
      await createSuggestion.mutateAsync({ title: title.trim(), description: description.trim() || undefined });
      toast.success('Sugestão enviada com sucesso! 🎉');
      setTitle('');
      setDescription('');
      setIsDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao enviar sugestão');
      console.error(error);
    }
  };

  const handleVote = async (suggestionId: string) => {
    try {
      await toggleVote.mutateAsync({ 
        suggestionId, 
        hasVoted: hasVoted(suggestionId) 
      });
    } catch (error) {
      toast.error('Erro ao votar');
      console.error(error);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { text: string; className: string }> = {
      pending: { text: 'Pendente', className: 'bg-muted text-muted-foreground' },
      in_review: { text: 'Em análise', className: 'bg-primary/20 text-primary' },
      approved: { text: 'Aprovado', className: 'bg-green-500/20 text-green-700' },
      rejected: { text: 'Rejeitado', className: 'bg-destructive/20 text-destructive' },
      completed: { text: 'Concluído', className: 'bg-green-500/20 text-green-700' },
    };
    return labels[status] || labels.pending;
  };

  return (
    <div className="mb-6">
      {/* Main Banner */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              Precisa de uma receita nova?
            </p>
            <p className="text-xs text-muted-foreground">
              Mande sua sugestão para nossa equipe!
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex-shrink-0">
                <Send className="w-4 h-4 mr-1" />
                Sugerir
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  Sugerir Nova Receita
                </DialogTitle>
                <DialogDescription>
                  Diga qual receita você gostaria de ver na plataforma. 
                  Se várias pessoas pedirem, a gente cria!
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">
                    Qual receita você quer? *
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Bolo de cenoura sem açúcar"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">
                    Algum detalhe adicional? (opcional)
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Seria ótimo se tivesse cobertura de chocolate..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createSuggestion.isPending}
                  >
                    {createSuggestion.isPending ? 'Enviando...' : 'Enviar Sugestão'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Collapsible Suggestions List */}
      {pendingSuggestions.length > 0 && (
        <Collapsible open={showSuggestions} onOpenChange={setShowSuggestions}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full mt-2 h-auto py-2 text-muted-foreground hover:text-foreground"
            >
              <span className="text-sm">
                Ver {pendingSuggestions.length} sugestões da comunidade
              </span>
              {showSuggestions ? (
                <ChevronUp className="w-4 h-4 ml-2" />
              ) : (
                <ChevronDown className="w-4 h-4 ml-2" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {pendingSuggestions.map((suggestion) => {
              const voted = hasVoted(suggestion.id);
              const statusInfo = getStatusLabel(suggestion.status);
              
              return (
                <div 
                  key={suggestion.id}
                  className="bg-card border border-border rounded-lg p-3 flex items-center gap-3"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "flex-shrink-0 h-12 w-12 flex-col gap-0 p-0",
                      voted && "bg-primary/10 border-primary text-primary"
                    )}
                    onClick={() => handleVote(suggestion.id)}
                    disabled={toggleVote.isPending}
                  >
                    <ThumbsUp className={cn("w-4 h-4", voted && "fill-primary")} />
                    <span className="text-xs font-semibold">{suggestion.vote_count}</span>
                  </Button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {suggestion.title}
                    </p>
                    {suggestion.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {suggestion.description}
                      </p>
                    )}
                    <span className={cn("text-xs px-2 py-0.5 rounded-full mt-1 inline-block", statusInfo.className)}>
                      {statusInfo.text}
                    </span>
                  </div>
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

export default RecipeSuggestionBanner;
