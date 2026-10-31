-- SIMANTRI PM: fresh-project schema. Never apply to the competition project.
-- Schema snapshot including four price types and 60-day retention; application roles are database-owned.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (length(btrim(full_name)) between 1 and 200),
  role text not null default 'petani' check (role in ('petani','admin')),
  village text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create function private.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select auth.uid() is not null and exists (
  select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
); $$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated, service_role;

create function private.create_pm_profile() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- raw_user_meta_data may supply display data, NEVER authorization.
  insert into public.profiles(id,full_name,role,village)
  values (new.id,
    coalesce(nullif(left(btrim(new.raw_user_meta_data->>'full_name'),200),''),'Petani SIMANTRI'),
    'petani', left(new.raw_user_meta_data->>'village',200));
  return new;
end; $$;
revoke all on function private.create_pm_profile() from public, anon, authenticated;
create trigger create_pm_profile_after_signup after insert on auth.users
for each row execute function private.create_pm_profile();

create function private.touch_updated_at() returns trigger
language plpgsql security invoker set search_path = ''
as $$ begin new.updated_at = now(); return new; end; $$;
revoke all on function private.touch_updated_at() from public, anon, authenticated;
create trigger profiles_updated before update on public.profiles
for each row execute function private.touch_updated_at();

create policy profiles_read on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select private.is_admin()));
create policy profiles_update_own on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
-- Even an authenticated request cannot change role, id, or timestamps of creation.
grant update(full_name,village,updated_at) on public.profiles to authenticated;
grant all on public.profiles to service_role;

create table public.knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  doc_id text not null unique,
  title text not null,
  category text not null,
  subcategory text, topic text, summary text not null default '', content text not null,
  keywords text[] not null default '{}',
  semantic_keywords text[] not null default '{}',
  synonyms text[] not null default '{}',
  entity_type text, location text,
  recommended_month text[] not null default '{}',
  recommended_season text,
  related_varieties text[] not null default '{}',
  related_diseases text[] not null default '{}',
  related_pests text[] not null default '{}',
  related_weather text[] not null default '{}',
  evidence_level text, review_status text,
  source_title text, source_url text,
  image_urls text[] not null default '{}',
  metadata jsonb not null default '{}',
  status text not null default 'draft' check (status in ('draft','published')),
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index knowledge_content_fts on public.knowledge_entries using gin(to_tsvector('simple',content));
create index knowledge_keywords_idx on public.knowledge_entries using gin(keywords);
create index knowledge_status_category_idx on public.knowledge_entries(status,category);
create index knowledge_author_idx on public.knowledge_entries(author_id);
alter table public.knowledge_entries enable row level security;
create policy knowledge_public_read on public.knowledge_entries for select to anon using (status='published');
create policy knowledge_user_read on public.knowledge_entries for select to authenticated
using (status='published' or (select private.is_admin()));
create policy knowledge_admin_insert on public.knowledge_entries for insert to authenticated
with check ((select private.is_admin()));
create policy knowledge_admin_update on public.knowledge_entries for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy knowledge_admin_delete on public.knowledge_entries for delete to authenticated
using ((select private.is_admin()));
revoke all on public.knowledge_entries from anon, authenticated;
grant select on public.knowledge_entries to anon, authenticated;
grant insert,update,delete on public.knowledge_entries to authenticated;
grant all on public.knowledge_entries to service_role;
create trigger knowledge_updated before update on public.knowledge_entries
for each row execute function private.touch_updated_at();

create table public.chat_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null, response text not null,
  feedback text check (feedback in ('helpful','not_helpful')),
  feedback_note text,
  created_at timestamptz not null default now()
);
create index chat_logs_owner_date_idx on public.chat_logs(user_id,created_at desc);
alter table public.chat_logs enable row level security;
create policy chat_own_read on public.chat_logs for select to authenticated
using (user_id=(select auth.uid()));
create policy chat_own_insert on public.chat_logs for insert to authenticated
with check (user_id=(select auth.uid()));
create policy chat_own_feedback on public.chat_logs for update to authenticated
using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
revoke all on public.chat_logs from anon, authenticated;
grant select on public.chat_logs to authenticated;
grant insert(user_id,message,response) on public.chat_logs to authenticated;
grant update(feedback,feedback_note) on public.chat_logs to authenticated;
grant all on public.chat_logs to service_role;

