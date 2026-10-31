-- Isolated integration probe: ALL fixtures are rolled back, no emails sent.
begin;
select set_config('pm_test.a',gen_random_uuid()::text,true);
select set_config('pm_test.b',gen_random_uuid()::text,true);
select set_config('pm_test.admin',gen_random_uuid()::text,true);
insert into auth.users(id,aud,role,email,raw_user_meta_data,raw_app_meta_data,created_at,updated_at)
select value::uuid,'authenticated','authenticated',
 'pm-rls-'||value||'@example.invalid',
 '{"full_name":"PM rollback fixture","role":"admin"}'::jsonb,
 '{"provider":"email","providers":["email"]}'::jsonb,now(),now()
from (values(current_setting('pm_test.a')),(current_setting('pm_test.b')),(current_setting('pm_test.admin'))) as fixture(value);
do $$
begin
  if exists(select 1 from public.profiles
    where id in(current_setting('pm_test.a')::uuid,current_setting('pm_test.b')::uuid,current_setting('pm_test.admin')::uuid)
    and role<>'petani') then raise exception 'Unsafe signup role elevation'; end if;
end $$;
update public.profiles set role='admin' where id=current_setting('pm_test.admin')::uuid;
insert into public.chat_logs(user_id,message,response)
values(current_setting('pm_test.a')::uuid,'fixture A','fixture A'),(current_setting('pm_test.b')::uuid,'fixture B','fixture B');
insert into public.knowledge_entries(doc_id,title,category,content,status)
values('__PM_ROLLBACK_DRAFT__','Rollback fixture','test','Not for publication','draft');

select set_config('request.jwt.claim.sub',current_setting('pm_test.a'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('pm_test.a'),'role','authenticated')::text,true);
set local role authenticated;
do $$
declare affected integer; price_kind integer;
begin
  if (select count(*) from public.profiles)<>1 then raise exception 'Profiles leaked across users'; end if;
  if (select count(*) from public.chat_logs)<>1 then raise exception 'Chat logs leaked across users'; end if;
  if exists(select 1 from public.knowledge_entries where doc_id='__PM_ROLLBACK_DRAFT__') then raise exception 'Draft knowledge leaked'; end if;
  begin
    update public.profiles set role='admin' where id=(select auth.uid());
    raise exception 'Role column is user-editable';
  exception when insufficient_privilege then null; end;
  foreach price_kind in array array[1,2,3,4] loop
    begin
      perform public.upsert_scraped_regional_price(jsonb_build_array(jsonb_build_object(
        'tanggal','1900-01-01','prov_id',16,'provinsi','Rollback fixture only',
        'komoditas','__PM_ROLLBACK_PRICE__','price_type',price_kind,'harga',1
      )));
      raise exception 'Petani could write regional price type %',price_kind;
    exception when insufficient_privilege then null; end;
  end loop;
  update public.profiles set full_name='Updated fixture' where id=(select auth.uid());
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'Own-profile update failed'; end if;
  update public.profiles set full_name='Forbidden update' where id=current_setting('pm_test.b')::uuid;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Other profile was editable'; end if;
  update public.chat_logs set feedback='helpful' where user_id=(select auth.uid());
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'Own feedback failed'; end if;
  update public.chat_logs set feedback='helpful' where user_id=current_setting('pm_test.b')::uuid;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Other feedback was editable'; end if;
  begin
    perform public.upsert_scraped_market_price(current_date,1,'scraping',(select auth.uid()));
    raise exception 'Petani could write market data';
  exception when insufficient_privilege then null; end;
  insert into public.harvest_listings(seller_id,title,location,quantity_kg,price_per_kg,contact,status)
  values((select auth.uid()),'Rollback listing','Test only',1,1,'Not a real contact','draft');
  begin
    update public.harvest_listings set status='published' where seller_id=(select auth.uid());
    raise exception 'Petani could bypass listing moderation';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.harvest_listings(seller_id,title,location,quantity_kg,price_per_kg,contact)
    values(current_setting('pm_test.b')::uuid,'Wrong owner','Test only',1,1,'Not real');
    raise exception 'Could create listing for someone else';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('pm_test.b'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('pm_test.b'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.harvest_listings)<>0 then raise exception 'Private listing leaked'; end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub',current_setting('pm_test.admin'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('pm_test.admin'),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare price_kind integer; begin
  if not (select private.is_admin()) then raise exception 'Admin not recognized'; end if;
  if not exists(select 1 from public.knowledge_entries where doc_id='__PM_ROLLBACK_DRAFT__') then raise exception 'Admin cannot read drafts'; end if;
  perform public.upsert_scraped_market_price(current_date,1,'scraping',(select auth.uid()));
  foreach price_kind in array array[1,2,3,4] loop
    perform public.upsert_scraped_regional_price(jsonb_build_array(jsonb_build_object(
      'tanggal','1900-01-01','prov_id',16,'provinsi','Rollback fixture only',
      'komoditas','__PM_ROLLBACK_PRICE__','price_type',price_kind,'harga',1
    )));
  end loop;
  if (select count(*) from public.market_regional_price where komoditas='__PM_ROLLBACK_PRICE__')<>4 then raise exception 'Admin four-type regional upsert failed'; end if;
  begin
    perform public.upsert_scraped_regional_price(jsonb_build_array(jsonb_build_object(
      'tanggal','1900-01-01','prov_id',16,'provinsi','Rollback fixture only',
      'komoditas','__PM_ROLLBACK_PRICE__','price_type',5,'harga',1
    )));
    raise exception 'Invalid fifth price type accepted';
  exception when check_violation then null; end;
  update public.harvest_listings set status='published' where seller_id=current_setting('pm_test.a')::uuid;
  if not exists(select 1 from public.harvest_listings where status='published') then raise exception 'Admin moderation failed'; end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
set local role anon;
do $$ begin
  if exists(select 1 from public.knowledge_entries where status='draft') then raise exception 'Anonymous user read a draft'; end if;
  begin
    perform count(*) from public.profiles;
    raise exception 'Anonymous user read profiles';
  exception when insufficient_privilege then null; end;
  begin
    perform public.upsert_scraped_regional_price('[]'::jsonb);
    raise exception 'Anonymous user could call write RPC';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
