-- Weight tracking for before/after progress
create table public.weight_logs (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid references auth.users(id) on delete cascade not null,
    weight_kg   numeric(5,1) not null check (weight_kg > 0 and weight_kg < 500),
    measured_at timestamptz not null default now(),
    created_at  timestamptz not null default now()
);

comment on table public.weight_logs is 'User weight measurements for progress tracking.';

alter table public.weight_logs enable row level security;

create policy "Users can read own weight logs"
    on public.weight_logs for select using (auth.uid() = user_id);

create policy "Users can insert own weight logs"
    on public.weight_logs for insert with check (auth.uid() = user_id);

create policy "Users can delete own weight logs"
    on public.weight_logs for delete using (auth.uid() = user_id);

-- User settings for notifications, email reports, preferences
create table public.user_settings (
    user_id             uuid primary key references auth.users(id) on delete cascade not null,
    push_enabled        boolean not null default true,
    weekly_digest       boolean not null default true,
    compact_mode        boolean not null default false,
    email_for_reports   text,
    timezone            text default 'UTC',
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

comment on table public.user_settings is 'User preferences for notifications and display.';

alter table public.user_settings enable row level security;

create policy "Users can read own settings"
    on public.user_settings for select using (auth.uid() = user_id);

create policy "Users can insert own settings"
    on public.user_settings for insert with check (auth.uid() = user_id);

create policy "Users can update own settings"
    on public.user_settings for update using (auth.uid() = user_id);

create trigger set_user_settings_updated_at
    before update on public.user_settings
    for each row execute function set_updated_at();

-- Device tokens for push notifications
create table public.device_tokens (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid references auth.users(id) on delete cascade not null,
    token       text not null,
    platform    text not null check (platform in ('ios', 'android')),
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    unique(user_id, token)
);

comment on table public.device_tokens is 'Push notification device tokens per user.';

alter table public.device_tokens enable row level security;

create policy "Users can manage own device tokens"
    on public.device_tokens for all using (auth.uid() = user_id);

-- Email report queue
create table public.email_report_queue (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid references auth.users(id) on delete cascade not null,
    email       text not null,
    report_type text not null check (report_type in ('weekly', 'monthly')),
    status      text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
    report_data jsonb,
    scheduled_for timestamptz not null,
    sent_at     timestamptz,
    created_at  timestamptz not null default now()
);

comment on table public.email_report_queue is 'Queue for scheduled email reports (weekly digests).';

alter table public.email_report_queue enable row level security;

create policy "Users can read own report queue"
    on public.email_report_queue for select using (auth.uid() = user_id);

-- User streaks persisted table for performance
create table public.user_streaks (
    user_id           uuid primary key references auth.users(id) on delete cascade not null,
    current_streak    integer not null default 0,
    longest_streak    integer not null default 0,
    last_logged_date  date,
    updated_at        timestamptz not null default now()
);

comment on table public.user_streaks is 'Persisted user streak data for fast reads.';

alter table public.user_streaks enable row level security;

create policy "Users can read own streak"
    on public.user_streaks for select using (auth.uid() = user_id);

create policy "Users can insert own streak"
    on public.user_streaks for insert with check (auth.uid() = user_id);

create policy "Users can update own streak"
    on public.user_streaks for update using (auth.uid() = user_id);

-- Function to update streak when a meal is logged
create or replace function public.update_user_streak()
returns trigger
language plpgsql
security definer
as $$
declare
    today_date date := current_date;
    last_date  date;
    new_streak integer;
begin
    select last_logged_date into last_date
    from public.user_streaks
    where user_id = new.user_id;

    if last_date is null or last_date < today_date - interval '1 day' then
        new_streak := 1;
    elsif last_date = today_date - interval '1 day' then
        new_streak := (select current_streak from public.user_streaks where user_id = new.user_id) + 1;
    else
        new_streak := (select current_streak from public.user_streaks where user_id = new.user_id);
    end if;

    insert into public.user_streaks (user_id, current_streak, longest_streak, last_logged_date)
    values (
        new.user_id,
        new_streak,
        greatest(new_streak, (select longest_streak from public.user_streaks where user_id = new.user_id)),
        today_date
    )
    on conflict (user_id) do update set
        current_streak = new_streak,
        longest_streak = greatest(new_streak, public.user_streaks.longest_streak),
        last_logged_date = today_date,
        updated_at = now();

    return new;
end;
$$;

create trigger on_meal_logged_update_streak
    after insert on public.meal_logs
    for each row execute function public.update_user_streak();

-- Notification generation function
create or replace function public.generate_daily_notifications()
returns void
language plpgsql
security definer
as $$
declare
    user_rec record;
    today_meal_cal int;
    goal_cal int;
    streak_count int;
    days_this_week int;
begin
    for user_rec in select id from auth.users loop
        -- Calculate today's calories
        select coalesce(sum(calories), 0) into today_meal_cal
        from public.meal_logs
        where user_id = user_rec.id
          and logged_at::date = current_date;

        -- Get calorie goal
        select calories into goal_cal
        from public.daily_goals
        where user_id = user_rec.id;

        goal_cal := coalesce(goal_cal, 2000);

        -- Get streak
        select current_streak into streak_count
        from public.user_streaks
        where user_id = user_rec.id;

        streak_count := coalesce(streak_count, 0);

        if today_meal_cal > 0 then
            -- Log streak notification
            if streak_count > 0 and streak_count % 7 = 0 then
                insert into public.notifications (user_id, title, body, category, created_at)
                values (
                    user_rec.id,
                    streak_count || '-Day Streak!',
                    'Amazing consistency! You have logged meals for ' || streak_count || ' consecutive days.',
                    'product',
                    now()
                );
            end if;

            -- Log goal accuracy notification
            if today_meal_cal <= goal_cal then
                insert into public.notifications (user_id, title, body, category, created_at)
                values (
                    user_rec.id,
                    'Goal On Track',
                    'You stayed within your daily calorie budget of ' || goal_cal || ' kcal. Great work!',
                    'product',
                    now()
                );
            end if;
        end if;
    end loop;
end;
$$;

-- Extend handle_new_user to also create default settings, streaks, and goals
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.user_streaks (user_id, current_streak, longest_streak)
  values (new.id, 0, 0)
  on conflict (user_id) do nothing;

  insert into public.daily_goals (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Function to send weekly digest (called by cron or edge function)
create or replace function public.generate_weekly_digest_data()
returns table (
    user_id uuid,
    email text,
    avg_calories numeric,
    total_days_logged bigint,
    highest_intake integer,
    current_streak integer
)
language plpgsql
security definer
as $$
begin
    return query
    select
        p.id,
        u.email,
        coalesce(round(avg(ml.calories)::numeric, 0), 0) as avg_calories,
        count(distinct ml.logged_at::date) as total_days_logged,
        coalesce(max(ml.calories), 0)::integer as highest_intake,
        coalesce(us.current_streak, 0) as current_streak
    from auth.users u
    join public.profiles p on p.id = u.id
    left join public.meal_logs ml on ml.user_id = p.id
        and ml.logged_at >= current_date - interval '7 days'
    left join public.user_streaks us on us.user_id = p.id
    where ml.logged_at >= current_date - interval '7 days'
    group by p.id, u.email, us.current_streak;
end;
$$;
