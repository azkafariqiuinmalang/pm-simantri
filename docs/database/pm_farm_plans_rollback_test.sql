-- Run on PM only. Every test row and mutation is rolled back.
begin;
insert into public.farm_plans(id,owner_id,name,mode,area_m2,actual_yield_kg)
values('36c366fd-2735-4525-b398-214ff6176e37','51efe1ce-e22a-44e2-85e6-4e7b621b824c','QA rollback private finance','selling',2000,1000);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"51efe1ce-e22a-44e2-85e6-4e7b621b824c","role":"authenticated"}',true);
do $$
declare n integer; v integer;
begin
  select count(*) into n from public.farm_plans where id='36c366fd-2735-4525-b398-214ff6176e37';
  if n <> 1 then raise exception 'Owner cannot read own plan'; end if;
  update public.farm_plans set name='QA rollback owner update' where id='36c366fd-2735-4525-b398-214ff6176e37' returning version into v;
  if v <> 2 then raise exception 'Version trigger failed'; end if;
  begin
    update public.farm_plans set owner_id='7c09ea6e-5d29-461b-b5e9-130c2c68c3b9' where id='36c366fd-2735-4525-b398-214ff6176e37';
    raise exception 'Owner reassignment allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.farm_plans set version=99 where id='36c366fd-2735-4525-b398-214ff6176e37';
    raise exception 'Client could modify version';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claims','{"sub":"7c09ea6e-5d29-461b-b5e9-130c2c68c3b9","role":"authenticated"}',true);
do $$
declare n integer;
begin
  select count(*) into n from public.farm_plans where id='36c366fd-2735-4525-b398-214ff6176e37';
  if n <> 0 then raise exception 'Cross-account read leaked finance data'; end if;
  update public.farm_plans set name='QA unauthorized' where id='36c366fd-2735-4525-b398-214ff6176e37';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Cross-account write succeeded'; end if;
  delete from public.farm_plans where id='36c366fd-2735-4525-b398-214ff6176e37';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Cross-account delete succeeded'; end if;
  begin
    insert into public.farm_plans(owner_id,name,mode,area_m2) values('51efe1ce-e22a-44e2-85e6-4e7b621b824c','QA forged owner','planning',1000);
    raise exception 'Forged owner insert succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claims','{"sub":"fd24b439-362b-45c5-9c8a-f4189af332eb","role":"authenticated"}',true);
do $$
begin
  if exists(select 1 from public.farm_plans where id='36c366fd-2735-4525-b398-214ff6176e37') then raise exception 'Admin can read another owner finance plan'; end if;
end $$;
set local role anon;
do $$
begin
  begin
    perform count(*) from public.farm_plans;
    raise exception 'Anonymous finance read allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$
begin
  begin
    update public.farm_plans set status='completed' where id='36c366fd-2735-4525-b398-214ff6176e37';
    raise exception 'Incomplete season closure accepted';
  exception when check_violation then null;
  end;
  begin
    update public.farm_plans set sales='[{"id":"74dd3627-4e55-48bc-a0b4-3f54629a98a9","method":"per_kg","date":"2026-11-21","quantity_kg":1001,"price_per_kg":20000,"total_price":null,"note":"QA"}]' where id='36c366fd-2735-4525-b398-214ff6176e37';
    raise exception 'Overselling accepted';
  exception when check_violation then null;
  end;
  if public.pm_plan_items_valid('[{"id":"74dd3627-4e55-48bc-a0b4-3f54629a98a9","category":null,"label":"Invalid","quantity":1,"unit":"paket","unit_price":10,"date":null}]','budget') then raise exception 'Null category accepted'; end if;
  if public.pm_plan_items_valid('[{"id":"74dd3627-4e55-48bc-a0b4-3f54629a98a9","category":"seed","label":"Invalid","quantity":1,"unit":"paket","unit_price":10,"date":"2026-02-30"}]','expense') then raise exception 'Invalid date accepted'; end if;
end $$;
select jsonb_build_object('owner_read_write','PASS','version_increment','PASS','owner_reassignment_denied','PASS','cross_account_read_write_delete_denied','PASS','forged_owner_denied','PASS','admin_other_owner_denied','PASS','anonymous_denied','PASS','incomplete_closure_denied','PASS','overselling_denied','PASS','invalid_json_items_denied','PASS','cleanup','ROLLBACK') as verification;
rollback;
