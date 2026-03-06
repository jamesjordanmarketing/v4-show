/**
 * Identity Spine — Phase 7: RLS for documents table
 *
 * Note: RLS for notifications, cost_records, metrics_points was already applied in E03 (Phase 5).
 */

const PHASE7_RLS_SQL = `
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_select_own" ON documents FOR SELECT
  USING (COALESCE(user_id, author_id) = auth.uid());

CREATE POLICY "documents_insert_own" ON documents FOR INSERT
  WITH CHECK (COALESCE(user_id, author_id) = auth.uid());

CREATE POLICY "documents_update_own" ON documents FOR UPDATE
  USING (COALESCE(user_id, author_id) = auth.uid());

CREATE POLICY "documents_delete_own" ON documents FOR DELETE
  USING (COALESCE(user_id, author_id) = auth.uid());

CREATE POLICY "documents_service_all" ON documents FOR ALL
  USING (auth.role() = 'service_role');
`;

export default PHASE7_RLS_SQL;
