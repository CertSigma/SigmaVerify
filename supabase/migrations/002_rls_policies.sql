-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ─── HELPER FUNCTION ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── PROFILES ─────────────────────────────────────────────────────────────────
-- Users can read their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Admin can read all profiles
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT USING (get_user_role() = 'admin');

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Admin can update any profile (for subscription status changes)
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (get_user_role() = 'admin');

-- Profile is created via trigger, allow insert for the trigger
CREATE POLICY "profiles_insert_trigger" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- ─── EMPLOYEES ────────────────────────────────────────────────────────────────
-- HR can see their own employees
CREATE POLICY "employees_select_hr" ON employees
  FOR SELECT USING (hr_id = auth.uid());

-- BGV team can see employees with status docs_submitted or later
CREATE POLICY "employees_select_bgv" ON employees
  FOR SELECT USING (
    get_user_role() = 'bgv_team'
    AND status IN ('docs_submitted', 'under_review', 'completed', 'failed')
  );

-- Admin can see all employees
CREATE POLICY "employees_select_admin" ON employees
  FOR SELECT USING (get_user_role() = 'admin');

-- HR can insert employees
CREATE POLICY "employees_insert_hr" ON employees
  FOR INSERT WITH CHECK (hr_id = auth.uid() AND get_user_role() = 'hr');

-- HR can update their own employees (limited fields)
CREATE POLICY "employees_update_hr" ON employees
  FOR UPDATE USING (hr_id = auth.uid());

-- BGV team can update employee status
CREATE POLICY "employees_update_bgv" ON employees
  FOR UPDATE USING (get_user_role() = 'bgv_team');

-- Admin can update any employee
CREATE POLICY "employees_update_admin" ON employees
  FOR UPDATE USING (get_user_role() = 'admin');

-- Public access via invite token (for the employee form - anon role)
-- This is handled at the service level with a stored procedure

-- ─── EMPLOYEE DOCUMENTS ───────────────────────────────────────────────────────
-- HR can see documents for their employees
CREATE POLICY "employee_documents_select_hr" ON employee_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = employee_documents.employee_id AND e.hr_id = auth.uid()
    )
  );

-- BGV team can see documents for employees under review
CREATE POLICY "employee_documents_select_bgv" ON employee_documents
  FOR SELECT USING (
    get_user_role() = 'bgv_team'
    AND EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = employee_documents.employee_id
        AND e.status IN ('docs_submitted', 'under_review', 'completed', 'failed')
    )
  );

-- Admin can see all documents
CREATE POLICY "employee_documents_select_admin" ON employee_documents
  FOR SELECT USING (get_user_role() = 'admin');

-- Allow anon inserts (employee form uses invite token, no auth)
CREATE POLICY "employee_documents_insert_anon" ON employee_documents
  FOR INSERT WITH CHECK (true);

-- ─── VERIFICATIONS ────────────────────────────────────────────────────────────
-- HR can see verifications for their employees
CREATE POLICY "verifications_select_hr" ON verifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = verifications.employee_id AND e.hr_id = auth.uid()
    )
  );

-- BGV team can see and update verifications
CREATE POLICY "verifications_select_bgv" ON verifications
  FOR SELECT USING (get_user_role() = 'bgv_team');

-- Admin can see all
CREATE POLICY "verifications_select_admin" ON verifications
  FOR SELECT USING (get_user_role() = 'admin');

-- BGV team can insert verifications
CREATE POLICY "verifications_insert_bgv" ON verifications
  FOR INSERT WITH CHECK (get_user_role() = 'bgv_team');

-- Allow anon inserts (employee form creates pending verifications)
CREATE POLICY "verifications_insert_anon" ON verifications
  FOR INSERT WITH CHECK (true);

-- BGV team can update verifications
CREATE POLICY "verifications_update_bgv" ON verifications
  FOR UPDATE USING (get_user_role() = 'bgv_team');

-- Admin can update all
CREATE POLICY "verifications_update_admin" ON verifications
  FOR UPDATE USING (get_user_role() = 'admin');

-- ─── REPORTS ──────────────────────────────────────────────────────────────────
-- HR can see reports for their employees
CREATE POLICY "reports_select_hr" ON reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = reports.employee_id AND e.hr_id = auth.uid()
    )
  );

-- BGV team can see and create reports
CREATE POLICY "reports_select_bgv" ON reports
  FOR SELECT USING (get_user_role() = 'bgv_team');

CREATE POLICY "reports_insert_bgv" ON reports
  FOR INSERT WITH CHECK (get_user_role() = 'bgv_team');

CREATE POLICY "reports_update_bgv" ON reports
  FOR UPDATE USING (get_user_role() = 'bgv_team');

-- Admin can see all
CREATE POLICY "reports_select_admin" ON reports
  FOR SELECT USING (get_user_role() = 'admin');

-- ─── AUDIT LOGS ───────────────────────────────────────────────────────────────
-- Admin can see all audit logs
CREATE POLICY "audit_logs_select_admin" ON audit_logs
  FOR SELECT USING (get_user_role() = 'admin');

-- Any authenticated user can insert audit logs
CREATE POLICY "audit_logs_insert_auth" ON audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ─── STORAGE BUCKETS ──────────────────────────────────────────────────────────
-- Run in Supabase Dashboard > Storage:
-- 1. Create bucket: employee-docs (private)
-- 2. Create bucket: reports (private)
-- Storage policies are managed separately in Supabase Dashboard

-- ─── PUBLIC FUNCTION FOR EMPLOYEE FORM (bypasses RLS) ─────────────────────────
-- Used by the employee public form to validate token and submit documents
CREATE OR REPLACE FUNCTION get_employee_by_token(p_token UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  status employee_status
) AS $$
  SELECT id, full_name, email, phone, status
  FROM employees
  WHERE invite_token = p_token;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION submit_employee_documents(
  p_token UUID,
  p_documents JSONB
) RETURNS JSONB AS $$
DECLARE
  v_employee_id UUID;
  v_status employee_status;
  v_doc JSONB;
BEGIN
  SELECT id, status INTO v_employee_id, v_status
  FROM employees
  WHERE invite_token = p_token;

  IF v_employee_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid token');
  END IF;

  IF v_status != 'invited' THEN
    RETURN jsonb_build_object('error', 'Already submitted');
  END IF;

  -- Insert documents
  FOR v_doc IN SELECT * FROM jsonb_array_elements(p_documents)
  LOOP
    INSERT INTO employee_documents (employee_id, doc_type, file_path)
    VALUES (
      v_employee_id,
      (v_doc->>'doc_type')::doc_type,
      v_doc->>'file_path'
    )
    ON CONFLICT (employee_id, doc_type) DO UPDATE
      SET file_path = EXCLUDED.file_path, uploaded_at = NOW();
  END LOOP;

  -- Create verification rows
  INSERT INTO verifications (employee_id, doc_type, status)
  VALUES
    (v_employee_id, 'pan', 'pending'),
    (v_employee_id, 'aadhaar_court', 'pending'),
    (v_employee_id, 'aadhaar_address', 'pending'),
    (v_employee_id, 'experience_letter', 'pending'),
    (v_employee_id, 'education_certificate', 'pending')
  ON CONFLICT (employee_id, doc_type) DO NOTHING;

  -- Update employee status
  UPDATE employees
  SET status = 'docs_submitted', submitted_at = NOW()
  WHERE id = v_employee_id;

  RETURN jsonb_build_object('success', true, 'employee_id', v_employee_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
