import { createClient } from "npm:@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush@0.5.0";

/**
 * Envoie une notification push pour chaque relance due (statut "waiting",
 * relance activée, délai écoulé, pas encore déclenchée pour l'attente en
 * cours) — mêmes règles que src/reminders/waiting-reminder.ts, puis
 * enregistre le déclenchement dans l'historique pour que le client ne le
 * rejoue pas. Déclenchée par pg_cron (secret partagé en en-tête).
 *
 * Les clés VAPID sont générées au premier appel et stockées dans Vault :
 * elles ne transitent jamais par le repo, le chat ni le dashboard.
 */

const MS_PER_DAY = 86_400_000;
const CONTACT = "mailto:contact@indxone.com";

type ActionRow = {
  id: string;
  title: string;
  user_hash: string;
  waiting_since: string;
  waiting_reminder: { afterDays: number; enabled: boolean; history: string[] };
};
type SubscriptionRow = { endpoint: string; user_hash: string; subscription: webpush.PushSubscription };

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function secret(name: string): Promise<string | null> {
  const { data, error } = await db.rpc("projets_push_secret", { secret_name: name });
  if (error) throw error;
  return data ?? null;
}

async function loadVapidKeys(): Promise<CryptoKeyPair> {
  const stored = await secret("projets_vapid_keys");
  if (stored) return webpush.importVapidKeys(JSON.parse(stored));
  const keys = await webpush.generateVapidKeys({ extractable: true });
  const exported = await webpush.exportVapidKeys(keys);
  const publicKey = await webpush.exportApplicationServerKey(keys);
  for (const [secret_name, secret_value] of [
    ["projets_vapid_keys", JSON.stringify(exported)],
    ["projets_vapid_public", publicKey],
  ]) {
    const { error } = await db.rpc("projets_push_set_secret", { secret_name, secret_value });
    if (error) throw error;
  }
  return keys;
}

function isDue(row: ActionRow, now: Date): boolean {
  const rule = row.waiting_reminder;
  if (!rule?.enabled || !row.waiting_since) return false;
  const dueAt = new Date(row.waiting_since).getTime() + rule.afterDays * MS_PER_DAY;
  return now.getTime() >= dueAt && !rule.history.some((entry) => entry >= row.waiting_since);
}

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== (await secret("projets_push_cron_secret"))) {
    return new Response("Forbidden", { status: 403 });
  }
  const appServer = await webpush.ApplicationServer.new({ contactInformation: CONTACT, vapidKeys: await loadVapidKeys() });
  const now = new Date();

  const { data: actions, error } = await db
    .from("projets_actions")
    .select("id,title,user_hash,waiting_since,waiting_reminder")
    .eq("status", "waiting")
    .not("waiting_since", "is", null);
  if (error) throw error;
  const due = (actions as ActionRow[]).filter((row) => isDue(row, now));
  if (due.length === 0) return Response.json({ sent: 0 });

  const { data: subs, error: subsError } = await db
    .from("projets_push_subscriptions")
    .select("endpoint,user_hash,subscription")
    .in("user_hash", [...new Set(due.map((row) => row.user_hash))]);
  if (subsError) throw subsError;

  let sent = 0;
  const expired: string[] = [];
  for (const row of due) {
    let delivered = false;
    for (const sub of (subs as SubscriptionRow[]).filter((candidate) => candidate.user_hash === row.user_hash)) {
      try {
        await appServer.subscribe(sub.subscription).pushTextMessage(
          JSON.stringify({ title: "Relance à faire", body: row.title, tag: `reminder-${row.id}` }),
          { urgency: webpush.Urgency.Normal },
        );
        delivered = true;
        sent++;
      } catch (cause) {
        if (cause instanceof webpush.PushMessageError && [404, 410].includes(cause.response.status)) {
          expired.push(sub.endpoint);
        } else {
          console.error(`push échoué pour ${sub.endpoint}`, cause);
        }
      }
    }
    if (delivered) {
      const history = [...row.waiting_reminder.history, now.toISOString()];
      await db.from("projets_actions").update({ waiting_reminder: { ...row.waiting_reminder, history } }).eq("id", row.id);
    }
  }
  if (expired.length > 0) await db.from("projets_push_subscriptions").delete().in("endpoint", expired);
  return Response.json({ sent, expired: expired.length });
});
