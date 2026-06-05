ALTER TABLE profiles ADD COLUMN bgv_seats_total INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN bgv_seats_used INT DEFAULT 0;
ALTER TYPE employee_status ADD VALUE 'pending_initiation' BEFORE 'invited';
