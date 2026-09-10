import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Abonnement Web Push de cet appareil (relances dues, envoyées par l'Edge
 * Function projets-push-reminders). La clé publique VAPID vient de la base
 * (RPC projets_push_public_key), jamais d'une variable de build. Le service
 * worker n'existe qu'en build de production : en dev, l'abonnement est
 * impossible et le message l'explique.
 */

const TABLE = "projets_push_subscriptions";

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
}

export async function isPushEnabled(): Promise<boolean> {
  return isPushSupported() && (await currentSubscription()) !== null;
}

export async function enablePush(client: SupabaseClient, userHash: string): Promise<void> {
  const { data: publicKey, error: keyError } = await client.rpc("projets_push_public_key");
  if (keyError) throw keyError;
  if (typeof publicKey !== "string") throw new Error("Serveur de notifications pas encore initialisé.");
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) throw new Error("Service worker absent (disponible uniquement sur l'app déployée).");
  if ((await Notification.requestPermission()) !== "granted") throw new Error("Permission de notification refusée.");
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    // base64url accepté tel quel par tous les navigateurs qui gèrent Web Push (Chrome, Firefox, Safari ≥ 16.4).
    applicationServerKey: publicKey,
  });
  const { error } = await client
    .from(TABLE)
    .upsert({ endpoint: subscription.endpoint, user_hash: userHash, subscription: subscription.toJSON() });
  if (error) {
    await subscription.unsubscribe();
    throw error;
  }
}

export async function disablePush(client: SupabaseClient): Promise<void> {
  const subscription = await currentSubscription();
  if (!subscription) return;
  const { error } = await client.from(TABLE).delete().eq("endpoint", subscription.endpoint);
  if (error) throw error;
  await subscription.unsubscribe();
}
