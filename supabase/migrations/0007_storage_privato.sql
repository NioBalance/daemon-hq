-- DÆMON Production HQ — Audit A1: bucket "media" privato.
-- Esegui in Supabase Dashboard → SQL Editor, dopo 0001-0006 → Run.
-- Idempotente e transazionale.
--
-- Prima il bucket era pubblico in lettura: chiunque ottenesse un URL (inoltro,
-- log, screenshot) accedeva per sempre a foto e PDF dei tech pack senza login.
-- Ora la lettura richiede autenticazione e l'app usa SIGNED URL con scadenza
-- 1h generate on-demand (lib/useSignedUrl). Le vecchie URL pubbliche già in
-- circolazione smettono di funzionare all'istante.

begin;

update storage.buckets set public = false where id = 'media';

-- Lettura: da pubblica a soli autenticati (le signed URL firmate dal client
-- autenticato funzionano per chiunque le possieda, ma SCADONO).
drop policy if exists "media_bucket_public_read" on storage.objects;
drop policy if exists "media_bucket_authenticated_read" on storage.objects;
create policy "media_bucket_authenticated_read"
  on storage.objects for select to authenticated
  using (bucket_id = 'media');

-- Scrittura: invariata (già riservata agli autenticati dalla 0002).

commit;
