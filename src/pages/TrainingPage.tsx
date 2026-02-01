import { Dumbbell, Plus } from 'lucide-react';

const TrainingPage = () => {
  return (
    <div className="safe-top px-4 pb-4 pt-2">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Entraînement</h1>
        <p className="text-sm text-muted-foreground">Ton programme personnalisé</p>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Dumbbell className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          Aucun entraînement prévu
        </h3>
        <p className="mb-6 max-w-xs text-sm text-muted-foreground">
          Commence par créer ta première séance d'entraînement pour suivre ta progression.
        </p>
        <button className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-95">
          <Plus className="h-5 w-5" />
          Créer une séance
        </button>
      </div>

      {/* Future features hint */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">
          💡 Bientôt disponible : programmes personnalisés, suivi des exercices et records personnels.
        </p>
      </div>
    </div>
  );
};

export default TrainingPage;
