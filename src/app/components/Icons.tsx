import type { SVGProps } from "react";
import type { ActionStatus } from "../../domain/types";

/**
 * Icônes SVG inline, style trait uniforme — remplace les emoji bruts (rendu
 * incohérent selon l'OS). Aucune dépendance externe : jeu réduit dessiné à
 * la main, cohérent avec le reste de l'app (sobre, pas de librairie d'icônes
 * complète pour une dizaine de glyphes).
 */

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function IconPlus(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function IconMore(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Poignée de glisser (drag handle), 2×3 points — même convention que IconMore. */
export function IconGripVertical(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="6" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <line x1="4" y1="7" x2="20" y2="7" />
      <circle cx="9" cy="7" r="2" fill="var(--icon-fill, var(--color-bg))" />
      <line x1="4" y1="14" x2="20" y2="14" />
      <circle cx="16" cy="14" r="2" fill="var(--icon-fill, var(--color-bg))" />
      <line x1="4" y1="19" x2="20" y2="19" />
      <circle cx="11" cy="19" r="2" fill="var(--icon-fill, var(--color-bg))" />
    </svg>
  );
}

export function IconSun(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4.5" />
      <line x1="12" y1="19.5" x2="12" y2="22" />
      <line x1="2" y1="12" x2="4.5" y2="12" />
      <line x1="19.5" y1="12" x2="22" y2="12" />
      <line x1="4.9" y1="4.9" x2="6.6" y2="6.6" />
      <line x1="17.4" y1="17.4" x2="19.1" y2="19.1" />
      <line x1="4.9" y1="19.1" x2="6.6" y2="17.4" />
      <line x1="17.4" y1="6.6" x2="19.1" y2="4.9" />
    </svg>
  );
}

export function IconCalendar(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <line x1="3.5" y1="10" x2="20.5" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </svg>
  );
}

export function IconGrid(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function IconLink(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9.5 14.5 L14.5 9.5" />
      <path d="M11 6.5 L13.5 4 a4 4 0 0 1 5.5 5.5 L16.5 12" />
      <path d="M13 17.5 L10.5 20 a4 4 0 0 1 -5.5 -5.5 L7.5 12" />
    </svg>
  );
}

export function IconMessage(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5.5 h16 a1 1 0 0 1 1 1 v9 a1 1 0 0 1 -1 1 H9 l-4 4 v-4 H4 a1 1 0 0 1 -1 -1 v-9 a1 1 0 0 1 1 -1 Z" />
    </svg>
  );
}

export function IconShare(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 15 V4" />
      <path d="M8 8 L12 4 L16 8" />
      <path d="M5 12 v7 a1 1 0 0 0 1 1 h12 a1 1 0 0 0 1 -1 v-7" />
    </svg>
  );
}

export function IconPencil(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20 l0.9 -4.2 L15.5 5.2 a1.8 1.8 0 0 1 2.5 0 l0.8 0.8 a1.8 1.8 0 0 1 0 2.5 L8.2 19.1 Z" />
      <line x1="13.7" y1="6.9" x2="17.1" y2="10.3" />
    </svg>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <line x1="4" y1="12" x2="18.5" y2="12" />
      <path d="M13.5 6.5 L19.5 12 L13.5 17.5" />
    </svg>
  );
}

export function IconFilter(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5h16" />
      <path d="M7 12h10" />
      <path d="M10 19h4" />
    </svg>
  );
}

export function IconPlusCircle(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9.25" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <svg {...base} strokeWidth={2.4} {...props}>
      <path d="M9 5 l7 7 l-7 7" />
    </svg>
  );
}

/**
 * Checkbox de statut façon Reminders/Things : cercle creux (à faire),
 * demi-disque plein (en cours), cercle plein + coche (terminé), cercle
 * pointillé (en attente). Dessinée en SVG plutôt qu'en ::before CSS pour
 * reproduire fidèlement le rendu validé sur la maquette iOS.
 */
export function StatusCheckIcon({ status, size = 24 }: { status: ActionStatus; size?: number }) {
  if (status === "done") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10.5" fill="#34C759" />
        <path
          d="M7.5 12.5 L10.3 15.3 L16.5 8.7"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (status === "doing") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="none" stroke="var(--color-accent)" strokeWidth={1.8} />
        <path d="M12 12 L12 2 A10 10 0 0 1 22 12 Z" fill="var(--color-accent)" />
      </svg>
    );
  }
  if (status === "waiting") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke="var(--color-warning)"
          strokeWidth={1.8}
          strokeDasharray="3.2 3.2"
        />
      </svg>
    );
  }
  if (status === "blocked") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="none" stroke="var(--color-danger)" strokeWidth={1.8} />
        <line x1="6.2" y1="17.8" x2="17.8" y2="6.2" stroke="var(--color-danger)" strokeWidth={1.8} strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="none" stroke="var(--color-text-tertiary)" strokeWidth={1.8} />
    </svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <line x1="4" y1="7" x2="20" y2="7" />
      <path d="M6.5 7 V19 a1.5 1.5 0 0 0 1.5 1.5 h8 a1.5 1.5 0 0 0 1.5 -1.5 V7" />
      <path d="M9.5 7 V4.5 a1 1 0 0 1 1 -1 h3 a1 1 0 0 1 1 1 V7" />
      <line x1="10.2" y1="10.5" x2="10.2" y2="16.5" />
      <line x1="13.8" y1="10.5" x2="13.8" y2="16.5" />
    </svg>
  );
}

export function IconBell(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c0.5 -0.5 2 -2 2 -6Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function IconNotebook(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="3.5" width="14" height="17" rx="1.8" />
      <line x1="9" y1="3.5" x2="9" y2="20.5" />
      <line x1="12.5" y1="8" x2="16" y2="8" />
      <line x1="12.5" y1="12" x2="16" y2="12" />
    </svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <line x1="15.3" y1="15.3" x2="20.5" y2="20.5" />
    </svg>
  );
}

export function IconLayers(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5 20.5 8 12 12.5 3.5 8Z" />
      <path d="M3.5 12 12 16.5 20.5 12" />
      <path d="M3.5 16 12 20.5 20.5 16" />
    </svg>
  );
}

export function IconTray(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 13 L7.5 13 a1 1 0 0 1 0.9 0.55 L9.6 16.5 a1 1 0 0 0 0.9 0.55 h3 a1 1 0 0 0 0.9 -0.55 l1.2 -2.4 a1 1 0 0 1 0.9 -0.55 L20 13" />
      <path d="M6 6 h12 l2 7 v6 a1 1 0 0 1 -1 1 H5 a1 1 0 0 1 -1 -1 v-6 Z" />
    </svg>
  );
}

export function IconCompass(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M14.8 9.2 12.9 13.4 8.7 15.3 10.6 11.1Z" />
    </svg>
  );
}
