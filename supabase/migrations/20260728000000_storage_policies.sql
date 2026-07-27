-- ─── STORAGE POLICIES ────────────────────────────────────────────────────────
-- These policies were previously managed only in the Supabase Dashboard.
-- Adding them here so storage access is version-controlled.

-- ─── employee-docs bucket ────────────────────────────────────────────────────
-- Public employee form (anonymous) uploads documents
CREATE POLICY "employee_docs_insert_anon"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'employee-docs');

-- Authenticated users (HR, BGV, admin) can read employee documents
CREATE POLICY "employee_docs_select_auth"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'employee-docs'
    AND auth.role() = 'authenticated'
  );

-- ─── reports bucket ──────────────────────────────────────────────────────────
-- BGV team and admin can upload reports
CREATE POLICY "reports_insert_bgv_admin"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'reports'
    AND get_user_role() IN ('bgv_team', 'admin')
  );

-- HR, BGV, and admin can read reports
CREATE POLICY "reports_select_hr_bgv_admin"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'reports'
    AND get_user_role() IN ('hr', 'bgv_team', 'admin')
  );
