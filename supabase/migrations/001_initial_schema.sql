-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── PROFILES ─────────────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('hr', 'admin', 'bgv_team');
CREATE TYPE subscription_status AS ENUM ('pending', 'active', 'suspended');

CREATE TABLE profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           TEXT NOT NULL,
  company_name        TEXT,
  role                user_role NOT NULL DEFAULT 'hr',
  subscription_status subscription_status NOT NULL DEFAULT 'pending',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── EMPLOYEES ────────────────────────────────────────────────────────────────
CREATE TYPE employee_status AS ENUM (
  'invited', 'docs_submitted', 'under_review', 'completed', 'failed'
);

CREATE TABLE employees (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hr_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  full_name      TEXT NOT NULL,
  email          TEXT NOT NULL,
  phone          TEXT,
  status         employee_status NOT NULL DEFAULT 'invited',
  invite_token   UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
  invite_sent_at TIMESTAMPTZ,
  submitted_at   TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employees_hr_id ON employees(hr_id);
CREATE INDEX idx_employees_invite_token ON employees(invite_token);
CREATE INDEX idx_employees_status ON employees(status);

-- ─── EMPLOYEE DOCUMENTS ───────────────────────────────────────────────────────
CREATE TYPE doc_type AS ENUM (
  'pan', 'aadhaar_court', 'aadhaar_address', 'experience_letter', 'education_certificate'
);

CREATE TABLE employee_documents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  doc_type    doc_type NOT NULL,
  file_path   TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, doc_type)
);

CREATE INDEX idx_employee_documents_employee_id ON employee_documents(employee_id);

-- ─── VERIFICATIONS ────────────────────────────────────────────────────────────
CREATE TYPE verification_status AS ENUM (
  'pending', 'in_progress', 'verified', 'failed'
);

CREATE TABLE verifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  doc_type    doc_type NOT NULL,
  status      verification_status NOT NULL DEFAULT 'pending',
  notes       TEXT,
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, doc_type)
);

CREATE INDEX idx_verifications_employee_id ON verifications(employee_id);

-- ─── REPORTS ──────────────────────────────────────────────────────────────────
CREATE TABLE reports (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id         UUID NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
  report_url          TEXT,
  generated_at        TIMESTAMPTZ,
  sent_to_hr_at       TIMESTAMPTZ,
  sent_to_employee_at TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── AUDIT LOGS ───────────────────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID REFERENCES profiles(id),
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ─── UPDATED_AT TRIGGER ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_verifications_updated_at
  BEFORE UPDATE ON verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile when user registers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, company_name, role, subscription_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'hr'),
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
