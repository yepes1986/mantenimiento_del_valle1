-- Ejecuta este script completo en Supabase: Project > SQL Editor > New query > pega y dale "Run".

create extension if not exists "pgcrypto";

create table if not exists installations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) default auth.uid(),
  name text not null,
  phone text,
  address text,
  equipment_type text,
  install_date date,
  notes text,
  created_at timestamptz default now()
);

create table if not exists materials (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) default auth.uid(),
  name text not null,
  category text,
  unit text default 'unidad',
  quantity numeric default 0,
  unit_cost numeric default 0,
  sale_price numeric default 0,
  created_at timestamptz default now()
);

create table if not exists accounting (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) default auth.uid(),
  installation_id uuid references installations(id) on delete cascade,
  date date not null,
  labor_cost numeric default 0,
  items jsonb default '[]'::jsonb,
  payment_status text default 'Pendiente',
  paid_amount numeric default 0,
  notes text,
  total numeric default 0,
  created_at timestamptz default now()
);

create table if not exists logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) default auth.uid(),
  installation_id uuid references installations(id) on delete cascade,
  date date not null,
  error_code text,
  description text,
  resolved boolean default false,
  created_at timestamptz default now()
);

create table if not exists maintenance_completions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) default auth.uid(),
  installation_id uuid references installations(id) on delete cascade,
  scheduled_date date not null,
  unique (installation_id, scheduled_date)
);

-- Seguridad: cada usuario solo ve y edita sus propios datos.
alter table installations enable row level security;
alter table materials enable row level security;
alter table accounting enable row level security;
alter table logs enable row level security;
alter table maintenance_completions enable row level security;

create policy "owner access" on installations for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner access" on materials for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner access" on accounting for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner access" on logs for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner access" on maintenance_completions for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
