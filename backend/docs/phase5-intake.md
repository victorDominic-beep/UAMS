# UAMS Phase 5: Asset Intake, SRV and PAIN

## SRV workflow

- Store Officers create SRVs with one or more line items.
- Draft SRVs may be edited by their creator.
- Approval locks the SRV and its line items.
- Approved SRVs cannot be edited or deleted.
- Rejection changes a DRAFT SRV to REJECTED.
- SRV submit is represented as an explicit idempotent service operation; the existing schema has no separate submitted enum, so DRAFT remains the workflow state used for submission and approval.

## Identifier generation

SRV numbers use `SRV/FUN/YYYY/XXXXX` and increment through `IdentifierCounter` using a transaction-level PostgreSQL row/advisory lock.

PAIN numbers use `FUNAAB-[UNIT]-[CATEGORY]-[YEAR]-[XXXXX]`. Counters are unique for prefix, unit, category and year.

Unit codes come from Department codes. Category codes come from AssetCategory codes. Both are normalized to uppercase alphanumeric characters. Missing unit/category information rejects generation.

## Approval and asset creation

SRV approval creates one asset for each physical quantity represented by a line item. Assets are linked to the SRV and begin in `PENDING_INSCRIPTION`.

Historical cost uses the line-item unit cost, salvage value is initialized only by the documented local financial assumption in the implementation, and net book value begins at historical cost. Asset approval and creation are in one Prisma serializable transaction.

Repeated approval calls return the already-approved SRV and do not create extra assets.

## Labels

The label service returns print-ready Code 128 PNG and QR data-URL payloads for the asset PAIN. It does not connect to a physical printer.

## API

- `POST /api/srv`
- `GET /api/srv`
- `GET /api/srv/:id`
- `PATCH /api/srv/:id`
- `POST /api/srv/:id/submit`
- `POST /api/srv/:id/approve`
- `POST /api/srv/:id/reject`
- `POST /api/assets/:id/label`
- `GET /api/assets/:id/label`

Store Officer permissions create and edit SRVs. SRV approval is limited to `srv.approve`; separation of duties prevents the creator from approving. Label retrieval is limited to `label.print`.

## Audit

The audit service records SRV create/update/submit/reject/approve, failed creator approval, PAIN/asset creation, and label generation events.

## Limitations

- No live isolated test database was configured for destructive approval, rollback and concurrent transaction integration tests.
- Unit test coverage exercises identifier formats and label generation.
- No physical printer integration exists.
- Tag inscription and SIV workflows remain outside this phase.
