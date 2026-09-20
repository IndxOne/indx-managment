import { EmptyState } from "../StateBlocks";

/** Vide global (attentionItems === []) — jamais "Aucune donnée" (§8 de la gate). */
export function BriefEmptyState({ onBackToProject }: { onBackToProject?: () => void }) {
  return (
    <EmptyState
      title="Rien ne nécessite ton attention actuellement."
      action={
        onBackToProject ? (
          <button type="button" className="btn tap-target" onClick={onBackToProject}>
            Retour au projet
          </button>
        ) : undefined
      }
    />
  );
}
