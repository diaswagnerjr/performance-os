alter table public.users_profile
  add column if not exists journey_start date default date '2026-06-01',
  add column if not exists journey_end date default date '2026-08-31',
  add column if not exists initial_ranking_position integer default 2,
  add column if not exists initial_ranking_points integer default 932,
  add column if not exists target_private_lessons integer default 4;

create table if not exists public.technical_lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_date date not null,
  teacher text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.technical_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assessment_date date not null,
  skill text not null check (skill in (
    'Forehand',
    'Backhand',
    'Movimentação',
    'Tática',
    'Saque',
    'Voleio',
    'Devolução de saque',
    'Transição ataque/defesa',
    'Consistência mental durante os jogos'
  )),
  current_score numeric(4,2) not null check (current_score between 0 and 10),
  target_score numeric(4,2) not null check (target_score between 0 and 10),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_technical_lessons_updated_at on public.technical_lessons;
create trigger set_technical_lessons_updated_at before update on public.technical_lessons for each row execute function public.set_updated_at();

drop trigger if exists set_technical_progress_updated_at on public.technical_progress;
create trigger set_technical_progress_updated_at before update on public.technical_progress for each row execute function public.set_updated_at();

alter table public.technical_lessons enable row level security;
alter table public.technical_progress enable row level security;

drop policy if exists technical_lessons_select_own on public.technical_lessons;
create policy technical_lessons_select_own on public.technical_lessons for select using (auth.uid() = user_id);
drop policy if exists technical_lessons_insert_own on public.technical_lessons;
create policy technical_lessons_insert_own on public.technical_lessons for insert with check (auth.uid() = user_id);
drop policy if exists technical_lessons_update_own on public.technical_lessons;
create policy technical_lessons_update_own on public.technical_lessons for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists technical_lessons_delete_own on public.technical_lessons;
create policy technical_lessons_delete_own on public.technical_lessons for delete using (auth.uid() = user_id);

drop policy if exists technical_progress_select_own on public.technical_progress;
create policy technical_progress_select_own on public.technical_progress for select using (auth.uid() = user_id);
drop policy if exists technical_progress_insert_own on public.technical_progress;
create policy technical_progress_insert_own on public.technical_progress for insert with check (auth.uid() = user_id);
drop policy if exists technical_progress_update_own on public.technical_progress;
create policy technical_progress_update_own on public.technical_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists technical_progress_delete_own on public.technical_progress;
create policy technical_progress_delete_own on public.technical_progress for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.technical_lessons to authenticated;
grant select, insert, update, delete on public.technical_progress to authenticated;

truncate table
  public.weekly_checklist,
  public.weekly_reviews,
  public.tennis_matches,
  public.shoulder_tracking,
  public.body_composition,
  public.technical_lessons,
  public.technical_progress
restart identity cascade;
