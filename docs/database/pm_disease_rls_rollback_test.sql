-- PM ONLY fdprawhpeoefpcnlbiya. All fixtures and changes are rolled back.
begin;
select set_config('pm_test.petani',gen_random_uuid()::text,true);
insert into auth.users(id,aud,role,email,raw_user_meta_data,raw_app_meta_data,created_at,updated_at)
values(current_setting('pm_test.petani')::uuid,'authenticated','authenticated','pm-disease-'||current_setting('pm_test.petani')||'@example.invalid','{"full_name":"Disease rollback fixture"}','{"provider":"email","providers":["email"]}',now(),now());
insert into public.knowledge_entries(doc_id,title,category,content,metadata,status)
values('__PM_DISEASE_ROLLBACK__','Disease fixture','Penyakit Tanaman','Temporary fixture','{"catalogue":"pm-disease-v1"}','draft');
select set_config('request.jwt.claim.sub',current_setting('pm_test.petani'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('pm_test.petani'),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare n integer; begin
  if exists(select 1 from public.knowledge_entries where doc_id='__PM_DISEASE_ROLLBACK__') then raise exception 'Draft leaked to Petani'; end if;
  update public.knowledge_entries set title='Forbidden' where doc_id='PM-DISEASE-MOLER-001';
  get diagnostics n=row_count;
  if n<>0 then raise exception 'Petani can edit catalogue'; end if;
  begin
    insert into public.knowledge_entries(doc_id,title,category,content,status) values('__FORBIDDEN_DISEASE__','Forbidden','Penyakit Tanaman','Forbidden','published');
    raise exception 'Petani can insert catalogue';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','fd24b439-362b-45c5-9c8a-f4189af332eb',true);
select set_config('request.jwt.claims','{"sub":"fd24b439-362b-45c5-9c8a-f4189af332eb","role":"authenticated"}',true);
set local role authenticated;
do $$ declare n integer; begin
  if not exists(select 1 from public.knowledge_entries where doc_id='__PM_DISEASE_ROLLBACK__') then raise exception 'Admin cannot read draft'; end if;
  update public.knowledge_entries set status='published',summary='Updated fixture' where doc_id='__PM_DISEASE_ROLLBACK__';
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Admin cannot publish'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ begin
  if not exists(select 1 from public.knowledge_entries where doc_id='__PM_DISEASE_ROLLBACK__' and summary='Updated fixture') then raise exception 'Published material unavailable'; end if;
end $$;
reset role;
update public.knowledge_entries set status='draft' where doc_id='__PM_DISEASE_ROLLBACK__';
set local role anon;
do $$ begin
  if exists(select 1 from public.knowledge_entries where doc_id='__PM_DISEASE_ROLLBACK__') then raise exception 'Unpublished material still visible'; end if;
end $$;
reset role;
rollback;
select 'PASS: Admin edit/publish, Petani write denied, draft hidden; fixtures rolled back' as result;
