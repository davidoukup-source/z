# Tableau de Vie

Application web personnelle, pour un seul utilisateur, qui rassemble sur une seule page :
l'agenda Google, les emails Gmail triés, les tâches, des alertes croisées, et qui envoie
chaque matin un résumé par email.

- **Stack** : Next.js 15 (App Router, TypeScript), Tailwind CSS 4 + composants shadcn/ui,
  Supabase (Postgres, Auth, RLS), Google Calendar API + Gmail API (lecture seule),
  Resend (emails), Vercel (hébergement + Cron Jobs).
- **IA optionnelle** : si `ANTHROPIC_API_KEY` est défini, Claude classe les emails, comprend
  les tâches écrites librement et rédige le résumé. Sinon, l'app fonctionne **gratuitement**
  avec des règles (voir « Fonctionnement sans IA »).

## État d'avancement

- [x] (a) Projet de base et connexion (Supabase Auth via Google, accès limité à un email)
- [x] (b) Google OAuth et agenda
- [x] (c) Emails et classification (Claude si clé API, sinon règles gratuites)
- [x] (d) Tâches et alertes
- [x] (e) Cron et résumé par email

## Sécurité

- **Lecture seule** : l'app ne demande que `calendar.readonly` et `gmail.readonly`. Elle ne peut
  ni envoyer, ni modifier, ni supprimer un email ou un événement.
- **Un seul utilisateur** : toute connexion avec un autre email que `ALLOWED_EMAIL` est
  déconnectée et redirigée vers « Accès refusé ».
- **RLS** activée sur toutes les tables : chaque ligne n'est visible que par son `user_id`.
- **Refresh token Google chiffré** (AES-256-GCM, clé `TOKEN_ENCRYPTION_KEY`) avant stockage.
- **Cron protégé** : `/api/cron/daily-brief` refuse toute requête sans
  `Authorization: Bearer <CRON_SECRET>` (comparaison à temps constant).
- Aucune clé dans le code : tout passe par les variables d'environnement.

## Pourquoi l'app Google reste en mode « Test »

`gmail.readonly` est un scope **restreint**. Pour publier une app qui l'utilise, Google exige une
vérification (et, pour les scopes restreints, un audit de sécurité payant). Pour un usage
personnel, le mode Test suffit : seuls les « utilisateurs de test » déclarés peuvent se
connecter, et l'écran « Google n'a pas validé cette application » s'affiche (on clique sur
Continuer).

**Contrepartie** : en mode Test, Google fait expirer le refresh token **au bout de 7 jours**.
Il faut donc cliquer sur **Reconnecter** (section « Statut des connexions ») environ une fois
par semaine. Le résumé du matin signale quand la connexion a expiré.

## Variables d'environnement

| Variable | Obligatoire | Rôle |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | oui | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | oui | Clé publishable (ou anon) Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | oui | Clé secrète Supabase, utilisée uniquement par le cron |
| `APP_URL` | oui | URL publique de l'app (`http://localhost:3000` en local) |
| `ALLOWED_EMAIL` | oui | Le seul email autorisé |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | oui | Client OAuth Google « Application Web » |
| `TOKEN_ENCRYPTION_KEY` | oui | 32 octets en base64 (`openssl rand -base64 32`) |
| `RESEND_API_KEY` | oui | Clé API Resend (envoi du résumé) |
| `RESEND_FROM` | non | Expéditeur, par défaut `Tableau de Vie <onboarding@resend.dev>` |
| `CRON_SECRET` | oui | Chaîne aléatoire (`openssl rand -hex 32`) |
| `TIMEZONE` | non | Défaut `Europe/Brussels` |
| `BRIEF_TIME` | non | Heure cible du résumé, défaut `08:30` (voir « Cron ») |
| `PRIORITY_SENDERS` | non | Emails ou domaines séparés par des virgules (`@vub.be,paul@x.com`) |
| `JOURNEE_DEBUT`, `JOURNEE_FIN` | non | Fenêtre de recherche du temps libre, défaut `09:00`–`22:00` |
| `ANTHROPIC_API_KEY` | non | Active Claude (payant, ≈ 1 €/mois pour cet usage) |
| `ANTHROPIC_MODEL` | non | Défaut `claude-sonnet-5-5` |

Le modèle est dans `.env.example`.

## Installation locale

Prérequis : Node.js 20+.

```bash
npm install
cp .env.example .env.local   # puis remplis les valeurs
npm run dev                  # http://localhost:3000
```

