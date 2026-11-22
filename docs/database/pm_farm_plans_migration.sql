-- Additive PM-only migration. Financial records never join the public marketplace.
begin;

create function public.pm_plan_items_valid(items jsonb, item_kind text)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare r jsonb; ids text[] := '{}'; q numeric; p numeric; d date;
begin
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) > 80 then return false; end if;
  for r in select value from jsonb_array_elements(items) loop
    if jsonb_typeof(r) <> 'object' or r->>'id' is null or
       r->>'id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' or r->>'id' = any(ids) then return false; end if;
    ids := array_append(ids, r->>'id');
    if item_kind in ('budget', 'expense') then
      if not (r ?& array['category','label','quantity','unit','unit_price','date']) or
         jsonb_typeof(r->'category') <> 'string' or r->>'category' not in ('seed','fertilizer','protection','labor','irrigation','land','harvest','selling','other') or
         jsonb_typeof(r->'label') <> 'string' or length(btrim(r->>'label')) not between 1 and 120 or
         jsonb_typeof(r->'unit') <> 'string' or length(btrim(r->>'unit')) not between 1 and 30 or
         jsonb_typeof(r->'quantity') <> 'number' or jsonb_typeof(r->'unit_price') <> 'number' then return false; end if;
      q := (r->>'quantity')::numeric; p := (r->>'unit_price')::numeric;
      if q <= 0 or q > 1000000 or q <> round(q,2) or p <= 0 or p > 100000000000 or p <> trunc(p) or round(q*p) > 1000000000000 then return false; end if;
      if item_kind = 'budget' and r->'date' <> 'null'::jsonb then return false; end if;
    elsif item_kind = 'sale' then
      if not (r ?& array['method','quantity_kg','price_per_kg','total_price','date','note']) or
         jsonb_typeof(r->'method') <> 'string' or r->>'method' not in ('per_kg','tebasan') or jsonb_typeof(r->'note') <> 'string' or length(r->>'note') > 300 then return false; end if;
      if r->'quantity_kg' <> 'null'::jsonb then
        if jsonb_typeof(r->'quantity_kg') <> 'number' then return false; end if;
        q := (r->>'quantity_kg')::numeric;
        if q <= 0 or q > 1000000 or q <> round(q,2) then return false; end if;
      end if;
      if r->>'method' = 'per_kg' then
        if jsonb_typeof(r->'quantity_kg') <> 'number' or jsonb_typeof(r->'price_per_kg') <> 'number' or r->'total_price' <> 'null'::jsonb then return false; end if;
        p := (r->>'price_per_kg')::numeric;
        if p <= 0 or p > 100000000 or p <> trunc(p) then return false; end if;
      else
        if jsonb_typeof(r->'total_price') <> 'number' or r->'price_per_kg' <> 'null'::jsonb then return false; end if;
        p := (r->>'total_price')::numeric;
        if p <= 0 or p > 100000000000 or p <> trunc(p) then return false; end if;
      end if;
    else return false;
    end if;
    if item_kind in ('expense','sale') then
      if jsonb_typeof(r->'date') <> 'string' or r->>'date' !~ '^\d{4}-\d{2}-\d{2}$' then return false; end if;
      d := (r->>'date')::date;
      if to_char(d,'YYYY-MM-DD') <> r->>'date' then return false; end if;
    end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;

create function public.pm_plan_sold_kg(items jsonb)
returns numeric language sql immutable security invoker set search_path = '' as $$
  select coalesce(sum((item->>'quantity_kg')::numeric),0) from jsonb_array_elements(items) item;
$$;

create table public.farm_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(btrim(name)) between 3 and 150),
  mode text not null check (mode in ('planning','selling')),
  status text not null default 'active' check (status in ('active','completed')),
  location text not null default '' check (length(location) <= 200),
  variety text not null default '' check (length(variety) <= 100),
  area_m2 numeric(12,2) check (area_m2 > 0 and area_m2 <= 10000000),
  planting_date date, harvest_date date,
  expected_yield_kg numeric(12,2) check (expected_yield_kg > 0 and expected_yield_kg <= 1000000),
  actual_yield_kg numeric(12,2) check (actual_yield_kg >= 0 and actual_yield_kg <= 1000000),
  sale_method text not null default 'per_kg' check (sale_method in ('per_kg','tebasan')),
  expected_price_per_kg bigint check (expected_price_per_kg > 0 and expected_price_per_kg <= 100000000),
  expected_total_sale bigint check (expected_total_sale > 0 and expected_total_sale <= 100000000000),
  costs_confirmed boolean not null default false,
  budget_items jsonb not null default '[]' check (public.pm_plan_items_valid(budget_items,'budget')),
  expense_items jsonb not null default '[]' check (public.pm_plan_items_valid(expense_items,'expense')),
  sales jsonb not null default '[]' check (public.pm_plan_items_valid(sales,'sale')),
  version integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (mode <> 'planning' or area_m2 is not null),
  check (mode <> 'selling' or actual_yield_kg is not null),
  check (harvest_date is null or planting_date is null or harvest_date >= planting_date),
  check (actual_yield_kg is null or public.pm_plan_sold_kg(sales) <= actual_yield_kg),
  check (status <> 'completed' or (costs_confirmed and actual_yield_kg is not null)),
  constraint farm_plans_payload_size check (octet_length(budget_items::text) + octet_length(expense_items::text) + octet_length(sales::text) <= 60000)
);
create index farm_plans_owner_updated_idx on public.farm_plans(owner_id, updated_at desc, id);
comment on table public.farm_plans is 'Private farmer season budgets, expenses and sales. Estimates are user inputs, not yield or price predictions.';
alter table public.farm_plans enable row level security;
create policy farm_plans_read_own on public.farm_plans for select to authenticated using ((select auth.uid()) = owner_id);
create policy farm_plans_insert_own on public.farm_plans for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy farm_plans_update_own on public.farm_plans for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy farm_plans_delete_own on public.farm_plans for delete to authenticated using ((select auth.uid()) = owner_id);
revoke all on public.farm_plans from anon, authenticated;
grant select, delete on public.farm_plans to authenticated;
grant insert(owner_id,name,mode,status,location,variety,area_m2,planting_date,harvest_date,expected_yield_kg,actual_yield_kg,sale_method,expected_price_per_kg,expected_total_sale,costs_confirmed,budget_items,expense_items,sales) on public.farm_plans to authenticated;
grant update(name,mode,status,location,variety,area_m2,planting_date,harvest_date,expected_yield_kg,actual_yield_kg,sale_method,expected_price_per_kg,expected_total_sale,costs_confirmed,budget_items,expense_items,sales) on public.farm_plans to authenticated;

create function public.pm_plan_touch() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.version := old.version + 1;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
create trigger pm_plan_touch before update on public.farm_plans for each row execute function public.pm_plan_touch();
revoke all on function public.pm_plan_items_valid(jsonb,text), public.pm_plan_sold_kg(jsonb), public.pm_plan_touch() from public;
grant execute on function public.pm_plan_items_valid(jsonb,text), public.pm_plan_sold_kg(jsonb), public.pm_plan_touch() to authenticated, service_role;

commit;
