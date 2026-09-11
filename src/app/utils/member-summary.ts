import type { Member } from "../../domain/member";

/** Initiales (1-2 lettres) pour un affichage compact — jamais le nom complet sur une carte. */
export function memberInitials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

/**
 * Résout les responsables d'une action à partir de ses assigneeIds — inclut
 * les membres désactivés (une assignation historique reste affichable,
 * cf. cadrage §Phase B/D) mais jamais un id sans membre correspondant
 * (membre supprimé plus tard, cas hors scope V1).
 */
export function resolveAssignees(members: readonly Member[], assigneeIds: readonly string[]): Member[] {
  return assigneeIds.flatMap((id) => {
    const member = members.find((candidate) => candidate.id === id);
    return member ? [member] : [];
  });
}

/** Libellé compact pour ActionDetailSheet : "Koffi", "Koffi, Alice", ou "Non assigné". */
export function assigneesLabel(members: readonly Member[], assigneeIds: readonly string[]): string {
  const assignees = resolveAssignees(members, assigneeIds);
  if (assignees.length === 0) return "Non assigné";
  return assignees.map((member) => member.displayName).join(", ");
}
