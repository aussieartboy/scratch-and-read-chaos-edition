create table if not exists public.scratch_boards (
  board_id text primary key check (length(board_id) between 16 and 80),
  completed_ids text[] not null default array[]::text[],
  updated_at timestamptz not null default now()
);

alter table public.scratch_boards enable row level security;

revoke all on public.scratch_boards from anon, authenticated;

create or replace function public.get_scratch_progress(p_board_id text)
returns text[]
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (
      select completed_ids
      from public.scratch_boards
      where board_id = regexp_replace(left(p_board_id, 80), '[^a-zA-Z0-9_-]', '', 'g')
    ),
    array[]::text[]
  );
$$;

create or replace function public.save_scratch_progress(p_board_id text, p_completed_ids text[])
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.scratch_boards (board_id, completed_ids, updated_at)
  values (
    regexp_replace(left(p_board_id, 80), '[^a-zA-Z0-9_-]', '', 'g'),
    coalesce(p_completed_ids, array[]::text[]),
    now()
  )
  on conflict (board_id)
  do update set
    completed_ids = excluded.completed_ids,
    updated_at = now();
$$;

grant execute on function public.get_scratch_progress(text) to anon, authenticated;
grant execute on function public.save_scratch_progress(text, text[]) to anon, authenticated;
