-- Fase 2 dei limiti delle foto (21/11):
-- 1) foto dei totem nello Storage (non più base64 in tabella): il telefono le tiene in memoria e non le
--    riscarica a ogni apertura della pagina del gruppo. Le foto vecchie in base64 restano valide.
-- 2) bucket "moodboard": file nuovi solo JPEG e al massimo 70 KB (il sito li comprime sotto 50 KB)
-- 3) reti di sicurezza sul caricamento (non limiti visibili: quelli veri sono 2 foto in bacheca e
--    1 al giorno nelle Novità): 40 file a persona, 60 all'organizzatore (totem), 850 MB in tutto.

-- ---------------------------------------------------------------------
-- 1) Totem: immagine = percorso nello Storage "<gruppo>/<membro organizzatore>/<uuid>.jpg"
--    oppure (solo foto vecchie) data URL base64.
-- ---------------------------------------------------------------------
alter table public.quiz_totems drop constraint quiz_totems_immagine_check;
alter table public.quiz_totems add constraint quiz_totems_immagine_check check (
  immagine is null
  or (immagine like 'data:image/jpeg;base64,%' and octet_length(immagine) <= 200000)
  or immagine ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'
);

-- Il percorso deve essere nella cartella dell'organizzatore di quel gruppo e il file deve esistere.
-- Il resto è come in 20261122100000_limiti_foto (base64 nuovi sotto 50 KB, foto rimasta uguale sempre valida).
create or replace function private.totem_foto_leggera()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.immagine is null then
    return new;
  end if;
  if exists (select 1 from public.quiz_totems t
             where t.group_id = new.group_id and t.profilo = new.profilo and t.immagine = new.immagine) then
    return new; -- foto già salvata: resta com'era
  end if;
  if new.immagine like 'data:%' then
    if octet_length(new.immagine) <= 68300 then
      return new;
    end if;
    raise exception 'La foto del totem è troppo pesante (massimo 50 KB)';
  end if;
  if not exists (
    select 1
    from public.groups g
    join public.group_members gm on gm.group_id = g.id and gm.user_id = g.organizer_id
    join storage.objects o on o.bucket_id = 'moodboard' and o.name = new.immagine
    where g.id = new.group_id
      and new.immagine like g.id::text || '/' || gm.id::text || '/%'
  ) then
    raise exception 'Foto del totem non valida';
  end if;
  return new;
end;
$$;
revoke execute on function private.totem_foto_leggera() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2) Bucket: solo JPEG, massimo 70 KB per file (vale per i file nuovi; quelli già caricati restano)
-- ---------------------------------------------------------------------
update storage.buckets
set file_size_limit = 71680, allowed_mime_types = array['image/jpeg']
where id = 'moodboard';

-- ---------------------------------------------------------------------
-- 3) Tetti di sicurezza sul caricamento.
--    security definer: le regole dello Storage girano coi permessi di chi carica, che non vede
--    i file degli altri gruppi (servono per lo spazio totale).
-- ---------------------------------------------------------------------
create function private.puo_caricare_foto(p_member uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select
    (select count(*)
     from storage.objects o
     where o.bucket_id = 'moodboard'
       and o.name like private.group_of_member(p_member)::text || '/' || p_member::text || '/%')
      < case when exists (select 1 from public.group_members gm join public.groups g on g.id = gm.group_id
                          where gm.id = p_member and gm.user_id = g.organizer_id)
             then 60 else 40 end
    and (select coalesce(sum((o.metadata->>'size')::bigint), 0)
         from storage.objects o where o.bucket_id = 'moodboard') < 850 * 1024 * 1024;
$$;
revoke execute on function private.puo_caricare_foto(uuid) from public, anon;
grant execute on function private.puo_caricare_foto(uuid) to authenticated;

-- stessa regola di prima (cartella "<gruppo>/<me>/", gruppo giusto) + i tetti
drop policy "ognuno carica nella propria cartella" on storage.objects;
create policy "ognuno carica nella propria cartella" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'moodboard'
    and (storage.foldername(name))[2]::uuid in (select private.my_member_ids())
    and private.group_of_member((storage.foldername(name))[2]::uuid)
        = (storage.foldername(name))[1]::uuid
    and private.puo_caricare_foto((storage.foldername(name))[2]::uuid)
  );
