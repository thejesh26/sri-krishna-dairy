-- The delivery-agent-docs bucket has RLS enabled on storage.objects (Supabase default) but
-- had ZERO policies defined — meaning every client-side upload AND read has been silently
-- denied since launch. Confirmed: storage.objects has 0 rows for this bucket, and
-- orders.photo_url / subscription_deliveries.photo_url / delivery_agents.photo_url /
-- delivery_agents.document_url are null on every row. This affects delivery-confirmation
-- photos (uploaded by delivery agents) and agent onboarding photo/ID documents (uploaded by
-- admin) — both currently silently fail (the admin upload code doesn't even surface the
-- error today).

-- The app reads these via getPublicUrl() + plain <img src> (no auth header attached), which
-- only works against a public bucket — a private bucket with a SELECT policy would still be
-- unreachable from a plain <img> tag. Make the bucket public, matching the existing 'reviews'
-- bucket's pattern (unguessable path names — phone/subscription id + millisecond timestamp —
-- provide practical obscurity, consistent with how this app already handles the 'reviews' bucket).
update storage.buckets set public = true where id = 'delivery-agent-docs';

-- INSERT: only delivery agents or admins may upload (matches app-level requireDelivery/requireAdmin).
create policy "Delivery agents and admins upload docs"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'delivery-agent-docs'
    and (
      public.is_admin_user()
      or exists (select 1 from profiles where id = auth.uid() and is_delivery = true)
    )
  );

-- UPDATE: same authorization, needed for upsert:true re-uploads to succeed on a path collision.
create policy "Delivery agents and admins update docs"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'delivery-agent-docs'
    and (
      public.is_admin_user()
      or exists (select 1 from profiles where id = auth.uid() and is_delivery = true)
    )
  )
  with check (
    bucket_id = 'delivery-agent-docs'
    and (
      public.is_admin_user()
      or exists (select 1 from profiles where id = auth.uid() and is_delivery = true)
    )
  );

-- SELECT: public read, since the bucket is now public and the app relies on plain public URLs.
create policy "Public read delivery agent docs"
  on storage.objects for select
  using (bucket_id = 'delivery-agent-docs');

-- reviews bucket: had an INSERT policy but no UPDATE policy, so an upsert:true re-upload that
-- collides with an existing path (same user, same millisecond — unlikely but not impossible)
-- would fail. Add the missing UPDATE policy to match the existing INSERT policy exactly.
create policy "Users update own review photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'reviews' and name like (auth.uid())::text || '_%')
  with check (bucket_id = 'reviews' and name like (auth.uid())::text || '_%');
