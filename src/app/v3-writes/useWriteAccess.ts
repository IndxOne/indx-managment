import { useEffect, useState } from "react";
import { findProjectById } from "../../infrastructure/persistence/v3/repositories/project-repository";
import { getSupabaseClient } from "../adapters/supabase/client";
import { useAuthState } from "../hooks/useAuthState";
import { isV3WritesEnabled } from "./defaults";
import { canWriteRole, getWorkspaceRole, pickWritableWorkspace } from "./writes";

export interface WriteAccess {
  /** Écriture autorisée (session valide + rôle owner/editor réel + interrupteur actif). */
  canWrite: boolean;
  /** Rôle résolu (false tant que la vérification est en cours). */
  resolved: boolean;
  authUserId?: string;
}

const NONE: WriteAccess = { canWrite: false, resolved: false };

/** Droit d'écriture sur un projet : rôle réel lu via workspace_role() ; la RLS reste l'autorité finale. */
export function useProjectWriteAccess(projectId: string): WriteAccess {
  const auth = useAuthState();
  const [access, setAccess] = useState<WriteAccess>(NONE);
  useEffect(() => {
    if (auth.status !== "authenticated" || !isV3WritesEnabled()) {
      setAccess({ canWrite: false, resolved: auth.status !== "loading" });
      return;
    }
    let cancelled = false;
    setAccess(NONE);
    const client = getSupabaseClient();
    void (async () => {
      const project = await findProjectById(client, projectId);
      const role = project.ok && project.value ? await getWorkspaceRole(client, project.value.workspaceId) : null;
      if (!cancelled) setAccess({ canWrite: canWriteRole(role), resolved: true, authUserId: auth.authUserId });
    })();
    return () => {
      cancelled = true;
    };
  }, [auth, projectId]);
  return access;
}

export interface CreateAccess extends WriteAccess {
  workspaceId?: string;
}

/** Espace où créer un projet : premier espace (propriétaire en priorité) où l'utilisateur peut écrire. */
export function useCreateProjectAccess(workspaceIds: string[]): CreateAccess {
  const auth = useAuthState();
  const [access, setAccess] = useState<CreateAccess>(NONE);
  const key = workspaceIds.join(",");
  useEffect(() => {
    if (auth.status !== "authenticated" || !isV3WritesEnabled() || workspaceIds.length === 0) {
      setAccess({ canWrite: false, resolved: auth.status !== "loading" });
      return;
    }
    let cancelled = false;
    void (async () => {
      const workspaceId = await pickWritableWorkspace(getSupabaseClient(), workspaceIds);
      if (!cancelled) setAccess({ canWrite: workspaceId !== null, resolved: true, workspaceId: workspaceId ?? undefined, authUserId: auth.authUserId });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, key]);
  return access;
}
