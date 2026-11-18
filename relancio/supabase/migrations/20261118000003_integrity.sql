-- Cohérence multi-tenant : une ligne ne peut référencer que des objets de SA propre organisation.
create or replace function public.enforce_same_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  other uuid;
  rec jsonb := to_jsonb(new);
begin
  if tg_table_name = 'quotes' then
    select organization_id into other from public.customers where id = (rec->>'customer_id')::uuid;
    if other is distinct from new.organization_id then
      raise exception 'Client d''une autre organisation' using errcode = '42501';
    end if;
  end if;
  if tg_table_name in ('quote_attachments', 'communication_events', 'activity_events') and rec->>'quote_id' is not null then
    select organization_id into other from public.quotes where id = (rec->>'quote_id')::uuid;
    if other is distinct from new.organization_id then
      raise exception 'Devis d''une autre organisation' using errcode = '42501';
    end if;
  end if;
  if tg_table_name in ('communication_events', 'activity_events') and rec->>'customer_id' is not null then
    select organization_id into other from public.customers where id = (rec->>'customer_id')::uuid;
    if other is distinct from new.organization_id then
      raise exception 'Client d''une autre organisation' using errcode = '42501';
    end if;
  end if;
  if tg_table_name = 'import_rows' then
    select organization_id into other from public.import_jobs where id = (rec->>'import_job_id')::uuid;
    if other is distinct from new.organization_id then
      raise exception 'Import d''une autre organisation' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger quotes_same_org before insert or update of customer_id, organization_id on public.quotes
  for each row execute function public.enforce_same_organization();
create trigger quote_attachments_same_org before insert or update on public.quote_attachments
  for each row execute function public.enforce_same_organization();
create trigger communication_events_same_org before insert or update of quote_id, customer_id, organization_id on public.communication_events
  for each row execute function public.enforce_same_organization();
create trigger activity_events_same_org before insert on public.activity_events
  for each row execute function public.enforce_same_organization();
create trigger import_rows_same_org before insert on public.import_rows
  for each row execute function public.enforce_same_organization();

-- organization_id est immuable sur les tables métier
create or replace function public.prevent_organization_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id then
    raise exception 'organization_id est immuable' using errcode = '42501';
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['customers', 'quotes', 'quote_attachments', 'followup_jobs', 'communication_events', 'activity_events', 'notifications', 'import_jobs', 'import_rows', 'followup_templates', 'followup_policies', 'integrations', 'organization_members', 'organization_invitations'] loop
    execute format('create trigger %I_org_immutable before update of organization_id on public.%I for each row execute function public.prevent_organization_change()', t, t);
  end loop;
end $$;
