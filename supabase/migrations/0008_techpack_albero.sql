-- DÆMON Production HQ — Tech pack: cartelle con struttura ad albero.
-- Esegui in Supabase Dashboard → SQL Editor, dopo 0001-0007 → Run.
-- Idempotente e transazionale.
--
-- La cartella di un tech pack accetta ora l'upload di una cartella intera
-- (o di uno .zip estratto lato client): i file finiscono su Storage sotto
-- techpacks/{id}/{percorso relativo}, struttura preservata. Serve:
--   1. una colonna `percorso` (directory relativa, '' = radice) per l'albero;
--   2. il tipo 'file' per i formati non anteprimabili (ai/psd/svg/…);
--   3. bucket a 50MB con formati estesi — ammessi però SOLO sotto techpacks/,
--      regola applicata server-side dalla policy di insert (per estensione).

begin;

-- 1. Directory relativa del file dentro la cartella del tech pack.
alter table public.techpack_files
  add column if not exists percorso text not null default '';

-- 2. Nuovo tipo 'file' (bozzetti .ai, sorgenti .psd, vettoriali .svg, ecc.).
alter table public.techpack_files drop constraint if exists techpack_files_tipo_check;
alter table public.techpack_files add constraint techpack_files_tipo_check
  check (tipo in ('img', 'pdf', 'link', 'file'));

-- 3. Bucket: limite 50MB; il filtro MIME a livello bucket viene tolto
--    (varrebbe per tutti i path) e sostituito dalla policy qui sotto,
--    che ragiona per estensione ed è più severa fuori da techpacks/.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = null
where id = 'media';

drop policy if exists "media_bucket_authenticated_insert" on storage.objects;
create policy "media_bucket_authenticated_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'media' and (
      -- formati base, ovunque nel bucket
      lower(storage.extension(name)) = any (array['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp3', 'mp4', 'mov', 'pdf'])
      -- formati estesi, solo dentro le cartelle tech pack
      or (
        name like 'techpacks/%'
        and lower(storage.extension(name)) = any (array['svg', 'ai', 'psd', 'eps', 'tif', 'tiff', 'txt', 'csv', 'xlsx', 'docx'])
      )
    )
  );

commit;
