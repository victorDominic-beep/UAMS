# UAMS Phase 6: Inscription, SIV and Initial Custody

## Workflows and state transitions

Assets created by approved SRVs remain `PENDING_INSCRIPTION`. A Works Inspection Officer confirms the PAIN physically observed on the tag against the registered PAIN; the confirmation moves the asset to `IN_STORE`. The current schema has no dedicated inscription evidence fields, so the authenticated event, PAIN and transition are recorded in the existing audit chain.

A Store Officer creates one draft SIV for one `IN_STORE` asset and a valid destination department. SIVs use `SIV/FUN/YYYY/XXXXX`. A different Store Officer approves the draft. Creation records the issue date; approval locks it. Issuance itself leaves the asset in `IN_STORE`.

The assigned Departmental Custodian lists approved SIVs pending receipt and confirms receipt while authenticated. The sign-off records the custodian identity and timestamp. Receipt, initial custody transfer creation and transition to `IN_SERVICE` happen in one transaction. The asset department and location are updated to the destination; the custody transfer captures the previous and destination departments and locations.

## API

- `GET /api/assets/:id` retrieves an asset by UUID or PAIN.
- `POST /api/assets/:id/inscription/confirm` with `{ "painCode": "..." }` confirms tag inscription.
- `POST /api/siv` with `{ "assetId": "...", "targetDepartmentId": "...", "issueDate": "..." }` creates a draft SIV.
- `GET /api/siv` and `GET /api/siv/:id` list or retrieve SIVs. Custodian reads are restricted to their department.
- `POST /api/siv/:id/approve` approves a draft SIV.
- `GET /api/siv/pending-receipt` lists approved vouchers for the custodian's department.
- `POST /api/siv/:id/confirm-receipt` records authenticated custodian sign-off.

## Roles and audit

Store Officers create SIVs and a different Store Officer approves. Works Inspection Officers confirm inscription. Departmental Custodians view their department's incoming SIVs and confirm receipt. Existing permission middleware restricts those operations; system administrators have no operational permissions. Audit events use the Phase 4 hash-chained service for inscription, SIV creation/approval, receipt, asset transitions, custody creation and denied role attempts.

## Data integrity and limitations

SIV numbers use the existing `IdentifierCounter`, a transaction advisory lock for first-row/year serialization, a row lock on existing counters and the database unique constraint on voucher number. The schema's unique `assetId` prevents duplicate SIVs. Asset and SIV rows are locked during their state-sensitive transactions. No migration was needed because the existing schema already contains the required fields and constraints. Audit records are written through the existing post-transaction audit service, whose existing implementation treats audit failures as best effort.

No drawn signature, physical scanner or printer is integrated. The sign-off is authenticated digital attribution. The referenced UAMS System Design Document was not present in this workspace; approval permissions follow the existing Phase 3/role implementation and the supplied Phase 6 instructions. Destructive concurrency and rollback integration tests require a configured isolated PostgreSQL database.