Pour que la connexion fonctionne en local, `http://localhost:3000/**` doit être dans les
Redirect URLs de Supabase et `http://localhost:3000/api/google/callback` dans les URI de
redirection du client Google.

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run typecheck` | Vérification des types TypeScript |
| `npm run lint` | ESLint |

## Configuration (une seule fois)

### 1. Supabase
1. Crée un projet (région Central EU).
2. **SQL Editor** → exécute `supabase/migrations/0001_init.sql`.
3. **Authentication → Sign In / Providers → Google** : active-le, colle le Client ID et le
   Client Secret Google. Note la *Callback URL* affichée.
4. **Authentication → URL Configuration** : Site URL = l'URL Vercel ; Redirect URLs =
   `https://<ton-app>.vercel.app/**` et `http://localhost:3000/**`.
5. **Project Settings → API Keys** : récupère la clé publishable et la clé secrète.

### 2. Google Cloud
1. Crée un projet, active **Google Calendar API** et **Gmail API**.
2. **Google Auth Platform** : cible *Externe*, état **En test**, ajoute ton email dans les
   utilisateurs de test, ajoute les scopes `calendar.readonly` et `gmail.readonly`.
3. **Clients → Créer un client → Application Web**, avec ces URI de redirection :
   - la Callback URL Supabase (`https://<ref>.supabase.co/auth/v1/callback`)
   - `https://<ton-app>.vercel.app/api/google/callback`
   - `http://localhost:3000/api/google/callback`

### 3. Resend
Crée un compte avec **le même email que `ALLOWED_EMAIL`** : sans domaine vérifié, Resend
n'envoie qu'à l'adresse du compte. Crée une clé API (*Sending access*).

### 4. Vercel
1. Importe le dépôt GitHub, déploie.
2. **Settings → Environment Variables** : ajoute les variables ci-dessus, puis **Redeploy**.
3. Ouvre l'app, connecte-toi, puis clique sur **Connecter** dans « Statut des connexions ».

## Cron et résumé matinal

`vercel.json` déclare deux crons quotidiens, à 05:00 et 06:00 UTC. Sur le plan gratuit
(Hobby), Vercel les déclenche à un moment quelconque **dans l'heure** indiquée.

La route n'envoie que si l'heure locale est entre `BRIEF_TIME − 1 h 30` et `BRIEF_TIME + 3 h`,
et une seule fois par jour. Avec `BRIEF_TIME=08:30` à Bruxelles :
- en hiver (UTC+1), le cron de 06:00 UTC envoie entre 07:00 et 08:00 ;
- en été (UTC+2), celui de 05:00 UTC envoie entre 07:00 et 08:00.

**Si tu changes `BRIEF_TIME`**, adapte aussi les deux horaires de `vercel.json`
(heure locale − 1 h 30, convertie en UTC pour l'hiver et pour l'été).

Le bouton **« Envoyer le résumé maintenant »** génère et envoie le résumé tout de suite, même
s'il est déjà parti ce jour-là. Chaque résumé est enregistré dans `resumes_quotidiens`.

## Fonctionnement sans IA

| Fonction | Sans clé Anthropic | Avec clé Anthropic |
|---|---|---|
| Tri des emails | Règles : dernier message de moi > 3 j → en attente ; expéditeur prioritaire → à répondre ; newsletter / notification (en-têtes Gmail) → informatif ; sinon → à répondre | Claude, sortie JSON structurée, résultat enregistré |
| Résumé d'un email | Début du message | Une ligne rédigée |
| Date dans un email | Non détectée | Détectée (active l'alerte « email sans agenda ») |
| Tâche en une ligne | Règles : demain, vendredi, lundi prochain, le 12, le 12 novembre, le 5/11, dans 3 jours, 14h, `#projet`, `!` | Langage libre |
| Résumé du matin | Modèle fixe | Rédigé par Claude à partir du modèle |

## Structure

```
app/
  page.tsx                      tableau de bord (6 sections)
  login/, acces-refuse/         connexion et refus d'accès
  auth/callback, auth/signout   Supabase Auth
  api/google/connect|callback   OAuth Google (lecture seule)
  api/cron/daily-brief          résumé matinal (Vercel Cron)
  actions/                      server actions (tâches, résumé)
components/sections/            agenda, emails, tâches, alertes, connexions
lib/
  google/                       OAuth, renouvellement du token, Calendar, Gmail
  agenda.ts, alertes.ts         conflits, créneaux libres, alertes croisées
  emails.ts, taches.ts          tri des emails, groupes de tâches
  parse-tache.ts                dates en langage naturel (sans IA)
  brief.ts, email-template.ts   résumé matinal et envoi Resend
  crypto.ts                     chiffrement du refresh token
supabase/migrations/            schéma SQL + RLS
vercel.json                     crons
```
