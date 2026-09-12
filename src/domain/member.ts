/**
 * Membre d'un espace (Lot 8A) : une étiquette nommée pour l'assignation et
 * le filtrage, PAS un compte utilisateur authentifié. Aucun rôle, aucune
 * permission différenciée — voir la note de sécurité dans
 * supabase-store.tsx (modèle x-user-hash) pour les limites précises de ce
 * que "équipe" signifie dans ce produit en l'état.
 */
export interface Member {
  id: string;
  workspaceId: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  /**
   * Désactiver plutôt que supprimer : une action déjà assignée à ce membre
   * ne doit jamais perdre silencieusement son assigneeId (cadrage §Phase B).
   * `active: false` le retire des listes de sélection sans toucher aux
   * actions existantes.
   */
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMemberInput {
  id: string;
  workspaceId: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  now?: string;
}

export function createMember(input: CreateMemberInput): Member {
  const displayName = input.displayName.trim();
  if (!displayName) {
    throw new Error("Le nom du membre est requis");
  }
  const timestamp = input.now ?? new Date().toISOString();
  return {
    id: input.id,
    workspaceId: input.workspaceId,
    displayName,
    email: input.email?.trim() || undefined,
    avatarUrl: input.avatarUrl,
    active: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/** Change uniquement `displayName` (+ `updatedAt`) — mêmes garanties que changeWorkspaceApproach. */
export function renameMember(member: Member, displayName: string, now?: string): Member {
  const trimmed = displayName.trim();
  if (!trimmed) {
    throw new Error("Le nom du membre est requis");
  }
  if (trimmed === member.displayName) {
    return member;
  }
  return { ...member, displayName: trimmed, updatedAt: now ?? new Date().toISOString() };
}

/** Active/désactive un membre. Ne touche jamais aux assigneeIds des actions existantes. */
export function setMemberActive(member: Member, active: boolean, now?: string): Member {
  if (active === member.active) {
    return member;
  }
  return { ...member, active, updatedAt: now ?? new Date().toISOString() };
}