create table public.market_price (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null unique,
  harga numeric(12,2) not null check (harga>0),
  source text not null default 'manual' check (source in ('manual','scraping')),
  region_name text not null default 'Jawa Timur',
  source_url text,
  input_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index market_price_input_idx on public.market_price(input_by);
alter table public.market_price enable row level security;
create policy price_read on public.market_price for select to authenticated using (true);
create policy price_admin_insert on public.market_price for insert to authenticated
with check ((select private.is_admin()) and input_by=(select auth.uid()));
create policy price_admin_update on public.market_price for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()) and input_by=(select auth.uid()));
revoke all on public.market_price from anon, authenticated;
grant select,insert,update on public.market_price to authenticated;
grant all on public.market_price to service_role;
create trigger market_price_updated before update on public.market_price
for each row execute function private.touch_updated_at();

create table public.market_regional_price (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  prov_id integer not null check (prov_id>0),
  provinsi text not null check (length(btrim(provinsi)) between 1 and 150),
  komoditas text not null default 'Bawang Merah Ukuran Sedang',
  -- Updated by cloud migration support_four_pihps_price_types; producer remains the default.
  price_type integer not null default 4 check (price_type in (1,2,3,4)),
  harga numeric(12,2) not null check (harga>0),
  harga_diff text not null default '',
  semua_provinsi numeric(12,2),
  percentage numeric,
  source_url text not null default 'https://www.bi.go.id/hargapangan',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tanggal,prov_id,komoditas,price_type)
);
create index regional_province_history_idx on public.market_regional_price(prov_id,tanggal desc);
alter table public.market_regional_price enable row level security;
create policy regional_read on public.market_regional_price for select to authenticated using (true);
create policy regional_admin_insert on public.market_regional_price for insert to authenticated
with check ((select private.is_admin()));
create policy regional_admin_update on public.market_regional_price for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
revoke all on public.market_regional_price from anon, authenticated;
grant select,insert,update on public.market_regional_price to authenticated;
grant all on public.market_regional_price to service_role;
create trigger regional_updated before update on public.market_regional_price
for each row execute function private.touch_updated_at();

-- Added by cloud migration market_price_retention_60_days. No background job.
create policy regional_admin_delete_expired on public.market_regional_price
for delete to authenticated using (
  (select private.is_admin())
  and komoditas='Bawang Merah Ukuran Sedang'
  and tanggal < (timezone('Asia/Jakarta', now()))::date - 59
);
create policy price_admin_delete_expired on public.market_price
for delete to authenticated using (
  (select private.is_admin())
  and tanggal < (timezone('Asia/Jakarta', now()))::date - 59
);
grant delete on public.market_regional_price,public.market_price to authenticated;

create function public.prune_expired_market_prices()
returns jsonb language plpgsql security invoker set search_path=''
as $function$
declare
  window_end date := (timezone('Asia/Jakarta',now()))::date;
  cutoff_date date := window_end - 59;
  regional_deleted integer;
  legacy_deleted integer;
begin
  if auth.uid() is null or not private.is_admin() then
    raise exception 'Only Admin may prune expired market prices' using errcode='42501';
  end if;
  delete from public.market_regional_price
  where tanggal < cutoff_date and komoditas='Bawang Merah Ukuran Sedang' and price_type in (1,2,3,4);
  get diagnostics regional_deleted = row_count;
  delete from public.market_price where tanggal < cutoff_date;
  get diagnostics legacy_deleted = row_count;
  return jsonb_build_object('retention_days',60,'cutoff_date',cutoff_date,'through_date',window_end,
    'deleted_regional',regional_deleted,'deleted_legacy',legacy_deleted);
end;
$function$;
revoke all on function public.prune_expired_market_prices() from public,anon,authenticated,service_role;
grant execute on function public.prune_expired_market_prices() to authenticated;

