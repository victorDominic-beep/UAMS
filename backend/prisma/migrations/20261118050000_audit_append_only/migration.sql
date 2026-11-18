CREATE OR REPLACE FUNCTION prevent_audittrail_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'AuditTrail rows are append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audittrail_prevent_update ON "AuditTrail";
CREATE TRIGGER audittrail_prevent_update
BEFORE UPDATE ON "AuditTrail"
FOR EACH ROW EXECUTE FUNCTION prevent_audittrail_modification();

DROP TRIGGER IF EXISTS audittrail_prevent_delete ON "AuditTrail";
CREATE TRIGGER audittrail_prevent_delete
BEFORE DELETE ON "AuditTrail"
FOR EACH ROW EXECUTE FUNCTION prevent_audittrail_modification();
