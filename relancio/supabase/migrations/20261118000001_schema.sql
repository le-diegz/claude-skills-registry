-- Relancio — schéma initial
-- Montants en centimes (bigint), dates en UTC (timestamptz), dates calendaires en `date`.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Utilitaires
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Organisations et membres
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  legal_name text,
  siret text check (siret is null or siret ~ '^[0-9]{14}$'),
  email text,
  phone text,
  address_line text,
  postal_code text,
  city text,
  trades text[] not null default '{}',
  is_demo boolean not null default false,
  onboarding_completed_at timestamptz,
  onboarding_step smallint not null default 1,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index organizations_is_demo_idx on public.organizations (is_demo, created_at);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  current_organization_id uuid references public.organizations (id) on delete set null,
  notify_followups boolean not null default true,
  notify_imports boolean not null default true,
  notify_failures boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index organization_members_user_idx on public.organization_members (user_id);

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'member')),
  token_hash text not null unique,
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index organization_invitations_open_idx
  on public.organization_invitations (organization_id, lower(email))
  where accepted_at is null and revoked_at is null;

-- ---------------------------------------------------------------------------
-- Helpers RLS (SECURITY DEFINER pour éviter la récursion des politiques)
-- ---------------------------------------------------------------------------
create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.has_org_role(org uuid, roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org
      and m.user_id = (select auth.uid())
      and m.role = any (roles)
  );
$$;

-- ---------------------------------------------------------------------------
-- Clients
-- ---------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  company_name text,
  email text,
  email_normalized text generated always as (nullif(lower(trim(email)), '')) stored,
  phone text,
  phone_normalized text,
  address_line text,
  postal_code text,
  city text,
  customer_type text not null default 'particulier'
    check (customer_type in ('particulier', 'professionnel', 'collectivite', 'syndic', 'autre')),
  notes text,
  do_not_contact boolean not null default false,
  do_not_contact_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customers_org_idx on public.customers (organization_id, name);
create index customers_email_idx on public.customers (organization_id, email_normalized);
create index customers_phone_idx on public.customers (organization_id, phone_normalized);
create index customers_search_idx on public.customers
  using gin ((coalesce(name, '') || ' ' || coalesce(company_name, '') || ' ' || coalesce(email, '')) extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Devis
-- ---------------------------------------------------------------------------
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete restrict,
  reference text not null check (char_length(reference) between 1 and 60),
  title text not null check (char_length(title) between 1 and 200),
  service_type text not null default 'climatisation'
    check (service_type in ('climatisation', 'pompe_a_chaleur', 'plomberie', 'chauffage', 'entretien', 'depannage', 'autre')),
  description text,
  amount_ht_cents bigint not null check (amount_ht_cents >= 0 and amount_ht_cents < 100000000000),
  vat_rate_bp integer check (vat_rate_bp is null or vat_rate_bp between 0 and 10000),
  amount_ttc_cents bigint not null check (amount_ttc_cents >= amount_ht_cents),
  issued_on date not null default (now() at time zone 'Europe/Paris')::date,
  sent_at timestamptz,
  expires_on date,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'pending', 'to_follow_up', 'followed_up', 'accepted', 'declined', 'expired', 'cancelled')),
  owner_id uuid references public.profiles (id) on delete set null,
  notes text,
  next_followup_at timestamptz,
  followup_count smallint not null default 0 check (followup_count >= 0),
  last_followup_at timestamptz,
  followups_paused boolean not null default false,
  followups_paused_reason text,
  replied_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  lost_reason text check (lost_reason is null or lost_reason in ('prix', 'concurrent', 'projet_reporte', 'sans_reponse', 'financement', 'technique', 'autre')),
  lost_reason_details text,
  source text not null default 'manual' check (source in ('manual', 'import', 'demo', 'duplicate')),
  import_job_id uuid,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, reference),
  constraint quotes_sent_requires_date check (status in ('draft', 'cancelled') or sent_at is not null),
  constraint quotes_expiry_after_issue check (expires_on is null or expires_on >= issued_on)
);
create index quotes_org_status_idx on public.quotes (organization_id, status);
create index quotes_org_next_followup_idx on public.quotes (organization_id, next_followup_at) where next_followup_at is not null;
create index quotes_org_issued_idx on public.quotes (organization_id, issued_on desc);
create index quotes_customer_idx on public.quotes (customer_id);
create index quotes_owner_idx on public.quotes (organization_id, owner_id);
create index quotes_search_idx on public.quotes
  using gin ((reference || ' ' || title) extensions.gin_trgm_ops);

