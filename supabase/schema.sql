-- Carte Claire : schéma de la base (à coller dans Supabase > SQL Editor, une seule fois).
--
-- Deux tables, pour que la carte publique ne puisse jamais laisser fuir les coûts :
--   espaces : toutes les données du restaurateur (recettes, ingrédients, prix d'achat, marges).
--             Lisible et modifiable uniquement par son propriétaire.
--   cartes  : la carte vue par le client (plats, prix de vente, allergènes). Lisible par tous,
--             modifiable uniquement par son propriétaire. Identifiée par un code court (slug)
--             qui sert d'adresse au QR code et ne change jamais.

create table if not exists public.espaces (
  owner uuid primary key references auth.users (id) on delete cascade,
  donnees jsonb not null,
  maj timestamptz not null default now()
);

create table if not exists public.cartes (
  slug text primary key check (slug ~ '^[a-z0-9-]{3,60}$'),
  owner uuid not null unique references auth.users (id) on delete cascade,
  carte jsonb not null,
  maj timestamptz not null default now()
);

alter table public.espaces enable row level security;
alter table public.cartes enable row level security;

drop policy if exists "espace : lecture par le propriétaire" on public.espaces;
drop policy if exists "espace : création par le propriétaire" on public.espaces;
drop policy if exists "espace : modification par le propriétaire" on public.espaces;
create policy "espace : lecture par le propriétaire" on public.espaces
  for select to authenticated using (owner = auth.uid());
create policy "espace : création par le propriétaire" on public.espaces
  for insert to authenticated with check (owner = auth.uid());
create policy "espace : modification par le propriétaire" on public.espaces
  for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists "carte : lecture publique" on public.cartes;
drop policy if exists "carte : création par le propriétaire" on public.cartes;
drop policy if exists "carte : modification par le propriétaire" on public.cartes;
create policy "carte : lecture publique" on public.cartes
  for select to anon, authenticated using (true);
create policy "carte : création par le propriétaire" on public.cartes
  for insert to authenticated with check (owner = auth.uid());
create policy "carte : modification par le propriétaire" on public.cartes
  for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

grant select on public.cartes to anon;
grant select, insert, update on public.cartes to authenticated;
grant select, insert, update on public.espaces to authenticated;
