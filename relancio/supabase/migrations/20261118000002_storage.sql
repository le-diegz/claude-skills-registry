-- Stockage privé des pièces jointes de devis.
-- Chemin : {organization_id}/{quote_id}/{uuid}-{nom}. Accès uniquement via URLs signées.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quote-attachments',
  'quote-attachments',
  false,
  10485760,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.ms-excel'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "attachments_select_members" on storage.objects for select to authenticated
  using (bucket_id = 'quote-attachments' and public.is_org_member(((storage.foldername(name))[1])::uuid));

create policy "attachments_insert_members" on storage.objects for insert to authenticated
  with check (bucket_id = 'quote-attachments' and public.is_org_member(((storage.foldername(name))[1])::uuid));

create policy "attachments_delete_members" on storage.objects for delete to authenticated
  using (bucket_id = 'quote-attachments' and public.is_org_member(((storage.foldername(name))[1])::uuid));