create table public.harvest_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(btrim(title)) between 3 and 200),
  description text not null default '',
  variety text, location text not null,
  quantity_kg numeric(12,2) not null check (quantity_kg>0),
  price_per_kg numeric(12,2) not null check (price_per_kg>0),
  harvest_date date, contact text not null,
  image_paths text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','pending','published','sold','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index harvest_seller_idx on public.harvest_listings(seller_id,created_at desc);
create index harvest_status_location_idx on public.harvest_listings(status,location);
alter table public.harvest_listings enable row level security;
create policy harvest_read on public.harvest_listings for select to authenticated
using (status='published' or seller_id=(select auth.uid()) or (select private.is_admin()));
create policy harvest_own_insert on public.harvest_listings for insert to authenticated
with check (seller_id=(select auth.uid()) and status in ('draft','pending'));
create policy harvest_update on public.harvest_listings for update to authenticated
using (seller_id=(select auth.uid()) or (select private.is_admin()))
with check ((seller_id=(select auth.uid()) and status in ('draft','pending','sold')) or (select private.is_admin()));
create policy harvest_delete on public.harvest_listings for delete to authenticated
using (seller_id=(select auth.uid()) or (select private.is_admin()));
revoke all on public.harvest_listings from anon, authenticated;
grant select,insert,delete on public.harvest_listings to authenticated;
grant update(title,description,variety,location,quantity_kg,price_per_kg,harvest_date,contact,image_paths,status,updated_at)
on public.harvest_listings to authenticated;
grant all on public.harvest_listings to service_role;
create trigger harvest_updated before update on public.harvest_listings
for each row execute function private.touch_updated_at();

-- Invoker functions obey the caller's RLS; an anon key is never a write bypass.
create function public.upsert_scraped_market_price(
  p_tanggal date,p_harga numeric,p_source text default 'scraping',p_input_by uuid default null
) returns void language plpgsql security invoker set search_path = ''
as $$
begin
  if p_source is distinct from 'scraping' then raise exception 'Invalid source'; end if;
  insert into public.market_price(tanggal,harga,source,input_by,region_name,source_url)
  values(p_tanggal,p_harga,p_source,p_input_by,'Jawa Timur','https://www.bi.go.id/hargapangan')
  on conflict(tanggal) do update set harga=excluded.harga,source=excluded.source,
    input_by=excluded.input_by,region_name=excluded.region_name,source_url=excluded.source_url;
end; $$;
revoke all on function public.upsert_scraped_market_price(date,numeric,text,uuid) from public,anon;
grant execute on function public.upsert_scraped_market_price(date,numeric,text,uuid) to authenticated,service_role;

create function public.upsert_scraped_regional_price(p_records jsonb) returns integer
language plpgsql security invoker set search_path = ''
as $$
declare affected integer;
begin
  if jsonb_typeof(p_records) is distinct from 'array' or jsonb_array_length(p_records)>2000 then
    raise exception 'Expected an array of at most 2000 records';
  end if;
  insert into public.market_regional_price(tanggal,prov_id,provinsi,komoditas,price_type,harga,harga_diff,semua_provinsi,percentage)
  select r.tanggal,r.prov_id,r.provinsi,r.komoditas,r.price_type,r.harga,coalesce(r.harga_diff,''),r.semua_provinsi,r.percentage
  from jsonb_to_recordset(p_records) as r(tanggal date,prov_id integer,provinsi text,
    komoditas text,price_type integer,harga numeric,harga_diff text,semua_provinsi numeric,percentage numeric)
  on conflict(tanggal,prov_id,komoditas,price_type) do update set
    provinsi=excluded.provinsi,harga=excluded.harga,harga_diff=excluded.harga_diff,
    semua_provinsi=excluded.semua_provinsi,percentage=excluded.percentage;
  get diagnostics affected = row_count;
  return affected;
end; $$;
revoke all on function public.upsert_scraped_regional_price(jsonb) from public,anon;
grant execute on function public.upsert_scraped_regional_price(jsonb) to authenticated,service_role;

comment on table public.harvest_listings is 'PM foundation only: marketplace UI and storage buckets remain separate implementation work.';
comment on table public.market_price is 'Legacy-compatible history for East Java; not a Sukomoro market or Nganjuk district quote.';
comment on table public.knowledge_entries is 'Local reference documents imported without asserting independent scientific verification.';
notify pgrst,'reload schema';
