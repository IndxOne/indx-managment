import type { ReactNode } from "react";

/**
 * Bloc titré réutilisé par les 5 sections d'Aujourd'hui (cadrage "Aujourd'hui
 * screen") : un titre, un message vide explicite avec action suivante en
 * option (jamais un bloc vide silencieux), sinon le contenu. Ne porte aucune
 * logique de sélection — HomeScreen reste seul responsable de ce qu'il
 * affiche, ce composant ne fait que la mise en page commune.
 */
export function TodaySection({
  id,
  title,
  isEmpty,
  emptyMessage,
  emptyAction,
  children,
}: {
  id: string;
  title: string;
  isEmpty: boolean;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="today-section">
      <h2 id={id} className="section-title">
        {title}
      </h2>
      {isEmpty ? (
        <div className="today-section-empty">
          {emptyMessage && <p className="action-sub">{emptyMessage}</p>}
          {emptyAction}
        </div>
      ) : (
        children
      )}
    </section>
  );
}