create table public.quote_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  quote_id uuid not null references public.quotes (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quote_attachments_quote_idx on public.quote_attachments (quote_id);

-- ---------------------------------------------------------------------------
-- Politique et modèles de relance
-- ---------------------------------------------------------------------------
create table public.followup_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations (id) on delete cascade,
  first_delay_days smallint not null default 3 check (first_delay_days between 1 and 90),
  second_delay_days smallint not null default 7 check (second_delay_days between 1 and 90),
  third_delay_days smallint default 14 check (third_delay_days is null or third_delay_days between 1 and 120),
  max_followups smallint not null default 3 check (max_followups between 1 and 3),
  business_days_only boolean not null default true,
  window_start_minutes smallint not null default 540 check (window_start_minutes between 0 and 1439),
  window_end_minutes smallint not null default 1080 check (window_end_minutes between 1 and 1440),
  auto_expire boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint followup_policies_window check (window_end_minutes > window_start_minutes)
);

create table public.followup_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind text not null check (kind in ('first', 'second', 'last', 'confirmation', 'custom')),
  name text not null check (char_length(name) between 1 and 80),
  subject text not null check (char_length(subject) between 1 and 200),
  body text not null check (char_length(body) between 1 and 5000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index followup_templates_org_idx on public.followup_templates (organization_id, kind);

-- ---------------------------------------------------------------------------
-- Relances (jobs)
-- ---------------------------------------------------------------------------
create table public.followup_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  quote_id uuid not null references public.quotes (id) on delete cascade,
  sequence smallint not null check (sequence between 1 and 3),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'to_prepare', 'pending_approval', 'approved', 'sending', 'sent', 'failed', 'cancelled', 'skipped')),
  channel text not null default 'email' check (channel in ('email', 'manual', 'phone')),
  scheduled_for timestamptz not null,
  template_id uuid references public.followup_templates (id) on delete set null,
  subject text,
  body text,
  recipient_email text,
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  sent_at timestamptz,
  sent_by uuid references auth.users (id) on delete set null,
  provider_message_id text,
  attempt_count smallint not null default 0,
  last_error text,
  cancelled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quote_id, sequence),
  -- Validation humaine obligatoire avant tout envoi (V1)
  constraint followup_jobs_approval_required check (
    status not in ('sending', 'sent') or (approved_by is not null and approved_at is not null)
  ),
  constraint followup_jobs_sent_requires_date check (status <> 'sent' or sent_at is not null)
);
create index followup_jobs_org_status_idx on public.followup_jobs (organization_id, status, scheduled_for);
create index followup_jobs_due_idx on public.followup_jobs (scheduled_for) where status = 'scheduled';

-- ---------------------------------------------------------------------------
-- Communications, activité, notifications, audit
-- ---------------------------------------------------------------------------
create table public.communication_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  quote_id uuid references public.quotes (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  followup_job_id uuid references public.followup_jobs (id) on delete set null,
  direction text not null check (direction in ('outbound', 'inbound')),
  channel text not null check (channel in ('email', 'phone', 'manual', 'other')),
  kind text not null check (kind in ('followup_sent', 'followup_manual', 'reply', 'call', 'note')),
  delivery_status text check (delivery_status is null or delivery_status in ('queued', 'sent', 'delivered', 'bounced', 'complained', 'failed', 'delayed', 'opened', 'clicked')),
  provider text,
  provider_message_id text,
  subject text,
  summary text,
  occurred_at timestamptz not null default now(),
  actor_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index communication_events_quote_idx on public.communication_events (quote_id, occurred_at desc);
create index communication_events_provider_idx on public.communication_events (provider_message_id) where provider_message_id is not null;
create index communication_events_org_idx on public.communication_events (organization_id, occurred_at desc);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  quote_id uuid references public.quotes (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  actor_id uuid references public.profiles (id) on delete set null,
  type text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index activity_events_org_idx on public.activity_events (organization_id, created_at desc);
create index activity_events_quote_idx on public.activity_events (quote_id, created_at desc);
create index activity_events_customer_idx on public.activity_events (customer_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('followup_to_approve', 'quote_to_follow', 'import_completed', 'send_failed', 'invitation', 'info')),
  title text not null,
  body text,
  link text,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, organization_id, read_at, created_at desc);
create unique index notifications_dedupe_idx on public.notifications (user_id, dedupe_key);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index audit_logs_org_idx on public.audit_logs (organization_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Imports
-- ---------------------------------------------------------------------------
create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  file_name text not null,
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  delimiter text,
  encoding text,
  mapping jsonb not null default '{}'::jsonb,
  total_rows integer not null default 0,
  imported_rows integer not null default 0,
  skipped_rows integer not null default 0,
  error_rows integer not null default 0,
  created_customers integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index import_jobs_org_idx on public.import_jobs (organization_id, created_at desc);

alter table public.quotes
  add constraint quotes_import_job_fk foreign key (import_job_id) references public.import_jobs (id) on delete set null;

create table public.import_rows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  import_job_id uuid not null references public.import_jobs (id) on delete cascade,
  row_number integer not null,
  status text not null check (status in ('imported', 'skipped_duplicate', 'error')),
  quote_id uuid references public.quotes (id) on delete set null,
  raw jsonb not null default '{}'::jsonb,
  errors text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index import_rows_job_idx on public.import_rows (import_job_id, row_number);

-- ---------------------------------------------------------------------------
-- Intégrations (configuration email par entreprise, sans secret)
-- ---------------------------------------------------------------------------
create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  provider text not null check (provider in ('resend')),
  enabled boolean not null default false,
  from_name text,
  reply_to_email text,
  verification_token_hash text,
  verification_sent_at timestamptz,
  verified_at timestamptz,
  signature text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider)
);

