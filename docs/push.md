# Notifications push des relances

Web Push (RFC 8030/8291/8292) pour les relances d'actions au statut
`waiting`. Mêmes règles de déclenchement que `src/reminders/waiting-reminder.ts`
(délai `afterDays` depuis `waitingSince`, une seule relance par période
d'attente), mais poussées au niveau OS même app fermée — le calcul côté
client (`triggerWaitingReminderIfDue`) ne couvre que l'app ouverte.

## Architecture

```
pg_cron (horaire, 0 * * * *)
  → net.http_post vers l'Edge Function projets-push-reminders
    → sélectionne les actions waiting dues (mêmes règles que waiting-reminder.ts)
    → pour chaque abonnement du user_hash concerné : chiffre + envoie via @negrel/webpush
    → purge les abonnements 404/410 (endpoint expiré/désinscrit côté navigateur)
    → enregistre le déclenchement dans waiting_reminder.history (idempotence)
```

Côté client (`src/app/push/push-subscription.ts`) :
- `enablePush` lit la clé publique VAPID via RPC `projets_push_public_key`,
  s'abonne (`pushManager.subscribe`), stocke `PushSubscription.toJSON()`
  dans `projets_push_subscriptions` (RLS par `x-user-hash`, comme les
  autres tables `projets_*`).
- `disablePush` supprime la ligne puis appelle `unsubscribe()`.
- Le service worker (`src/app/public/sw-push.js`, importé par le SW
  Workbox via `workbox.importScripts`) affiche la notification et gère le
  clic (focus ou ouverture de l'app).

## Secrets (Vault uniquement — jamais dans le repo, le build ou le chat)

| Secret | Contenu | Accès |
|---|---|---|
| `projets_vapid_keys` | paire de clés VAPID complète (JSON) | `service_role` uniquement, via `projets_push_secret` |
| `projets_vapid_public` | clé publique VAPID (applicationServerKey) | exposée en lecture via RPC `projets_push_public_key` (anon/authenticated) |
| `projets_push_cron_secret` | secret partagé pg_cron → Edge Function | `service_role` uniquement |
| `project_url` | URL du projet Supabase | `service_role` uniquement (le secret scanning Netlify refuse l'URL en dur dans le repo) |

Les clés VAPID sont générées **au premier appel** de l'Edge Function
(`loadVapidKeys`) si `projets_vapid_keys` est absent, puis persistées. Ce
n'est ni toi ni moi qui les génère : la fonction le fait elle-même en
production.

## Rotation des clés VAPID

Changer les clés VAPID invalide tous les abonnements existants côté
navigateur (l'`applicationServerKey` utilisée à l'abonnement doit
correspondre à celle utilisée à l'envoi). Procédure :

1. Supprimer `projets_vapid_keys` et `projets_vapid_public` de Vault
   (Supabase dashboard → Project Settings → Vault, ou SQL
   `select vault.delete_secret(id) from vault.secrets where name in (...)`).
2. Le prochain appel de l'Edge Function régénère une nouvelle paire.
3. Chaque appareil doit se réabonner (`disablePush` puis `enablePush` dans
   Réglages) — l'ancien abonnement échouera silencieusement (410) et sera
   purgé automatiquement au cron suivant.

Rotation à faire uniquement en cas de compromission suspectée — pas de
rotation périodique automatique (pas de bénéfice sécurité pour un usage
personnel, coût = réabonnement manuel sur chaque appareil).

## Limites connues

- **Pas de retry** : un envoi qui échoue pour une raison autre que 404/410
  (ex. timeout réseau ponctuel) est simplement loggé (`console.error`) et
  perdu — la relance suivante n'arrivera qu'au prochain cycle horaire où
  la relance est encore due (elle le reste tant qu'aucun envoi n'a
  réussi, donc pas de perte définitive, juste un délai).
- **Granularité horaire** : le cron tourne une fois par heure, pas en
  temps réel au moment exact où le délai expire.
- **Un seul message par relance due** : pas de rappel de rappel si
  l'utilisateur ignore la notification — il faudra rouvrir l'app.

## Debug d'un push qui n'arrive pas

Voir le post-mortem de mise au point (PR #22) : la cause la plus commune
n'est pas le serveur mais le **service worker qui n'affiche rien**. Le
navigateur (Chrome) exige un `showNotification()` par push reçu ; en son
absence il compte une violation « push silencieux » et finit par
bloquer les futurs `subscribe()` avec l'erreur générique
`Registration failed - push service error`. `sw-push.js` doit donc
toujours appeler `showNotification()`, y compris si le payload n'est pas
du JSON exploitable (`try/catch` avec repli sur le texte brut).

Test manuel sans attendre le cron (SQL, avec les privilèges `service_role`
côté Supabase) :

```sql
select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/projets-push-reminders',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'projets_push_cron_secret')
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 20000 -- le défaut (5s) timeout souvent avant la fin de l'envoi
);
```

La réponse `{"sent":0}` alors qu'une relance est due signifie
généralement qu'elle a déjà été déclenchée pour cette période d'attente
(vérifier `waiting_reminder.history`) — pas un échec.
