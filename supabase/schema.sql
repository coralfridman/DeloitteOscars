create extension if not exists pgcrypto;

-- Destructive reset for a clean mobile-first poll-game database.
-- This deletes existing Deloitte Oscars game data.
drop function if exists public.finish_game(text, text);
drop function if exists public.reveal_question(text, text);
drop function if exists public.open_question(text, text, uuid);
drop function if exists public.submit_answer(uuid, uuid, uuid, uuid);
drop table if exists public.submissions cascade;
drop table if exists public.players cascade;
drop table if exists public.games cascade;
drop table if exists public.answers cascade;
drop table if exists public.questions cascade;
drop table if exists public.quizzes cascade;
drop table if exists public.polls cascade;

create table public.polls (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  prompt text not null,
  background_image_url text,
  position int not null,
  created_at timestamptz not null default now()
);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  label text not null,
  color text not null check (color in ('red', 'blue', 'yellow', 'green')),
  shape text not null check (shape in ('triangle', 'diamond', 'circle', 'square')),
  created_at timestamptz not null default now()
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  code text not null unique,
  host_token_hash text not null,
  status text not null default 'lobby' check (status in ('lobby', 'voting', 'revealed', 'finished')),
  current_question_id uuid references public.questions(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  name text not null,
  score int not null default 0,
  joined_at timestamptz not null default now(),
  unique (game_id, name)
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  answer_id uuid not null references public.answers(id) on delete cascade,
  points_awarded int not null default 100,
  created_at timestamptz not null default now(),
  unique (game_id, player_id, question_id)
);

alter table public.polls enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.games enable row level security;
alter table public.players enable row level security;
alter table public.submissions enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert on public.polls to anon, authenticated;
grant select, insert on public.questions to anon, authenticated;
grant select, insert on public.answers to anon, authenticated;
grant select, insert on public.games to anon, authenticated;
grant select, insert on public.players to anon, authenticated;
grant select on public.submissions to anon, authenticated;

create policy "public read polls" on public.polls for select using (true);
create policy "public write polls" on public.polls for insert with check (true);

create policy "public read questions" on public.questions for select using (true);
create policy "public write questions" on public.questions for insert with check (true);

create policy "public read answers" on public.answers for select using (true);
create policy "public write answers" on public.answers for insert with check (true);

create policy "public read games" on public.games for select using (true);
create policy "public write games" on public.games for insert with check (true);

create policy "public read players" on public.players for select using (true);
create policy "public write players" on public.players for insert with check (true);

create policy "public read submissions" on public.submissions for select using (true);

create or replace function public.host_token_matches(
  p_game public.games,
  p_host_token text
)
returns boolean
language sql
stable
as $$
  select p_game.host_token_hash = encode(digest(coalesce(p_host_token, ''), 'sha256'), 'hex');
$$;

create or replace function public.open_question(
  p_game_code text,
  p_host_token text,
  p_question_id uuid
)
returns public.games
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.games;
begin
  select * into v_game
  from public.games
  where code = upper(trim(p_game_code));

  if v_game.id is null then
    raise exception 'Game not found';
  end if;

  if not public.host_token_matches(v_game, p_host_token) then
    raise exception 'Host token is invalid';
  end if;

  if not exists (
    select 1 from public.questions
    where id = p_question_id
      and poll_id = v_game.poll_id
  ) then
    raise exception 'Question does not belong to this poll game';
  end if;

  update public.games
  set status = 'voting',
      current_question_id = p_question_id
  where id = v_game.id
  returning * into v_game;

  return v_game;
end;
$$;

create or replace function public.reveal_question(
  p_game_code text,
  p_host_token text
)
returns public.games
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.games;
begin
  select * into v_game
  from public.games
  where code = upper(trim(p_game_code));

  if v_game.id is null then
    raise exception 'Game not found';
  end if;

  if not public.host_token_matches(v_game, p_host_token) then
    raise exception 'Host token is invalid';
  end if;

  if v_game.current_question_id is null then
    raise exception 'No active question to reveal';
  end if;

  update public.games
  set status = 'revealed'
  where id = v_game.id
  returning * into v_game;

  return v_game;
end;
$$;

create or replace function public.finish_game(
  p_game_code text,
  p_host_token text
)
returns public.games
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.games;
begin
  select * into v_game
  from public.games
  where code = upper(trim(p_game_code));

  if v_game.id is null then
    raise exception 'Game not found';
  end if;

  if not public.host_token_matches(v_game, p_host_token) then
    raise exception 'Host token is invalid';
  end if;

  update public.games
  set status = 'finished'
  where id = v_game.id
  returning * into v_game;

  return v_game;
end;
$$;

create or replace function public.submit_answer(
  p_game_id uuid,
  p_player_id uuid,
  p_question_id uuid,
  p_answer_id uuid
)
returns public.submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.games;
  v_submission public.submissions;
begin
  select * into v_game
  from public.games
  where id = p_game_id
    and status = 'voting'
    and current_question_id = p_question_id;

  if v_game.id is null then
    raise exception 'Voting is not open for this question';
  end if;

  if not exists (
    select 1 from public.players
    where id = p_player_id
      and game_id = p_game_id
  ) then
    raise exception 'Player does not belong to this game';
  end if;

  if not exists (
    select 1 from public.answers
    where id = p_answer_id
      and question_id = p_question_id
  ) then
    raise exception 'Answer does not belong to question';
  end if;

  insert into public.submissions (
    game_id,
    player_id,
    question_id,
    answer_id,
    points_awarded
  )
  values (
    p_game_id,
    p_player_id,
    p_question_id,
    p_answer_id,
    100
  )
  returning * into v_submission;

  update public.players
  set score = score + 100
  where id = p_player_id
    and game_id = p_game_id;

  return v_submission;
end;
$$;

grant execute on function public.open_question(text, text, uuid) to anon, authenticated;
grant execute on function public.reveal_question(text, text) to anon, authenticated;
grant execute on function public.finish_game(text, text) to anon, authenticated;
grant execute on function public.submit_answer(uuid, uuid, uuid, uuid) to anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.games;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.players;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.submissions;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
