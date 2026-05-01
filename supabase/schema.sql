create extension if not exists pgcrypto;

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  prompt text not null,
  background_image_url text,
  position int not null,
  time_limit_seconds int not null default 20,
  created_at timestamptz not null default now()
);

alter table public.questions
  add column if not exists background_image_url text;

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  label text not null,
  color text not null check (color in ('red', 'blue', 'yellow', 'green')),
  shape text not null check (shape in ('triangle', 'diamond', 'circle', 'square')),
  is_correct boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  code text not null unique,
  status text not null default 'lobby' check (status in ('lobby', 'live', 'results', 'finished')),
  current_question_id uuid references public.questions(id) on delete set null,
  question_started_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  name text not null,
  score int not null default 0,
  joined_at timestamptz not null default now(),
  unique (game_id, name)
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  answer_id uuid not null references public.answers(id) on delete cascade,
  is_correct boolean not null,
  response_ms int not null,
  points_awarded int not null,
  created_at timestamptz not null default now(),
  unique (game_id, player_id, question_id)
);

alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.games enable row level security;
alter table public.players enable row level security;
alter table public.submissions enable row level security;

drop policy if exists "public read quizzes" on public.quizzes;
drop policy if exists "public write quizzes" on public.quizzes;
drop policy if exists "public read questions" on public.questions;
drop policy if exists "public write questions" on public.questions;
drop policy if exists "public read answers" on public.answers;
drop policy if exists "public write answers" on public.answers;
drop policy if exists "public read games" on public.games;
drop policy if exists "public write games" on public.games;
drop policy if exists "public read players" on public.players;
drop policy if exists "public write players" on public.players;
drop policy if exists "public read submissions" on public.submissions;
drop policy if exists "public write submissions" on public.submissions;

create policy "public read quizzes" on public.quizzes for select using (true);
create policy "public write quizzes" on public.quizzes for insert with check (true);

create policy "public read questions" on public.questions for select using (true);
create policy "public write questions" on public.questions for insert with check (true);

create policy "public read answers" on public.answers for select using (true);
create policy "public write answers" on public.answers for insert with check (true);

create policy "public read games" on public.games for select using (true);
create policy "public write games" on public.games for insert with check (true);
create policy "public update games" on public.games for update using (true) with check (true);

create policy "public read players" on public.players for select using (true);
create policy "public write players" on public.players for insert with check (true);
create policy "public update players" on public.players for update using (true) with check (true);

create policy "public read submissions" on public.submissions for select using (true);
create policy "public write submissions" on public.submissions for insert with check (true);

create or replace function public.submit_answer(
  p_game_id uuid,
  p_player_id uuid,
  p_question_id uuid,
  p_answer_id uuid
)
returns public.submissions
language plpgsql
security definer
as $$
declare
  v_started_at timestamptz;
  v_is_correct boolean;
  v_response_ms int;
  v_points int;
  v_submission public.submissions;
begin
  select question_started_at
  into v_started_at
  from public.games
  where id = p_game_id
    and status = 'live'
    and current_question_id = p_question_id;

  if v_started_at is null then
    raise exception 'Question is not active';
  end if;

  select is_correct
  into v_is_correct
  from public.answers
  where id = p_answer_id
    and question_id = p_question_id;

  if v_is_correct is null then
    raise exception 'Answer does not belong to question';
  end if;

  v_response_ms := greatest(0, floor(extract(epoch from (clock_timestamp() - v_started_at)) * 1000)::int);
  v_points := case
    when v_is_correct then greatest(250, 1000 - floor(v_response_ms / 25)::int)
    else 0
  end;

  insert into public.submissions (
    game_id,
    player_id,
    question_id,
    answer_id,
    is_correct,
    response_ms,
    points_awarded
  )
  values (
    p_game_id,
    p_player_id,
    p_question_id,
    p_answer_id,
    v_is_correct,
    v_response_ms,
    v_points
  )
  returning * into v_submission;

  update public.players
  set score = score + v_points
  where id = p_player_id
    and game_id = p_game_id;

  return v_submission;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.games;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.players;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.submissions;
exception
  when duplicate_object then null;
end;
$$;
