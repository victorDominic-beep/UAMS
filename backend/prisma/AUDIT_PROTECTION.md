# UAMS audit trail and protection

## Hash-chain implementation

The audit service serializes writes through a PostgreSQL advisory transaction lock and creates each row inside a serializable Prisma transaction.

Each hash covers:

- timestamp
- user ID
- IP address
- action type
- entity name
- entity ID
- sanitized change details
- previous row hash

Sensitive delta keys such as passwords, hashes, tokens, authorization values and secrets are removed before hash and audit storage.

## Active database protection

Migration `20261118050000_audit_append_only` installs PostgreSQL triggers that reject:

- UPDATE on `AuditTrail`
- DELETE on `AuditTrail`

Both protections were verified against a real audit row: mutation attempts were rejected and the row remained unchanged.

## Not active without manual database configuration

TRUNCATE protection is not active through normal row triggers. A database-owner must configure table privileges or an event trigger so the application and ordinary database roles cannot truncate `AuditTrail`.

Hash-chain verification is application-verifiable but is not cryptographically anchored outside the database. It should be used alongside backup and database audit controls.

## Audit API

- `GET /api/audit`
- `GET /api/audit/:id`

Only Internal Auditor, Bursar and Vice-Chancellor roles may access these routes.

No POST, PATCH, PUT or DELETE audit routes are implemented.

## Usage

Call `recordAudit` from authenticated services with:

- userId
- ipAddress
- actionType
- entityName
- entityId
- meaningful before/after delta details

Call `verifyAuditChain` to confirm row hash and `prevHash` linkage.

## Implemented in Prisma migration

- `AuditTrail.prevHash` stores the previous audit row hash.
- `AuditTrail.rowHash` stores the current row hash.
- `AuditTrail.timestamp`, user, IP, action, entity, delta and hash fields are modeled.
- Audit rows are related to users with `ON DELETE SET NULL` to preserve audit identity where possible.

## Not yet implemented or active

The following protections are not claimed as active:

1. PostgreSQL trigger functions that prevent UPDATE or DELETE on `AuditTrail`.
2. PostgreSQL trigger or rule protection against TRUNCATE on `AuditTrail`.
3. Database role permissions that deny mutation access outside an authorized audit-writer role.
4. Hash chain computation and hash verification logic.

The service layer must create audit rows and must never update or delete them. Hash chaining belongs in the future audit service and must be implemented with a transaction that obtains the previous row hash and writes the next row atomically.

## Required implementation before enforcement claim

A controlled SQL migration must add:

- An append-only trigger that rejects UPDATE and DELETE on `AuditTrail`.
- Separate DELETE/TRUNCATE protection through table permissions or an event trigger; PostgreSQL does not provide a normal row trigger for TRUNCATE.
- Verification of trigger behavior in a dedicated database session.
- Verification that the application database role cannot bypass the protection outside its intended append-only role.

These SQL objects must be reviewed and applied after database roles and application credentials are finalized.
