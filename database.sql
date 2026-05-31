create extension if not exists pgcrypto;

create table if not exists public.users_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  adherence_percent numeric(5,2) not null check (adherence_percent between 0 and 100),
  status text not null check (status in ('Verde', 'Amarelo', 'Vermelho')),
  weekly_score numeric(5,2) not null check (weekly_score between 0 and 100),
  sleep_hours_avg numeric(4,2) check (sleep_hours_avg between 0 and 24),
  sleep_score_avg numeric(5,2) check (sleep_score_avg between 0 and 100),
  main_evolution text,
  main_difficulty text,
  main_learning text,
  next_week_focus text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create table if not exists public.weekly_checklist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weekly_review_id uuid not null references public.weekly_reviews(id) on delete cascade,
  gym_3x boolean not null default false,
  cardio_or_tennis boolean not null default false,
  protein_all_meals boolean not null default false,
  whey boolean not null default false,
  creatine_daily boolean not null default false,
  no_weekday_sweets boolean not null default false,
  clean_eating boolean not null default false,
  sleep_7h boolean not null default false,
  sleep_score_75 boolean not null default false,
  fatty_fish boolean not null default false,
  olive_oil boolean not null default false,
  nuts boolean not null default false,
  shoulder_mobility boolean not null default false,
  tennis_warmup boolean not null default false,
  adequate_recovery boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (weekly_review_id)
);

create table if not exists public.tennis_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  match_date date not null,
  opponent text not null,
  score text,
  result text not null check (result in ('win', 'loss', 'cancelled', 'wo')),
  ranking_points integer not null default 0,
  total_points integer not null default 932,
  ranking_position integer not null default 2 check (ranking_position > 0),
  forehand integer check (forehand between 0 and 10),
  backhand integer check (backhand between 0 and 10),
  serve integer check (serve between 0 and 10),
  movement integer check (movement between 0 and 10),
  tactics integer check (tactics between 0 and 10),
  strengths text,
  weaknesses text,
  next_focus text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shoulder_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  pain_rest integer not null default 0 check (pain_rest between 0 and 10),
  pain_movement integer not null default 0 check (pain_movement between 0 and 10),
  pain_serve integer not null default 0 check (pain_serve between 0 and 10),
  status text not null check (status in ('Verde', 'Amarelo', 'Vermelho')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create table if not exists public.body_composition (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assessment_date date not null,
  weight numeric(5,2) not null,
  body_fat numeric(5,2) not null,
  muscle_mass numeric(5,2) not null,
  visceral_fat numeric(5,2) not null,
  inbody_score integer not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, assessment_date)
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_users_profile_updated_at on public.users_profile;
create trigger set_users_profile_updated_at before update on public.users_profile for each row execute function public.set_updated_at();
drop trigger if exists set_weekly_reviews_updated_at on public.weekly_reviews;
create trigger set_weekly_reviews_updated_at before update on public.weekly_reviews for each row execute function public.set_updated_at();
drop trigger if exists set_weekly_checklist_updated_at on public.weekly_checklist;
create trigger set_weekly_checklist_updated_at before update on public.weekly_checklist for each row execute function public.set_updated_at();
drop trigger if exists set_tennis_matches_updated_at on public.tennis_matches;
create trigger set_tennis_matches_updated_at before update on public.tennis_matches for each row execute function public.set_updated_at();
drop trigger if exists set_shoulder_tracking_updated_at on public.shoulder_tracking;
create trigger set_shoulder_tracking_updated_at before update on public.shoulder_tracking for each row execute function public.set_updated_at();
drop trigger if exists set_body_composition_updated_at on public.body_composition;
create trigger set_body_composition_updated_at before update on public.body_composition for each row execute function public.set_updated_at();

alter table public.users_profile enable row level security;
alter table public.weekly_reviews enable row level security;
alter table public.weekly_checklist enable row level security;
alter table public.tennis_matches enable row level security;
alter table public.shoulder_tracking enable row level security;
alter table public.body_composition enable row level security;

create policy users_profile_select_own on public.users_profile for select using (auth.uid() = id);
create policy users_profile_insert_own on public.users_profile for insert with check (auth.uid() = id);
create policy users_profile_update_own on public.users_profile for update using (auth.uid() = id) with check (auth.uid() = id);
create policy users_profile_delete_own on public.users_profile for delete using (auth.uid() = id);
create policy weekly_reviews_select_own on public.weekly_reviews for select using (auth.uid() = user_id);
create policy weekly_reviews_insert_own on public.weekly_reviews for insert with check (auth.uid() = user_id);
create policy weekly_reviews_update_own on public.weekly_reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy weekly_reviews_delete_own on public.weekly_reviews for delete using (auth.uid() = user_id);
create policy weekly_checklist_select_own on public.weekly_checklist for select using (auth.uid() = user_id);
create policy weekly_checklist_insert_own on public.weekly_checklist for insert with check (auth.uid() = user_id);
create policy weekly_checklist_update_own on public.weekly_checklist for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy weekly_checklist_delete_own on public.weekly_checklist for delete using (auth.uid() = user_id);
create policy tennis_matches_select_own on public.tennis_matches for select using (auth.uid() = user_id);
create policy tennis_matches_insert_own on public.tennis_matches for insert with check (auth.uid() = user_id);
create policy tennis_matches_update_own on public.tennis_matches for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy tennis_matches_delete_own on public.tennis_matches for delete using (auth.uid() = user_id);
create policy shoulder_tracking_select_own on public.shoulder_tracking for select using (auth.uid() = user_id);
create policy shoulder_tracking_insert_own on public.shoulder_tracking for insert with check (auth.uid() = user_id);
create policy shoulder_tracking_update_own on public.shoulder_tracking for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy shoulder_tracking_delete_own on public.shoulder_tracking for delete using (auth.uid() = user_id);
create policy body_composition_select_own on public.body_composition for select using (auth.uid() = user_id);
create policy body_composition_insert_own on public.body_composition for insert with check (auth.uid() = user_id);
create policy body_composition_update_own on public.body_composition for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy body_composition_delete_own on public.body_composition for delete using (auth.uid() = user_id);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
