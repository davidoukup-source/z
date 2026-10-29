-- Tableau de Vie : schéma initial.
-- Chaque table a la RLS activée : une ligne n'est visible que par son user_id.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tâches
-- ---------------------------------------------------------------------------
create table public.taches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  titre text not null check (char_length(titre) between 1 and 500),
  description text,
  date_limite timestamptz,
  priorite text not null default 'moyenne' check (priorite in ('haute', 'moyenne', 'basse')),
  statut text not null default 'en_attente' check (statut in ('en_attente', 'en_cours', 'terminee')),
  projet text,
  created_at timestamptz not null default now()
);
create index taches_user_date_idx on public.taches (user_id, date_limite);

-- ---------------------------------------------------------------------------
-- Classification des emails (évite de reclasser un fil déjà traité)
-- ---------------------------------------------------------------------------
create table public.classifications_email (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  gmail_thread_id text not null,
  categorie text not null check (categorie in ('repondre_aujourdhui', 'en_attente_de_reponse', 'informatif')),
  resume_une_ligne text,
  date_limite_detectee timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, gmail_thread_id)
);

-- ---------------------------------------------------------------------------
-- Résumés quotidiens (un par jour)
-- ---------------------------------------------------------------------------
create table public.resumes_quotidiens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  contenu_markdown text not null,
  envoye boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- ---------------------------------------------------------------------------
-- Intégrations (refresh token chiffré en AES-256-GCM côté serveur)
-- ---------------------------------------------------------------------------
create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fournisseur text not null,
  refresh_token_chiffre text not null,
  derniere_synchronisation timestamptz,
  unique (user_id, fournisseur)
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['taches', 'classifications_email', 'resumes_quotidiens', 'integrations']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "proprietaire_select" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "proprietaire_insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "proprietaire_update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "proprietaire_delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end
$$;
