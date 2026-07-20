-- DÆMON Production HQ — HQ Map: collegamenti articolo↔techpack↔campione.
-- Esegui in Supabase Dashboard → SQL Editor, dopo 0001-0016 → Run.
-- Idempotente e transazionale.
--
-- La mappa operativa disegna la catena Drop → Articoli → Tech Pack → Campioni
-- leggendo relazioni REALI. Oggi mancano due link, che aggiungo come FK
-- opzionali (nullable): finché non li colleghi dai form, i nodi restano «da
-- collegare» — la mappa non inventa nulla.
--   techpacks.articolo_id → quale articolo specifica il tech pack
--   samples.techpack_id   → quale tech pack realizza il campione
-- on delete set null: cancellare un articolo/tech pack non cancella l'altro,
-- scollega soltanto. RLS invariata (le colonne sono coperte dalle policy).

begin;

alter table public.techpacks
  add column if not exists articolo_id uuid references public.articoli(id) on delete set null;
create index if not exists techpacks_articolo_id_idx on public.techpacks(articolo_id);

alter table public.samples
  add column if not exists techpack_id uuid references public.techpacks(id) on delete set null;
create index if not exists samples_techpack_id_idx on public.samples(techpack_id);

commit;
