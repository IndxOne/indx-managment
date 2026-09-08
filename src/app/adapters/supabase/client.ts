import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getOrCreateUserHash } from "./user-hash";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

let cachedClient: SupabaseClient | null = null;

/**
 * Client Supabase unique par session navigateur, avec le hash utilisateur
 * déjà attaché en en-tête (voir user-hash.ts et la policy RLS des tables
 * projets_*). N'appeler qu'après avoir vérifié isSupabaseConfigured().
 */
export function getSupabaseClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "Supabase non configuré : VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY manquants (.env.local)"
    );
  }
  if (!cachedClient) {
    cachedClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { "x-user-hash": getOrCreateUserHash() } },
    });
  }
  return cachedClient;
}
