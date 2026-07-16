-- DÆMON Production HQ — Step 2: profilo utente per l'auth via magic link.
-- Esegui questo script in Supabase Dashboard → SQL Editor (progetto clsyjggifbfwnrdbzprk) → Run.
-- Le tabelle di dominio (drops, articoli, fornitori, ecc.) arrivano nello Step 3.

create extension if not exists pgcrypto;

-- Funzione condivisa: aggiorna updated_at ad ogni update. Riusata da tutte le
-- tabelle con updated_at che arriveranno nello Step 3.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  ruolo text check (ruolo in ('design', 'logistica', 'fornitori')),
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
