-- Apply ONLY to simantri-pm (fdprawhpeoefpcnlbiya). No competition-project changes.
begin;
alter table public.harvest_listings add column if not exists moderation_note text;

create or replace function private.guard_pm_harvest() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  admin boolean := private.is_admin();
  path text;
begin
  if tg_op = 'DELETE' then
    if actor is not null and (old.seller_id <> actor or old.status not in ('draft','hidden','sold')) then
      raise exception 'Only the owner can delete inactive listings' using errcode='42501';
    end if;
    return old;
  end if;
  if tg_op = 'INSERT' then
    if actor is not null and (new.seller_id <> actor or new.status not in ('draft','pending') or new.moderation_note is not null) then
      raise exception 'Create only your own draft or submission' using errcode='42501';
    end if;
  elsif actor is not null then
    if new.id <> old.id or new.seller_id <> old.seller_id or new.created_at <> old.created_at then
      raise exception 'Listing identity is immutable' using errcode='42501';
    end if;
    if old.seller_id = actor and new.status in ('draft','pending','sold') then
      if not ((old.status = 'draft' and new.status in ('draft','pending'))
        or (old.status = 'pending' and new.status = 'draft')
        or (old.status = 'published' and new.status in ('draft','pending','sold'))
        or (old.status in ('hidden','sold') and new.status in ('draft','pending'))) then
        raise exception 'Invalid owner transition' using errcode='42501';
      end if;
      if new.moderation_note is distinct from old.moderation_note and not (new.status = 'pending' and new.moderation_note is null) then
        raise exception 'Only Admin writes moderation notes' using errcode='42501';
      end if;
      if new.status = 'sold' and (to_jsonb(new) - array['status','updated_at']) is distinct from (to_jsonb(old) - array['status','updated_at']) then
        raise exception 'Marking sold cannot change listing content' using errcode='42501';
      end if;
    elsif admin and ((old.status = 'pending' and new.status = 'published') or (old.status in ('pending','published') and new.status = 'hidden')) then
      if (to_jsonb(new) - array['status','moderation_note','updated_at']) is distinct from (to_jsonb(old) - array['status','moderation_note','updated_at']) then
        raise exception 'Moderation cannot change seller content' using errcode='42501';
      end if;
    else
      raise exception 'Publication requires Admin moderation' using errcode='42501';
    end if;
  end if;
  if length(btrim(new.location)) not between 3 and 300
    or length(new.description) > 3000 or length(coalesce(new.variety,'')) > 100
    or new.quantity_kg > 1000000000 or new.price_per_kg > 1000000000
    or new.contact !~ '^628[0-9]{7,11}$'
    or cardinality(new.image_paths) > 3 then
    raise exception 'Invalid listing data';
  end if;
  if new.status in ('pending','published') and cardinality(new.image_paths) = 0 then
    raise exception 'A real harvest photo is required';
  end if;
  if new.status = 'hidden' and length(btrim(coalesce(new.moderation_note,''))) not between 5 and 500 then
    raise exception 'A moderation reason is required';
  end if;
  foreach path in array new.image_paths loop
    if path !~ ('^' || new.seller_id::text || '/' || new.id::text || '/[a-f0-9-]{36}\.(jpg|png|webp)$')
      or not exists (select 1 from storage.objects o where o.bucket_id='pm-harvest' and o.name=path) then
      raise exception 'Photo must belong to this listing and exist in PM storage';
    end if;
  end loop;
  return new;
end; $$;
revoke all on function private.guard_pm_harvest() from public,anon,authenticated;
drop trigger if exists guard_pm_harvest on public.harvest_listings;
create trigger guard_pm_harvest before insert or update or delete on public.harvest_listings
for each row execute function private.guard_pm_harvest();
grant update(moderation_note) on public.harvest_listings to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('pm-harvest','pm-harvest',false,3145728,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists pm_harvest_photo_read on storage.objects;
create policy pm_harvest_photo_read on storage.objects for select to authenticated using (
  bucket_id='pm-harvest' and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or (select private.is_admin())
    or exists(select 1 from public.harvest_listings h where h.status='published' and name=any(h.image_paths))
  )
);
drop policy if exists pm_harvest_photo_insert on storage.objects;
create policy pm_harvest_photo_insert on storage.objects for insert to authenticated with check (
  bucket_id='pm-harvest' and (storage.foldername(name))[1]=(select auth.uid())::text
  and name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|png|webp)$'
  and exists(select 1 from public.harvest_listings h where h.id::text=(storage.foldername(name))[2]
    and h.seller_id=(select auth.uid()) and h.status='draft' and cardinality(h.image_paths)<3)
);
drop policy if exists pm_harvest_photo_delete on storage.objects;
create policy pm_harvest_photo_delete on storage.objects for delete to authenticated using (
  bucket_id='pm-harvest' and (storage.foldername(name))[1]=(select auth.uid())::text
  and not exists(select 1 from public.harvest_listings h where name=any(h.image_paths))
);
create index if not exists harvest_published_date_idx on public.harvest_listings(status,created_at desc);
comment on table public.harvest_listings is 'PM harvest marketplace: owner drafts, private photos, Admin moderation, and direct contact; no payment processing.';
notify pgrst,'reload schema';
commit;
