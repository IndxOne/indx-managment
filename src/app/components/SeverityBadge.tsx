import type { Tone } from "../utils/tone";

/**
 * Badge de tonalité générique (Lot UX-1, design system) — remplace à terme
 * les mappings couleur ad hoc dispersés (ex. SEVERITY_BORDER_VAR dans
 * BriefItemCard). Le libellé texte est toujours affiché : la couleur ne
 * porte jamais seule le sens (§14 accessibilité de la gate UX).
 */
export function SeverityBadge({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span className="severity-badge" data-tone={tone}>
      {label}
    </span>
  );
}
