import type { SVGProps } from "react";

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
