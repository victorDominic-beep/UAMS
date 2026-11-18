# Phase 9: Survey, Dual Write-Off and Disposal

## Survey

Board of Survey Members create/list/read dockets at `/api/survey/dockets`, add assets with `POST /api/survey/dockets/:id/items`, and rate items at `POST /api/survey/items/:id/assessment`. Only `UNSERVICEABLE` assets may enter a draft docket; adding one atomically changes its state to `UNDER_SURVEY` and creates its pending write-off authorization. Ratings and reserve values are retained on the survey item.

Departmental Custodians may report an in-service asset unserviceable at `/api/assets/:id/report-unserviceable`, with a reason and audit event. Survey endpoints cannot directly set arbitrary asset states.

## Write-off

The docket item initializes a `WriteOffAuthorization`. Bursar and Vice-Chancellor decisions are separate endpoints under `/api/survey/items/:id/approvals/`. Each route requires its exact existing role and permission. A decision is recorded once; rejected authorization cannot proceed. The same user cannot satisfy both approvals. Only the transaction that records the second distinct approval changes the asset from `UNDER_SURVEY` to `WRITTEN_OFF`. Authorization history is available at `/api/survey/items/:id/authorization` and within docket details.

## Disposal

The Bursary Asset Accountant records disposal using `POST /api/disposals`; history is available at `GET /api/disposals`. Only `WRITTEN_OFF` assets can be disposed. The atomic transaction captures proceeds, NBV at disposal and decimal gain/loss (`proceeds - NBV`), inserts the unique disposal record and changes the asset to `DISPOSED`. No external auction or FMIS integration is connected.

## Physical verification

Internal Auditors record verifications at `POST /api/verification`. `GET /api/verification` supports asset/outcome filters and pagination. Verification creates a history record only; it cannot change asset status or financial values.

All operational writes use existing models and audit service. No Phase 9 schema migration was needed.
