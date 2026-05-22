-- App domain tables for Calorie Tracker: meal_logs, daily_goals, and notifications
-- Also extends profiles with plan_type for server-side subscription state.

-- ── Extend profiles ──────────────────────────────────────────────────────────

alter table public.profiles add column if not exists plan_type text not null default 'free';

-- ── daily_goals ──────────────────────────────────────────────────────────────

create table public.daily_goals (
    user_id     uuid primary key references auth.users(id) on delete cascade not null,
    calories    integer not null default 2000,
    protein     integer not null default 130, -- in grams
    carbs       integer not null default 220, -- in grams
    fat         integer not null default 70,  -- in grams
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

comment on table public.daily_goals is 'Daily nutritional targets (calories and macros) for users.';

alter table public.daily_goals enable row level security;

create policy "Users can read own goals"
    on public.daily_goals for select using (auth.uid() = user_id);

create policy "Users can insert own goals"
    on public.daily_goals for insert with check (auth.uid() = user_id);

create policy "Users can update own goals"
    on public.daily_goals for update using (auth.uid() = user_id);

create trigger set_daily_goals_updated_at
    before update on public.daily_goals
    for each row execute function set_updated_at();

-- ── meal_logs ────────────────────────────────────────────────────────────────

create table public.meal_logs (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid references auth.users(id) on delete cascade not null,
    name        text not null,
    calories    integer not null default 0,
    protein     integer not null default 0,
    carbs       integer not null default 0,
    fat         integer not null default 0,
    meal_type   text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
    image_url   text,
    logged_at   timestamptz not null default now(),
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

comment on table public.meal_logs is 'Logged meal logs with nutritional breakdown and meal categorization.';

alter table public.meal_logs enable row level security;

create policy "Users can read own meal logs"
    on public.meal_logs for select using (auth.uid() = user_id);

create policy "Users can insert own meal logs"
    on public.meal_logs for insert with check (auth.uid() = user_id);

create policy "Users can update own meal logs"
    on public.meal_logs for update using (auth.uid() = user_id);

create policy "Users can delete own meal logs"
    on public.meal_logs for delete using (auth.uid() = user_id);

create trigger set_meal_logs_updated_at
    before update on public.meal_logs
    for each row execute function set_updated_at();

-- ── Notifications ────────────────────────────────────────────────────────────

create type notification_category as enum ('billing', 'system', 'product', 'team');

create table public.notifications (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid references auth.users(id) on delete cascade not null,
    title       text not null,
    body        text,
    category    notification_category not null default 'system',
    read        boolean not null default false,
    created_at  timestamptz not null default now()
);

comment on table public.notifications is 'Push notifications and system alerts history.';

alter table public.notifications enable row level security;

create policy "Users can read own notifications"
    on public.notifications for select using (auth.uid() = user_id);

create policy "Users can update own notifications"
    on public.notifications for update using (auth.uid() = user_id);
