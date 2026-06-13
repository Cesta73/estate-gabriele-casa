-- RIPARTENZA PULITA
-- Questo script cancella tutti i dati di prova della webapp, ma non gli account email Supabase.

drop table if exists public.family_invitations cascade;
drop table if exists public.family_state cascade;
drop table if exists public.family_members cascade;
drop table if exists public.families cascade;

drop function if exists public.create_family(text, text) cascade;
drop function if exists public.create_family(text, text, text) cascade;
drop function if exists public.create_family(text, text, text, text) cascade;
drop function if exists public.join_family(text, text) cascade;
drop function if exists public.update_invite_codes(text, text) cascade;
drop function if exists public.create_family_invitation(text, text, text) cascade;
drop function if exists public.claim_my_invitation() cascade;
drop function if exists public.get_my_family() cascade;
drop function if exists public.get_family_members() cascade;

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  role text not null check (role in ('owner', 'adult', 'child')),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id),
  unique (user_id)
);

create table public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  email text not null,
  display_name text not null,
  role text not null check (role in ('adult', 'child')),
  invited_by uuid not null references auth.users(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (family_id, email)
);

create table public.family_state (
  family_id uuid primary key references public.families(id) on delete cascade,
  tasks jsonb not null default '[]'::jsonb,
  entries jsonb not null default '[]'::jsonb,
  assignments jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invitations enable row level security;
alter table public.family_state enable row level security;

create policy "Members can read their family"
on public.families for select to authenticated
using (exists (
  select 1 from public.family_members m
  where m.family_id = families.id and m.user_id = auth.uid()
));

create policy "Members can read own membership"
on public.family_members for select to authenticated
using (user_id = auth.uid());

create policy "Members can read family state"
on public.family_state for select to authenticated
using (exists (
  select 1 from public.family_members m
  where m.family_id = family_state.family_id and m.user_id = auth.uid()
));

create policy "Members can insert family state"
on public.family_state for insert to authenticated
with check (exists (
  select 1 from public.family_members m
  where m.family_id = family_state.family_id and m.user_id = auth.uid()
));

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

create or replace function public.create_family(requested_name text, member_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_family_id uuid;
  user_email text;
begin
  if auth.uid() is null then raise exception 'Accesso richiesto'; end if;
  if length(trim(requested_name)) < 2 or length(trim(member_name)) < 2 then raise exception 'Dati non validi'; end if;
  if exists (select 1 from public.family_members where user_id = auth.uid()) then raise exception 'Utente gia associato a una famiglia'; end if;

  user_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  insert into public.families (name, created_by) values (trim(requested_name), auth.uid()) returning id into new_family_id;
  insert into public.family_members (family_id, user_id, email, display_name, role)
  values (new_family_id, auth.uid(), user_email, trim(member_name), 'owner');
  insert into public.family_state (family_id) values (new_family_id);
  return new_family_id;
end;
$$;

create or replace function public.create_family_invitation(invited_email text, invited_name text, invited_role text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  owned_family_id uuid;
  invitation_id uuid;
begin
  if auth.uid() is null then raise exception 'Accesso richiesto'; end if;
  if invited_role not in ('adult', 'child') then raise exception 'Ruolo non valido'; end if;
  if length(trim(invited_name)) < 2 or position('@' in invited_email) = 0 then raise exception 'Nome o email non validi'; end if;

  select family_id into owned_family_id from public.family_members
  where user_id = auth.uid() and role = 'owner' limit 1;
  if owned_family_id is null then raise exception 'Solo il proprietario puo invitare familiari'; end if;
  if exists (select 1 from public.family_members where lower(email) = lower(trim(invited_email))) then
    raise exception 'Questa email appartiene gia a una famiglia';
  end if;

  insert into public.family_invitations (family_id, email, display_name, role, invited_by, accepted_at)
  values (owned_family_id, lower(trim(invited_email)), trim(invited_name), invited_role, auth.uid(), null)
  on conflict (family_id, email) do update
  set display_name = excluded.display_name, role = excluded.role, invited_by = auth.uid(), accepted_at = null, created_at = now()
  returning id into invitation_id;
  return invitation_id;
end;
$$;

create or replace function public.claim_my_invitation()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.family_invitations%rowtype;
  user_email text;
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from public.family_members where user_id = auth.uid()) then return true; end if;
  user_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  select * into invitation from public.family_invitations
  where lower(email) = user_email and accepted_at is null
  order by created_at desc limit 1;
  if invitation.id is null then return false; end if;

  insert into public.family_members (family_id, user_id, email, display_name, role)
  values (invitation.family_id, auth.uid(), user_email, invitation.display_name, invitation.role);
  update public.family_invitations set accepted_at = now() where id = invitation.id;
  return true;
end;
$$;

create or replace function public.get_my_family()
returns table (family_id uuid, family_name text, display_name text, member_role text)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.claim_my_invitation();
  return query
  select f.id, f.name, m.display_name, m.role
  from public.family_members m join public.families f on f.id = m.family_id
  where m.user_id = auth.uid() limit 1;
end;
$$;

create or replace function public.get_family_members()
returns table (display_name text, email text, member_role text, member_status text)
language sql
security definer
set search_path = public
as $$
  select people.display_name, people.email, people.member_role, people.member_status
  from (
    select m.display_name, m.email, m.role as member_role, 'active'::text as member_status
    from public.family_members m
    where m.family_id = (select family_id from public.family_members where user_id = auth.uid() limit 1)
    union all
    select i.display_name, i.email, i.role as member_role, 'invited'::text as member_status
    from public.family_invitations i
    where i.accepted_at is null
      and i.family_id = (
        select family_id from public.family_members
        where user_id = auth.uid() and role = 'owner' limit 1
      )
  ) people
  order by case people.member_role when 'owner' then 1 when 'adult' then 2 else 3 end, people.display_name;
$$;

revoke all on function public.create_family(text, text) from public;
revoke all on function public.create_family_invitation(text, text, text) from public;
revoke all on function public.claim_my_invitation() from public;
revoke all on function public.get_my_family() from public;
revoke all on function public.get_family_members() from public;
grant execute on function public.create_family(text, text) to authenticated;
grant execute on function public.create_family_invitation(text, text, text) to authenticated;
grant execute on function public.claim_my_invitation() to authenticated;
grant execute on function public.get_my_family() to authenticated;
grant execute on function public.get_family_members() to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'family_state'
  ) then
    alter publication supabase_realtime add table public.family_state;
  end if;
end $$;
