create extension if not exists pgcrypto with schema extensions;

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_hash text not null,
  parent_invite_hash text,
  child_invite_hash text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'adult' check (role in ('owner', 'adult', 'child')),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create table if not exists public.family_state (
  family_id uuid primary key references public.families(id) on delete cascade,
  tasks jsonb not null default '[]'::jsonb,
  entries jsonb not null default '[]'::jsonb,
  assignments jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.families add column if not exists parent_invite_hash text;
alter table public.families add column if not exists child_invite_hash text;
alter table public.family_state add column if not exists assignments jsonb not null default '[]'::jsonb;
alter table public.family_members drop constraint if exists family_members_role_check;
alter table public.family_members add constraint family_members_role_check check (role in ('owner', 'adult', 'child'));

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

drop function if exists public.create_family(text, text, text);
create or replace function public.create_family(requested_name text, parent_code text, child_code text, member_name text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_family_id uuid;
begin
  if auth.uid() is null then raise exception 'Accesso richiesto'; end if;
  if length(trim(requested_name)) < 2 or length(parent_code) < 8 or length(child_code) < 8 or length(trim(member_name)) < 2 then
    raise exception 'Dati famiglia non validi';
  end if;
  if parent_code = child_code then raise exception 'I codici devono essere diversi'; end if;
  if exists (select 1 from public.family_members where user_id = auth.uid()) then
    raise exception 'Utente gia associato a una famiglia';
  end if;

  insert into public.families (name, invite_hash, parent_invite_hash, child_invite_hash, created_by)
  values (
    trim(requested_name),
    crypt(parent_code, gen_salt('bf')),
    crypt(parent_code, gen_salt('bf')),
    crypt(child_code, gen_salt('bf')),
    auth.uid()
  )
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
  matched_role text;
begin
  if auth.uid() is null then raise exception 'Accesso richiesto'; end if;
  if length(invite_code) < 8 or length(trim(member_name)) < 2 then raise exception 'Dati non validi'; end if;
  if exists (select 1 from public.family_members where user_id = auth.uid()) then
    raise exception 'Utente gia associato a una famiglia';
  end if;

  select id,
    case
      when parent_invite_hash is not null and crypt(invite_code, parent_invite_hash) = parent_invite_hash then 'adult'
      when child_invite_hash is not null and crypt(invite_code, child_invite_hash) = child_invite_hash then 'child'
      when parent_invite_hash is null and crypt(invite_code, invite_hash) = invite_hash then 'adult'
    end
  into matched_family_id, matched_role
  from public.families
  where
    (parent_invite_hash is not null and crypt(invite_code, parent_invite_hash) = parent_invite_hash)
    or (child_invite_hash is not null and crypt(invite_code, child_invite_hash) = child_invite_hash)
    or (parent_invite_hash is null and crypt(invite_code, invite_hash) = invite_hash)
  limit 1;

  if matched_family_id is null then raise exception 'Codice invito non valido'; end if;
  insert into public.family_members (family_id, user_id, display_name, role)
  values (matched_family_id, auth.uid(), trim(member_name), matched_role);
  return matched_family_id;
end;
$$;

create or replace function public.update_invite_codes(parent_code text, child_code text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  owned_family_id uuid;
begin
  if auth.uid() is null then raise exception 'Accesso richiesto'; end if;
  if length(parent_code) < 8 or length(child_code) < 8 or parent_code = child_code then
    raise exception 'Codici non validi';
  end if;
  select family_id into owned_family_id
  from public.family_members
  where user_id = auth.uid() and role = 'owner'
  limit 1;
  if owned_family_id is null then raise exception 'Solo il proprietario puo modificare i codici'; end if;
  update public.families
  set parent_invite_hash = crypt(parent_code, gen_salt('bf')),
      child_invite_hash = crypt(child_code, gen_salt('bf'))
  where id = owned_family_id;
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

revoke all on function public.create_family(text, text, text, text) from public;
revoke all on function public.join_family(text, text) from public;
revoke all on function public.get_my_family() from public;
revoke all on function public.update_invite_codes(text, text) from public;
grant execute on function public.create_family(text, text, text, text) to authenticated;
grant execute on function public.join_family(text, text) to authenticated;
grant execute on function public.get_my_family() to authenticated;
grant execute on function public.update_invite_codes(text, text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'family_state'
  ) then
    alter publication supabase_realtime add table public.family_state;
  end if;
end $$;
