create extension if not exists pgcrypto with schema extensions;

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_hash text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'adult' check (role in ('owner', 'adult')),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create table if not exists public.family_state (
  family_id uuid primary key references public.families(id) on delete cascade,
  tasks jsonb not null default '[]'::jsonb,
  entries jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_state enable row level security;

drop policy if exists "Members can read their family" on public.families;
create policy "Members can read their family"
on public.families for select to authenticated
using (exists (
  select 1 from public.family_members m
  where m.family_id = families.id and m.user_id = auth.uid()
));

drop policy if exists "Members can read their membership" on public.family_members;
create policy "Members can read their membership"
on public.family_members for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Members can read family state" on public.family_state;
create policy "Members can read family state"
on public.family_state for select to authenticated
using (exists (
  select 1 from public.family_members m
  where m.family_id = family_state.family_id and m.user_id = auth.uid()
));

drop policy if exists "Members can insert family state" on public.family_state;
create policy "Members can insert family state"
on public.family_state for insert to authenticated
with check (exists (
  select 1 from public.family_members m
  where m.family_id = family_state.family_id and m.user_id = auth.uid()
));

drop policy if exists "Members can update family state" on public.family_state;
create policy "Members can update family state"
on public.family_state for update to authenticated
using (exists (
  select 1 from public.family_members m
  where m.family_id = family_state.family_id and m.user_id = auth.uid()
))
with check (exists (
  select 1 from public.family_members m
  where m.family_id = family_state.family_id and m.user_id = auth.uid()
));

create or replace function public.create_family(requested_name text, invite_code text, member_name text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_family_id uuid;
begin
  if auth.uid() is null then raise exception 'Accesso richiesto'; end if;
  if length(trim(requested_name)) < 2 or length(invite_code) < 8 or length(trim(member_name)) < 2 then
    raise exception 'Dati famiglia non validi';
  end if;
  if exists (select 1 from public.family_members where user_id = auth.uid()) then
    raise exception 'Utente gia associato a una famiglia';
  end if;

  insert into public.families (name, invite_hash, created_by)
  values (trim(requested_name), crypt(invite_code, gen_salt('bf')), auth.uid())
  returning id into new_family_id;

  insert into public.family_members (family_id, user_id, display_name, role)
  values (new_family_id, auth.uid(), trim(member_name), 'owner');

  insert into public.family_state (family_id) values (new_family_id);
  return new_family_id;
end;
$$;

create or replace function public.join_family(invite_code text, member_name text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  matched_family_id uuid;
begin
  if auth.uid() is null then raise exception 'Accesso richiesto'; end if;
  if length(invite_code) < 8 or length(trim(member_name)) < 2 then raise exception 'Dati non validi'; end if;
  if exists (select 1 from public.family_members where user_id = auth.uid()) then
    raise exception 'Utente gia associato a una famiglia';
  end if;

  select id into matched_family_id
  from public.families
  where crypt(invite_code, invite_hash) = invite_hash
  limit 1;

  if matched_family_id is null then raise exception 'Codice invito non valido'; end if;
  insert into public.family_members (family_id, user_id, display_name, role)
  values (matched_family_id, auth.uid(), trim(member_name), 'adult');
  return matched_family_id;
end;
$$;

create or replace function public.get_my_family()
returns table (family_id uuid, family_name text, display_name text, member_role text)
language sql
security definer
set search_path = public
as $$
  select f.id, f.name, m.display_name, m.role
  from public.family_members m
  join public.families f on f.id = m.family_id
  where m.user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.create_family(text, text, text) from public;
revoke all on function public.join_family(text, text) from public;
revoke all on function public.get_my_family() from public;
grant execute on function public.create_family(text, text, text) to authenticated;
grant execute on function public.join_family(text, text) to authenticated;
grant execute on function public.get_my_family() to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'family_state'
  ) then
    alter publication supabase_realtime add table public.family_state;
  end if;
end $$;
