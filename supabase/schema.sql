-- Run this in your Supabase SQL editor

create extension if not exists "uuid-ossp";

-- Projects
create table projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text not null,
  status text not null default 'draft'
    check (status in ('draft','generating','ready','ordered','printing','shipped')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table projects enable row level security;
create policy "Users can manage own projects"
  on projects for all using (auth.uid() = user_id);

-- Photos
create table photos (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  storage_path text not null,
  public_url text not null,
  "order" integer not null default 0,
  caption text,
  created_at timestamptz default now()
);
alter table photos enable row level security;
create policy "Users can manage photos on own projects"
  on photos for all using (
    exists (select 1 from projects where id = project_id and user_id = auth.uid())
  );

-- Storybooks
create table storybooks (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null unique,
  chapters jsonb not null default '[]',
  cover_image_path text,
  pdf_path text,
  status text not null default 'generating'
    check (status in ('generating','ready','failed')),
  created_at timestamptz default now()
);
alter table storybooks enable row level security;
create policy "Users can view own storybooks"
  on storybooks for all using (
    exists (select 1 from projects where id = project_id and user_id = auth.uid())
  );

-- Orders
create table orders (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) not null,
  storybook_id uuid references storybooks(id) not null,
  user_id uuid references auth.users(id) not null,
  contact_email text not null,
  stripe_payment_intent_id text,
  lulu_order_id text,
  status text not null default 'pending'
    check (status in ('pending','paid','submitted_to_printer','printing','shipped','delivered','failed')),
  shipping_address jsonb not null,
  amount_cents integer not null,
  created_at timestamptz default now()
);
alter table orders enable row level security;
create policy "Users can manage own orders"
  on orders for all using (auth.uid() = user_id);

-- Storage buckets (run in Supabase dashboard > Storage)
-- Create two buckets: "photos" (private) and "storybooks" (private)
-- The service role key bypasses RLS for server-side access
