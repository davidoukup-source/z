# Tableau de Vie

Application web personnelle : agenda Google, emails Gmail classés par Claude, tâches et
alertes sur une seule page, plus un résumé envoyé par email chaque matin.

> README en construction : il sera complété à la fin de chaque phase
> (installation locale, configuration Google Cloud / Supabase, déploiement Vercel).

## État d'avancement

- [x] (a) Projet de base et connexion (Supabase Auth via Google, accès limité à un email)
- [x] (b) Google OAuth et agenda
- [x] (c) Emails et classification (Claude si clé API, sinon règles gratuites)
- [ ] (d) Tâches et alertes
- [ ] (e) Cron et résumé par email

## Démarrage local (rapide)

```bash
npm install
cp .env.example .env.local   # puis remplis les valeurs
npm run dev                  # http://localhost:3000
```

La migration SQL est dans `supabase/migrations/0001_init.sql`.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run typecheck` | Vérification des types TypeScript |
| `npm run lint` | ESLint |
