-- Integration test only: all fixtures AND deletions are rolled back.
begin;
select set_config('pm_retention.admin',(select id::text from public.profiles where role='admin' limit 1),true);
select set_config('pm_retention.petani',gen_random_uuid()::text,true);
insert into auth.users(id,aud,role,email,raw_user_meta_data,raw_app_meta_data,created_at,updated_at)
values(current_setting('pm_retention.petani')::uuid,'authenticated','authenticated',
  'pm-retention-'||current_setting('pm_retention.petani')||'@example.invalid',
  '{"full_name":"Retention rollback fixture"}'::jsonb,'{"provider":"email","providers":["email"]}'::jsonb,now(),now());
insert into public.market_regional_price(tanggal,prov_id,provinsi,komoditas,price_type,harga)
select (timezone('Asia/Jakarta',now()))::date - age,999999,'Retention rollback fixture',
  'Bawang Merah Ukuran Sedang',kind,1
from unnest(array[59,60]) age cross join unnest(array[1,2,3,4]) kind;
insert into public.market_price(tanggal,harga,source,input_by)
select (timezone('Asia/Jakarta',now()))::date - age,1,'manual',current_setting('pm_retention.admin')::uuid
from unnest(array[59,60]) age on conflict(tanggal) do nothing;

select set_config('request.jwt.claim.sub',current_setting('pm_retention.petani'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('pm_retention.petani'),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare affected integer; begin
  begin
    perform public.prune_expired_market_prices();
    raise exception 'Petani could invoke retention';
  exception when insufficient_privilege then null; end;
  delete from public.market_regional_price where prov_id=999999;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Petani could delete prices'; end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub',current_setting('pm_retention.admin'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('pm_retention.admin'),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare result jsonb; affected integer; cutoff date := (timezone('Asia/Jakarta',now()))::date-59; begin
  delete from public.market_regional_price where prov_id=999999 and tanggal=cutoff;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Admin could delete a retained date'; end if;
  result:=public.prune_expired_market_prices();
  if result->>'cutoff_date'<>cutoff::text or (result->>'retention_days')::integer<>60 then
    raise exception 'Wrong retention boundary';
  end if;
  if (result->>'deleted_regional')::integer<4 then raise exception 'Expired regional rows not deleted'; end if;
  if exists(select 1 from public.market_regional_price where prov_id=999999 and tanggal<cutoff) then raise exception 'Expired fixture survived'; end if;
  if (select count(*) from public.market_regional_price where prov_id=999999 and tanggal=cutoff)<>4 then raise exception '60th inclusive day was deleted'; end if;
  if exists(select 1 from public.market_price where tanggal<cutoff) then raise exception 'Expired legacy prices survived'; end if;
  if not exists(select 1 from public.market_price where tanggal=cutoff) then raise exception 'Legacy boundary day was deleted'; end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
set local role anon;
do $$ begin
  begin
    perform public.prune_expired_market_prices();
    raise exception 'Anon could invoke retention';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  if (select prosecdef from pg_proc where oid='public.prune_expired_market_prices()'::regprocedure) then raise exception 'Retention bypasses RLS'; end if;
end $$;
rollback;
