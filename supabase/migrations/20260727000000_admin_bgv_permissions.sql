-- Allow admin to insert reports (for generating BGV reports from admin panel)
CREATE POLICY "reports_insert_admin" ON reports
  FOR INSERT WITH CHECK (get_user_role() = 'admin');

-- Allow admin to update reports (for marking sent timestamps after email dispatch)
CREATE POLICY "reports_update_admin" ON reports
  FOR UPDATE USING (get_user_role() = 'admin');
