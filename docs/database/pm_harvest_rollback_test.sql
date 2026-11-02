-- PM-only, disposable authorization fixtures. RLS remains enabled throughout.
-- A single anonymous block uses local role changes; no unprotected tables are created.
begin;
create function pg_temp.pm_denied(statement text) returns boolean language plpgsql as $f$
begin
  execute statement;
  return false;
exception when insufficient_privilege or check_violation or raise_exception then return true;
end; $f$;
do $test$
declare
  owner_id uuid := gen_random_uuid();
  other_id uuid := gen_random_uuid();
  listing_id uuid := gen_random_uuid();
  admin_id uuid;
  photo text;
  n integer;
  checks integer := 0;
begin
  select id into admin_id from public.profiles where role='admin' limit 1;
  if admin_id is null then raise exception 'Existing PM Admin required'; end if;
  insert into auth.users(id,raw_user_meta_data) values
    (owner_id,'{"full_name":"PM rollback owner"}'::jsonb),
    (other_id,'{"full_name":"PM rollback other"}'::jsonb);
  photo := owner_id::text||'/'||listing_id::text||'/'||gen_random_uuid()::text||'.jpg';
  perform set_config('request.jwt.claims',json_build_object('sub',owner_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  insert into public.harvest_listings(id,seller_id,title,location,quantity_kg,price_per_kg,contact)
    values(listing_id,owner_id,'[ROLLBACK TEST] Harvest','Nganjuk uji',10,10000,'6280000000000');
  checks := checks+1;
  if not pg_temp.pm_denied(format('update public.harvest_listings set status=''published'' where id=%L',listing_id)) then raise exception 'Owner self-publication was allowed'; end if;
  checks := checks+1;
  if not pg_temp.pm_denied(format('update public.harvest_listings set status=''pending'' where id=%L',listing_id)) then raise exception 'Photo-less submission was allowed'; end if;
  checks := checks+1;
  if not pg_temp.pm_denied(format('update public.harvest_listings set moderation_note=''Approved'' where id=%L',listing_id)) then raise exception 'Owner forged moderation'; end if;
  checks := checks+1;
  if not pg_temp.pm_denied(format('update public.harvest_listings set seller_id=%L where id=%L',other_id,listing_id)) then raise exception 'Seller replacement was allowed'; end if;
  checks := checks+1;
  insert into storage.objects(bucket_id,name) values('pm-harvest',photo);
  update public.harvest_listings set image_paths=array[photo] where id=listing_id;
  update public.harvest_listings set status='pending' where id=listing_id;
  checks := checks+1;
  execute 'reset role';
  perform set_config('request.jwt.claims',json_build_object('sub',other_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  select count(*) into n from public.harvest_listings where id=listing_id;
  if n<>0 then raise exception 'Other user read pending listing';end if;
  checks := checks+1;
  select count(*) into n from storage.objects where bucket_id='pm-harvest' and name=photo;
  if n<>0 then raise exception 'Other user read private photo';end if;
  checks := checks+1;
  update public.harvest_listings set title='Unexpected edit' where id=listing_id;
  get diagnostics n = row_count;
  if n<>0 then raise exception 'Other user changed pending listing';end if;
  checks := checks+1;
  if not pg_temp.pm_denied(format('insert into storage.objects(bucket_id,name) values(''pm-harvest'',%L)',replace(photo,'.jpg','a.jpg'))) then raise exception 'Other user uploaded to owner folder';end if;
  checks := checks+1;
  execute 'reset role';
  perform set_config('request.jwt.claims',json_build_object('sub',admin_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  if not pg_temp.pm_denied(format('update public.harvest_listings set title=''Unexpected Admin edit'' where id=%L',listing_id)) then raise exception 'Admin rewrote owner content';end if;
  checks := checks+1;
  update public.harvest_listings set status='published' where id=listing_id;
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Admin could not publish pending listing';end if;
  checks := checks+1;
  execute 'reset role';
  perform set_config('request.jwt.claims',json_build_object('sub',other_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  select count(*) into n from public.harvest_listings where id=listing_id;
  if n<>1 then raise exception 'Published listing not visible';end if;
  checks := checks+1;
  select count(*) into n from storage.objects where bucket_id='pm-harvest' and name=photo;
  if n<>1 then raise exception 'Published photo not visible';end if;
  checks := checks+1;
  execute 'reset role';
  perform set_config('request.jwt.claims',json_build_object('sub',owner_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  if not pg_temp.pm_denied(format('update public.harvest_listings set price_per_kg=20000 where id=%L',listing_id)) then raise exception 'Published content changed without renewed review';end if;
  checks := checks+1;
  update public.harvest_listings set status='sold' where id=listing_id;
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Owner could not mark stock sold';end if;
  checks := checks+1;
  execute 'reset role';
  perform set_config('request.jwt.claims',json_build_object('sub',other_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  select count(*) into n from public.harvest_listings where id=listing_id;
  if n<>0 then raise exception 'Sold stock still visible to other user';end if;
  checks := checks+1;
  execute 'reset role';
  if checks<>17 then raise exception 'Incomplete checks: %',checks;end if;
  raise notice 'All % Harvest Listing RLS checks passed. Fixtures will be rolled back.',checks;
end;
$test$;
rollback;
select '17 authorization checks completed; fixtures rolled back' as result;
