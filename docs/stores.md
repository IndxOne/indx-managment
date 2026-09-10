# Empaquetage stores (Play / App Store)

L'app est une PWA installable (manifest + service worker, cf.
`vite.config.ts`). Aucun code natif : l'empaquetage stores passe par
[PWABuilder](https://www.pwabuilder.com), qui génère un wrapper natif
autour de l'URL de production.

## Google Play (Android, via TWA)

1. **Compte développeur** : https://play.google.com/console/signup — 25 $
   paiement unique, vérification d'identité (24-48h).
2. **Génération du package** : sur pwabuilder.com, coller l'URL de
   **production** (`main`, jamais une preview Netlify) → onglet Android →
   package type **Google Play** (Trusted Web Activity). Package ID déjà
   fixé : `com.indxone.projets` (cohérent avec `assetlinks.json`).
3. Télécharger le `.aab` et le fichier de clé de signature généré par
   PWABuilder (à conserver — nécessaire pour les mises à jour futures si
   tu ne passes pas par Play App Signing).
4. Créer la fiche store dans Play Console, uploader le `.aab`.
5. **Empreinte SHA-256** : une fois l'app publiée (ou en test interne),
   Play Console → ton app → *Intégrité de l'app* → *App signing* → copier
   le *SHA-256 certificate fingerprint* (celui de **Play App Signing**,
   pas celui du keystore local — Google re-signe l'APK final).
6. Renseigner cette empreinte dans
   `src/app/public/.well-known/assetlinks.json`
   (`sha256_cert_fingerprints`). Sans elle, l'app s'ouvre avec la barre
   d'adresse visible (pas en TWA plein écran) — pas bloquant pour la
   review, juste dégradé visuellement.

Champs manifest déjà prêts pour PWABuilder (`vite.config.ts`) : `id`,
`scope`, `categories`, `screenshots` (narrow 810×1440, wide 1920×1080).

## Apple App Store (iOS)

Safari/WebKit n'a pas d'équivalent TWA : PWABuilder génère un projet
Xcode qui embarque une WKWebView pointant vers l'URL de production. Pas
de compte développeur configuré à ce jour (bloquant identifié dès le
départ).

**Risque guideline 4.2** ("Minimum Functionality") : Apple rejette les
wrappers de site web sans valeur ajoutée native perceptible. Mitigations
retenues :

| Mitigation | Statut |
|---|---|
| Notifications push natives (relances) | ✅ fait (PR #22, `docs/push.md`) |
| Partage natif (Web Share API) | ✅ fait (PR courante) |
| Icônes/launch screen natifs, splash screen | ✅ via manifest/PWABuilder |
| Raccourcis d'app (`shortcuts` du manifest) | ❌ hors périmètre — nécessiterait un routeur (l'app navigue par état, pas par URL), pas de valeur suffisante pour le coût |
| Capacitor (accès natif plus profond que WKWebView) | ❌ hors périmètre — sur-ingénierie pour une app mono-utilisateur, pas de fonctionnalité qui le justifie aujourd'hui |

Avec push + partage natif, l'app dépasse le simple wrapper de site
(actions déclenchées par l'OS, intégration au système de partage iOS).
Reste un risque de rejet subjectif — pas de garantie contractuelle côté
Apple.

## Ce qui reste à faire, dans l'ordre

1. Créer le compte Play (toi, hors repo).
2. Générer le package + récupérer l'empreinte SHA-256 (toi).
3. Me donner l'empreinte → je mets à jour `assetlinks.json` (PR).
4. Publier sur Play (test interne d'abord).
5. Décider si la soumission iOS vaut le compte développeur (99 $/an) au
   vu du risque 4.2 restant, ou si Play suffit pour l'usage visé.
