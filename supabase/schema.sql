-- ═══════════════════════════════════════════════════════════════
-- LearnSphere database schema for Supabase (PostgreSQL)
-- Run this whole file once in: Supabase Dashboard → SQL Editor → New query.
-- It is safe to re-run (idempotent).
-- ═══════════════════════════════════════════════════════════════

create extension if not exists pg_trgm;

-- ───────────────────────── profiles ─────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null,
  full_name   text not null default '',
  bio         text not null default '',
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$'),
  constraint profiles_full_name_length check (char_length(full_name) <= 80),
  constraint profiles_bio_length check (char_length(bio) <= 280),
  constraint profiles_avatar_url_format check (avatar_url is null or avatar_url ~* '^https?://')
);

-- Usernames are unique, case-insensitively.
create unique index if not exists profiles_username_key on public.profiles (lower(username));

-- ─────────────────────────── posts ──────────────────────────────
create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.profiles (id) on delete cascade,
  title         text not null,
  content       text not null default '',
  format        text not null default 'quick_note',
  sections      jsonb,                       -- structured posts keep their fields here
  tags          text[] not null default '{}',
  status        text not null default 'draft',
  source_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  published_at  timestamptz,
  constraint posts_format_check check (format in ('quick_note', 'structured')),
  constraint posts_status_check check (status in ('draft', 'published')),
  constraint posts_title_length check (char_length(title) between 1 and 150),
  constraint posts_content_length check (char_length(content) <= 20000),
  constraint posts_tags_limit check (coalesce(array_length(tags, 1), 0) <= 6),
  constraint posts_source_url_format check (source_url is null or source_url ~* '^https?://'),
  -- Drafts can be rough; published posts need a real title and body.
  constraint posts_publish_requirements check (
    status = 'draft' or (char_length(title) >= 3 and char_length(content) >= 20)
  )
);

create index if not exists posts_feed_idx        on public.posts (status, published_at desc);
create index if not exists posts_author_idx      on public.posts (author_id, created_at desc);
create index if not exists posts_tags_idx        on public.posts using gin (tags);
create index if not exists posts_title_trgm_idx  on public.posts using gin (title gin_trgm_ops);
create index if not exists posts_content_trgm_idx on public.posts using gin (content gin_trgm_ops);

-- ───────────────────── post_interactions ────────────────────────
create table if not exists public.post_interactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  post_id          uuid not null references public.posts (id) on delete cascade,
  interaction_type text not null,
  created_at       timestamptz not null default now(),
  constraint post_interactions_type_check check (interaction_type in ('like', 'bookmark')),
  constraint post_interactions_unique unique (user_id, post_id, interaction_type)
);

create index if not exists post_interactions_post_idx on public.post_interactions (post_id, interaction_type);
create index if not exists post_interactions_user_idx on public.post_interactions (user_id, interaction_type, created_at desc);

-- ───────────────────────── triggers ─────────────────────────────

-- Keep updated_at fresh.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists posts_touch_updated_at on public.posts;
create trigger posts_touch_updated_at before update on public.posts
  for each row execute function public.touch_updated_at();

-- Stamp published_at when a post goes live; clear it when unpublished.
create or replace function public.set_published_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'published' then
    if new.published_at is null then
      new.published_at = now();
    end if;
  else
    new.published_at = null;
  end if;
  return new;
end $$;

drop trigger if exists posts_set_published_at on public.posts;
create trigger posts_set_published_at before insert or update on public.posts
  for each row execute function public.set_published_at();

-- Create a profile automatically when someone signs up.
-- Reads full_name and username from the sign-up metadata. If the username is
-- invalid or already taken, a safe unique one is generated instead of failing
-- the whole sign-up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_name text;
  candidate text;
  attempts  int := 0;
begin
  base_name := lower(regexp_replace(coalesce(new.raw_user_meta_data ->> 'username', ''), '[^a-zA-Z0-9_]', '', 'g'));
  if char_length(base_name) < 3 then
    base_name := 'user' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  base_name := left(base_name, 20);
  candidate := base_name;

  while exists (select 1 from public.profiles where lower(username) = candidate) and attempts < 25 loop
    attempts := attempts + 1;
    candidate := left(base_name, 15) || '_' || substr(md5(random()::text), 1, 4);
  end loop;

  insert into public.profiles (id, username, full_name)
  values (new.id, candidate, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 80));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lets the sign-up form check a username before creating the account.
create or replace function public.username_available(p_username text)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(p_username));
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- ─────────────────── Row Level Security (RLS) ───────────────────
alter table public.profiles          enable row level security;
alter table public.posts             enable row level security;
alter table public.post_interactions enable row level security;

-- profiles: public read; users manage only their own row.
drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable" on public.profiles
  for select using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- posts: anyone reads published posts; authors also see their own drafts.
drop policy if exists "Published posts are public, drafts are private" on public.posts;
create policy "Published posts are public, drafts are private" on public.posts
  for select using (status = 'published' or author_id = auth.uid());

drop policy if exists "Users can create their own posts" on public.posts;
create policy "Users can create their own posts" on public.posts
  for insert to authenticated with check (author_id = auth.uid());

drop policy if exists "Users can update their own posts" on public.posts;
create policy "Users can update their own posts" on public.posts
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Users can delete their own posts" on public.posts
  for delete to authenticated using (author_id = auth.uid());

-- post_interactions: likes are public (for counts); bookmarks are private.
drop policy if exists "Likes are public, bookmarks are private" on public.post_interactions;
create policy "Likes are public, bookmarks are private" on public.post_interactions
  for select using (interaction_type = 'like' or user_id = auth.uid());

drop policy if exists "Users can add interactions on published posts" on public.post_interactions;
create policy "Users can add interactions on published posts" on public.post_interactions
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.posts p where p.id = post_id and p.status = 'published')
  );

drop policy if exists "Users can remove their own interactions" on public.post_interactions;
create policy "Users can remove their own interactions" on public.post_interactions
  for delete to authenticated using (user_id = auth.uid());