-- ---------------------------------------------------------------------------
-- Rate limiting (fenêtre fixe, accès service uniquement)
-- ---------------------------------------------------------------------------
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

create or replace function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count integer;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning count into v_count;
  delete from public.rate_limits where window_start < now() - interval '1 day';
  return v_count <= p_max;
end;
$$;
revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Triggers updated_at
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'organizations', 'profiles', 'organization_members', 'organization_invitations', 'customers',
    'quotes', 'quote_attachments', 'followup_policies', 'followup_templates', 'followup_jobs',
    'communication_events', 'activity_events', 'notifications', 'audit_logs', 'import_jobs',
    'import_rows', 'integrations'
  ] loop
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Cohérence métier
-- ---------------------------------------------------------------------------

-- Normalisation du téléphone (format national français, chiffres uniquement)
create or replace function public.normalize_phone(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p is null or regexp_replace(p, '\D', '', 'g') = '' then null
    when regexp_replace(p, '\D', '', 'g') ~ '^33[1-9][0-9]{8}$' then '0' || substr(regexp_replace(p, '\D', '', 'g'), 3)
    when regexp_replace(p, '\D', '', 'g') ~ '^330[1-9][0-9]{8}$' then substr(regexp_replace(p, '\D', '', 'g'), 3)
    when regexp_replace(p, '\D', '', 'g') ~ '^0033[1-9][0-9]{8}$' then '0' || substr(regexp_replace(p, '\D', '', 'g'), 5)
    else regexp_replace(p, '\D', '', 'g')
  end;
$$;

create or replace function public.customers_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.phone_normalized := public.normalize_phone(new.phone);
  if new.do_not_contact and (tg_op = 'INSERT' or not old.do_not_contact) then
    new.do_not_contact_at := now();
  elsif not new.do_not_contact then
    new.do_not_contact_at := null;
  end if;
  return new;
end;
$$;
create trigger customers_before_write before insert or update on public.customers
  for each row execute function public.customers_before_write();

-- Opposition au contact : suspension immédiate de toutes les relances du client
create or replace function public.customers_after_opt_out()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.do_not_contact and not old.do_not_contact then
    update public.followup_jobs j
       set status = 'cancelled', cancelled_reason = 'opposition_client'
      from public.quotes q
     where q.id = j.quote_id and q.customer_id = new.id
       and j.status in ('scheduled', 'to_prepare', 'pending_approval', 'approved', 'failed');
    update public.quotes
       set followups_paused = true, followups_paused_reason = 'opposition_client', next_followup_at = null
     where customer_id = new.id;
  end if;
  return new;
end;
$$;
create trigger customers_after_opt_out after update of do_not_contact on public.customers
  for each row execute function public.customers_after_opt_out();

-- Un devis clôturé, en attente de décision, brouillon ou suspendu n'a pas de prochaine relance.
create or replace function public.quotes_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('draft', 'pending', 'accepted', 'declined', 'expired', 'cancelled') or new.followups_paused then
    new.next_followup_at := null;
  end if;
  if new.status = 'accepted' and new.accepted_at is null then
    new.accepted_at := now();
  end if;
  if new.status = 'declined' and new.declined_at is null then
    new.declined_at := now();
  end if;
  if new.status not in ('declined', 'cancelled', 'expired') then
    new.lost_reason := null;
    new.lost_reason_details := null;
  end if;
  if new.status <> 'accepted' then
    new.accepted_at := null;
  end if;
  if new.status <> 'declined' then
    new.declined_at := null;
  end if;
  return new;
end;
$$;
create trigger quotes_before_write before insert or update on public.quotes
  for each row execute function public.quotes_before_write();

-- Arrêt des relances : toute relance ouverte est annulée lorsque le devis sort du cycle de relance.
create or replace function public.quotes_after_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('draft', 'pending', 'accepted', 'declined', 'expired', 'cancelled') or new.followups_paused then
    update public.followup_jobs
       set status = 'cancelled',
           cancelled_reason = case
             when new.followups_paused and new.status not in ('accepted', 'declined', 'expired', 'cancelled', 'pending', 'draft')
               then coalesce(new.followups_paused_reason, 'suspendu')
             else 'devis_' || new.status
           end
     where quote_id = new.id
       and status in ('scheduled', 'to_prepare', 'pending_approval', 'approved', 'failed');
  end if;
  return new;
end;
$$;
create trigger quotes_after_status_change after insert or update of status, followups_paused on public.quotes
  for each row execute function public.quotes_after_status_change();

-- Empêche toute relance d'être programmée sur un devis hors cycle.
create or replace function public.followup_jobs_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  q record;
  demo boolean;
begin
  select status, followups_paused, organization_id into q from public.quotes where id = new.quote_id;
  if q.organization_id <> new.organization_id then
    raise exception 'Organisation incohérente';
  end if;
  if new.status in ('scheduled', 'to_prepare', 'pending_approval', 'approved', 'sending')
     and (q.status not in ('sent', 'to_follow_up', 'followed_up') or q.followups_paused) then
    raise exception 'Le devis n''est plus dans un cycle de relance (statut %)', q.status
      using errcode = 'check_violation';
  end if;
  if new.status = 'sending' and new.channel = 'email' then
    select is_demo into demo from public.organizations where id = new.organization_id;
    if demo then
      raise exception 'Envoi réel interdit en mode démonstration' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;
create trigger followup_jobs_guard before insert or update of status on public.followup_jobs
  for each row execute function public.followup_jobs_guard();

-- Le dernier propriétaire d'une organisation ne peut pas être retiré ni rétrogradé.
create or replace function public.organization_members_protect_last_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  remaining integer;
  org_exists boolean;
begin
  if (tg_op = 'DELETE' and old.role = 'owner') or (tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner') then
    select exists (select 1 from public.organizations where id = old.organization_id) into org_exists;
    if not org_exists then
      return coalesce(new, old);
    end if;
    select count(*) into remaining from public.organization_members
      where organization_id = old.organization_id and role = 'owner' and id <> old.id;
    if remaining = 0 then
      raise exception 'Une entreprise doit conserver au moins un propriétaire' using errcode = 'check_violation';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;
create trigger organization_members_protect_last_owner before update or delete on public.organization_members
  for each row execute function public.organization_members_protect_last_owner();

-- ---------------------------------------------------------------------------
-- Création du profil à l'inscription
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- Création d'une organisation (atomique) : membre owner, politique, modèles
-- ---------------------------------------------------------------------------
create or replace function public.seed_organization_defaults(p_org uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.followup_policies (organization_id) values (p_org)
  on conflict (organization_id) do nothing;

  if not exists (select 1 from public.followup_templates where organization_id = p_org) then
    insert into public.followup_templates (organization_id, kind, name, subject, body) values
    (p_org, 'first', 'Première relance douce',
     'Votre devis {quote_reference} — {quote_title}',
     E'Bonjour {client_name},\n\nJe me permets de revenir vers vous au sujet du devis {quote_reference} pour « {quote_title} », d''un montant de {quote_amount}, que nous vous avons transmis le {quote_date}.\n\nAvez-vous pu en prendre connaissance ? Je reste à votre disposition pour répondre à vos questions ou ajuster la proposition si besoin.\n\nBien cordialement,\n{company_name}'),
    (p_org, 'second', 'Deuxième relance',
     'Suite à notre devis {quote_reference}',
     E'Bonjour {client_name},\n\nJe reviens vers vous concernant notre devis {quote_reference} pour « {quote_title} ».\n\nSi vous avez des interrogations sur la solution proposée, le déroulement de l''intervention ou le montant, je peux vous rappeler au moment qui vous convient.\n\nPouvez-vous me dire où en est votre réflexion ?\n\nBien cordialement,\n{company_name}'),
    (p_org, 'last', 'Dernière relance',
     'Dernier suivi de votre devis {quote_reference}',
     E'Bonjour {client_name},\n\nSans retour de votre part, je me permets un dernier message au sujet du devis {quote_reference} pour « {quote_title} ».\n\nSi votre projet a évolué ou a été reporté, un simple mot de votre part me permettra de mettre à jour notre suivi. Je ne vous relancerai plus ensuite.\n\nBien cordialement,\n{company_name}'),
    (p_org, 'confirmation', 'Demande de confirmation',
     'Confirmation de votre projet — devis {quote_reference}',
     E'Bonjour {client_name},\n\nPouvez-vous me confirmer si vous souhaitez donner suite au devis {quote_reference} pour « {quote_title} » ({quote_amount}) ?\n\nLe devis est valable jusqu''au {expiration_date}. Dès votre accord, nous pourrons convenir ensemble d''une date d''intervention.\n\nBien cordialement,\n{company_name}'),
    (p_org, 'custom', 'Message personnalisé',
     'Votre devis {quote_reference}',
     E'Bonjour {client_name},\n\n\n\nBien cordialement,\n{company_name}');
  end if;

  insert into public.integrations (organization_id, provider) values (p_org, 'resend')
  on conflict (organization_id, provider) do nothing;
end;
$$;
revoke all on function public.seed_organization_defaults(uuid) from public, anon, authenticated;

create or replace function public.create_organization(
  p_name text,
  p_trades text[] default '{}',
  p_phone text default null,
  p_email text default null,
  p_city text default null,
  p_siret text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_org uuid;
begin
  if v_user is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;
  insert into public.organizations (name, trades, phone, email, city, siret, created_by, onboarding_step)
  values (trim(p_name), coalesce(p_trades, '{}'), nullif(trim(p_phone), ''), nullif(trim(p_email), ''),
          nullif(trim(p_city), ''), nullif(regexp_replace(coalesce(p_siret, ''), '\s', '', 'g'), ''), v_user, 2)
  returning id into v_org;
  insert into public.organization_members (organization_id, user_id, role) values (v_org, v_user, 'owner');
  perform public.seed_organization_defaults(v_org);
  update public.profiles set current_organization_id = v_org where id = v_user;
  return v_org;
end;
$$;
revoke all on function public.create_organization(text, text[], text, text, text, text) from public, anon;
grant execute on function public.create_organization(text, text[], text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.customers enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_attachments enable row level security;
alter table public.followup_policies enable row level security;
alter table public.followup_templates enable row level security;
alter table public.followup_jobs enable row level security;
alter table public.communication_events enable row level security;
alter table public.activity_events enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.import_jobs enable row level security;
alter table public.import_rows enable row level security;
alter table public.integrations enable row level security;
alter table public.rate_limits enable row level security;

-- organizations
create policy "org_select_members" on public.organizations for select to authenticated
  using (public.is_org_member(id));
create policy "org_update_admins" on public.organizations for update to authenticated
  using (public.has_org_role(id, array['owner', 'admin']))
  with check (public.has_org_role(id, array['owner', 'admin']));
create policy "org_delete_owner" on public.organizations for delete to authenticated
  using (public.has_org_role(id, array['owner']));

-- profiles : soi-même + collègues (lecture)
create policy "profiles_select_self_or_colleague" on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1 from public.organization_members m1
      join public.organization_members m2 on m1.organization_id = m2.organization_id
      where m1.user_id = (select auth.uid()) and m2.user_id = profiles.id
    )
  );
create policy "profiles_update_self" on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and (current_organization_id is null or public.is_org_member(current_organization_id))
  );

-- organization_members
create policy "members_select" on public.organization_members for select to authenticated
  using (public.is_org_member(organization_id));
create policy "members_insert_admins" on public.organization_members for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner', 'admin']) and role <> 'owner'
              or public.has_org_role(organization_id, array['owner']));
create policy "members_update_admins" on public.organization_members for update to authenticated
  using (public.has_org_role(organization_id, array['owner', 'admin']))
  with check (public.has_org_role(organization_id, array['owner']) or role <> 'owner');
create policy "members_delete_admins_or_self" on public.organization_members for delete to authenticated
  using (public.has_org_role(organization_id, array['owner', 'admin']) or user_id = (select auth.uid()));

-- invitations
create policy "invitations_admins" on public.organization_invitations for all to authenticated
  using (public.has_org_role(organization_id, array['owner', 'admin']))
  with check (public.has_org_role(organization_id, array['owner', 'admin']));

-- Tables métier : lecture/écriture pour les membres, suppression pour owner/admin
do $$
declare t text;
begin
  foreach t in array array['customers', 'quotes'] loop
    execute format('create policy "%1$s_select" on public.%1$I for select to authenticated using (public.is_org_member(organization_id))', t);
    execute format('create policy "%1$s_insert" on public.%1$I for insert to authenticated with check (public.is_org_member(organization_id))', t);
    execute format('create policy "%1$s_update" on public.%1$I for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id))', t);
    execute format('create policy "%1$s_delete" on public.%1$I for delete to authenticated using (public.has_org_role(organization_id, array[''owner'', ''admin'']))', t);
  end loop;
  foreach t in array array['quote_attachments', 'followup_jobs', 'communication_events', 'import_jobs', 'import_rows'] loop
    execute format('create policy "%1$s_select" on public.%1$I for select to authenticated using (public.is_org_member(organization_id))', t);
    execute format('create policy "%1$s_insert" on public.%1$I for insert to authenticated with check (public.is_org_member(organization_id))', t);
    execute format('create policy "%1$s_update" on public.%1$I for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id))', t);
    execute format('create policy "%1$s_delete" on public.%1$I for delete to authenticated using (public.is_org_member(organization_id))', t);
  end loop;
end $$;

-- Politique & modèles : lecture membres, écriture owner/admin
create policy "policies_select" on public.followup_policies for select to authenticated
  using (public.is_org_member(organization_id));
create policy "policies_write" on public.followup_policies for update to authenticated
  using (public.has_org_role(organization_id, array['owner', 'admin']))
  with check (public.has_org_role(organization_id, array['owner', 'admin']));
create policy "templates_select" on public.followup_templates for select to authenticated
  using (public.is_org_member(organization_id));
create policy "templates_insert" on public.followup_templates for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner', 'admin']));
create policy "templates_update" on public.followup_templates for update to authenticated
  using (public.has_org_role(organization_id, array['owner', 'admin']))
  with check (public.has_org_role(organization_id, array['owner', 'admin']));
create policy "templates_delete" on public.followup_templates for delete to authenticated
  using (public.has_org_role(organization_id, array['owner', 'admin']));

-- Intégrations : lecture membres (aucun secret stocké), écriture owner/admin
create policy "integrations_select" on public.integrations for select to authenticated
  using (public.is_org_member(organization_id));
create policy "integrations_update" on public.integrations for update to authenticated
  using (public.has_org_role(organization_id, array['owner', 'admin']))
  with check (public.has_org_role(organization_id, array['owner', 'admin']));

-- Activité : append-only pour les membres
create policy "activity_select" on public.activity_events for select to authenticated
  using (public.is_org_member(organization_id));
create policy "activity_insert" on public.activity_events for insert to authenticated
  with check (public.is_org_member(organization_id) and (actor_id is null or actor_id = (select auth.uid())));

-- Notifications : chacun ses notifications ; un membre peut notifier un collègue
create policy "notifications_select_own" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()) and public.is_org_member(organization_id));
create policy "notifications_update_own" on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "notifications_delete_own" on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));
create policy "notifications_insert_colleague" on public.notifications for insert to authenticated
  with check (
    public.is_org_member(organization_id)
    and exists (select 1 from public.organization_members m where m.organization_id = notifications.organization_id and m.user_id = notifications.user_id)
  );

-- Audit : lecture owner/admin, insertion par l'acteur, jamais de modification
create policy "audit_select_admins" on public.audit_logs for select to authenticated
  using (public.has_org_role(organization_id, array['owner', 'admin']));
create policy "audit_insert_actor" on public.audit_logs for insert to authenticated
  with check (actor_id = (select auth.uid()) and (organization_id is null or public.is_org_member(organization_id)));

-- rate_limits : aucune politique => inaccessible hors service_role / security definer
