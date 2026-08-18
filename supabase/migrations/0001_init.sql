-- ============ EXTENSIONS ============
create extension if not exists "uuid-ossp";

-- ============ PROFILES ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  total_points numeric not null default 0,
  simulations_run integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create profile row on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (new.id, new.email, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ CHALLENGES (contests) ============
create table if not exists public.challenges (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  tagline text,
  description text,
  theme text not null default 'custom',
  -- constraint parameters (mirrors ClimateConfig / SimConfig subset)
  max_carbon_intensity numeric,          -- tons CO2 / $M
  min_green_allocation numeric,          -- fraction 0-1
  climate_scenario text,                 -- 'orderly' | 'disorderly' | 'hothouse'
  physical_risk_intensity numeric default 1.0,
  tipping_point_prob numeric default 0,
  carbon_tax_onset_year integer default 5,
  years integer not null default 10,
  initial_balance numeric not null default 100000,
  -- scoring weights: w1*sharpe + w2*(1/climateVaR) - w3*(tempRise - 1.5)
  weight_sharpe numeric not null default 1.0,
  weight_climate_var numeric not null default 1.0,
  weight_temp_rise numeric not null default 1.0,
  -- lifecycle
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  prize_tiers jsonb default '[]'::jsonb, -- [{rank:1,label:"1st",reward:"..."}]
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.challenges enable row level security;

drop policy if exists "challenges_select_public" on public.challenges;
create policy "challenges_select_public" on public.challenges
  for select using (status in ('active', 'archived') or
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "challenges_admin_write" on public.challenges;
create policy "challenges_admin_write" on public.challenges
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ============ SUBMISSIONS ============
create table if not exists public.submissions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  challenge_id uuid references public.challenges(id) on delete set null,
  mode text not null default 'contest' check (mode in ('sandbox', 'contest', 'game')),
  allocations jsonb not null,             -- Record<string, number>
  sim_config jsonb not null,              -- full SimConfig snapshot
  result_summary jsonb not null,          -- medianFinal, p10Final, p90Final, sharpe, climateVaR95, impliedTempRise, maxDrawdown, etc.
  sharpe_ratio numeric,
  climate_var_95 numeric,
  implied_temp_rise numeric,
  composite_score numeric,
  created_at timestamptz not null default now()
);

create index if not exists idx_submissions_challenge on public.submissions(challenge_id);
create index if not exists idx_submissions_user on public.submissions(user_id);
create index if not exists idx_submissions_score on public.submissions(challenge_id, composite_score desc);

alter table public.submissions enable row level security;

drop policy if exists "submissions_select_own_or_leaderboard" on public.submissions;
create policy "submissions_select_own_or_leaderboard" on public.submissions
  for select using (
    auth.uid() = user_id
    or challenge_id is not null  -- contest entries are publicly visible for leaderboards
  );

drop policy if exists "submissions_insert_own" on public.submissions;
create policy "submissions_insert_own" on public.submissions
  for insert with check (auth.uid() = user_id);

-- ============ FUNCTION: recompute profile points after a submission ============
create or replace function public.bump_profile_stats()
returns trigger as $$
begin
  update public.profiles
    set simulations_run = simulations_run + 1,
        total_points = total_points + coalesce(new.composite_score, 0),
        updated_at = now()
    where id = new.user_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_submission_created on public.submissions;
create trigger on_submission_created
  after insert on public.submissions
  for each row execute function public.bump_profile_stats();

-- ============ VIEW: leaderboard per challenge ============
create or replace view public.leaderboard as
select
  s.challenge_id,
  s.id as submission_id,
  s.user_id,
  p.username,
  p.display_name,
  (s.result_summary->>'medianFinal')::numeric as portfolio_return,
  s.climate_var_95,
  s.implied_temp_rise,
  s.composite_score,
  s.created_at,
  rank() over (partition by s.challenge_id order by s.composite_score desc) as rank
from public.submissions s
join public.profiles p on p.id = s.user_id
where s.challenge_id is not null;

-- ============ SEED: challenges ============
insert into public.challenges
  (slug, title, tagline, description, theme, max_carbon_intensity, min_green_allocation,
   climate_scenario, physical_risk_intensity, tipping_point_prob, carbon_tax_onset_year,
   years, weight_sharpe, weight_climate_var, weight_temp_rise, status, starts_at, ends_at)
values
  ('orderly-transition-sprint', '1.5°C Orderly Transition Sprint',
   'Minimize Climate VaR while maximizing 10-year returns under strict carbon rules.',
   'Build a portfolio that minimizes Climate VaR while maximizing 10-year returns under strict carbon tax rules.',
   'orderly_transition', 150, 0.30, 'orderly', 1.0, 0.005, 3, 10, 1.0, 1.5, 1.0,
   'active', now(), now() + interval '30 days'),

  ('physical-risk-stress-test', 'Extreme Physical Risk Stress Test',
   'Survive severe sea-level rise and extreme weather across an infrastructure-heavy book.',
   'Optimize a real estate & infrastructure portfolio to survive severe sea-level rise and extreme weather shock probabilities.',
   'physical_risk', null, 0, 'hothouse', 2.5, 0.06, 999, 10, 0.8, 2.0, 0.5,
   'active', now(), now() + interval '30 days'),

  ('green-hydrogen-arbitrage', 'Green Hydrogen vs. Fossil Fuel Arbitrage',
   'High-volatility arbitrage between clean tech and carbon-heavy yield during a surprise transition.',
   'A high-volatility challenge balancing high-yield carbon-heavy assets against emerging clean tech options during a surprise policy transition.',
   'arbitrage', 300, 0.20, 'disorderly', 1.2, 0.02, 8, 8, 1.2, 1.0, 1.2,
   'active', now(), now() + interval '30 days'),

  ('esg-microcap-discovery', 'ESG Micro-Cap Discovery Challenge',
   'Allocate across speculative green innovation while managing jump-diffusion tail risk.',
   'Allocate across speculative green innovation assets while managing jump-diffusion tail risks.',
   'microcap', 100, 0.50, 'orderly', 1.5, 0.01, 4, 6, 1.0, 1.3, 0.8,
   'active', now(), now() + interval '30 days'),

  ('decarbonization-dividend-cup', 'Decarbonization Dividend Cup',
   'Maximize dividend yield under a $50/ton carbon tax penalty.',
   'Maximize portfolio dividend yield subject to a $50/ton carbon tax penalty on underlying companies.',
   'dividend', 200, 0.25, 'disorderly', 1.0, 0.02, 5, 12, 0.9, 1.1, 1.0,
   'active', now(), now() + interval '30 days'),

  ('sovereign-climate-debt', 'Sovereign Climate Debt Challenge',
   'Balance green bond yields against physical risk impairments in EM sovereign debt.',
   'Balance green bond yields against physical risk impairments in emerging market sovereign debt.',
   'sovereign_debt', 120, 0.35, 'hothouse', 1.8, 0.04, 999, 15, 1.0, 1.4, 1.1,
   'active', now(), now() + interval '30 days')
on conflict (slug) do nothing;
