import UserLayout from '@/components/layout/UserLayout';
import ModuleCard from '@/components/ModuleCard';
import { useModulesWithAccess } from '@/hooks/useModules';
import { Sparkles, Loader2 } from 'lucide-react';

const Home = () => {
  const { data: modules = [], isLoading } = useModulesWithAccess();

  const unlockedModules = modules.filter((m) => m.isUnlocked);
  const lockedModules = modules.filter((m) => !m.isUnlocked);

  if (isLoading) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="space-y-8">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Olá! 👋</h1>
          <p className="text-muted-foreground mt-1">Explore suas receitas exclusivas</p>
        </div>

        {/* Unlocked Modules */}
        {unlockedModules.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">Seus Módulos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {unlockedModules.map((module) => (
                <ModuleCard key={module.id} module={module} />
              ))}
            </div>
          </section>
        )}

        {/* No unlocked modules message */}
        {unlockedModules.length === 0 && (
          <section className="text-center py-8">
            <p className="text-muted-foreground">
              Você ainda não tem módulos desbloqueados.
            </p>
          </section>
        )}

        {/* Locked Modules (Upsell) */}
        {lockedModules.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Novos Módulos</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {lockedModules.map((module) => (
                <ModuleCard key={module.id} module={module} />
              ))}
            </div>
          </section>
        )}
      </div>
    </UserLayout>
  );
};

export default Home;
