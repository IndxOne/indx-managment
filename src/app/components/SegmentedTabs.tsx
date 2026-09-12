/**
 * Contrôle segmenté partagé (Lot 6) : RUN (Aujourd'hui/Cette semaine) et
 * PROJET (Par étapes/Par semaine) dupliquaient chacun le même DOM/CSS
 * (curseur glissant `.segmented-thumb` + boutons `role="tab"`) — un seul
 * composant, aucun changement de comportement pour l'un ou l'autre.
 * Généralise le calcul du curseur à N onglets (2 aujourd'hui) : pour N=2,
 * `calc((100% - 4px) / 2)` égale exactement l'ancien `calc(50% - 2px)`.
 */
export function SegmentedTabs<T extends string>({
  ariaLabel,
  options,
  value,
  onChange,
}: {
  ariaLabel: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.id === value)
  );

  return (
    <div className="segmented" role="tablist" aria-label={ariaLabel}>
      <div
        className="segmented-thumb"
        aria-hidden="true"
        style={{
          width: `calc((100% - 4px) / ${options.length})`,
          left: 2,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={option.id === value}
          aria-current={option.id === value}
          className="segmented-item"
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
