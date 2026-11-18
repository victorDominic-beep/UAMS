# Phase 8: Depreciation Engine

## Formula and periods

Depreciation is posted monthly at `/api/depreciation/batches` using a required `YYYY-MM` period. The straight-line monthly amount is `(historicalCost - salvageValue) / usefulLifeYears / 12`, rounded to two decimal places with decimal arithmetic. Each charge is clamped to the remaining NBV above salvage. Duplicate asset/period postings are rejected by the existing composite unique constraint and also reported as skipped on rerun.

Only depreciable `IN_SERVICE` assets are considered. Assets without useful life or a known in-service date are skipped with a reason. Phase 8 adds nullable `Asset.inServiceDate`. Migration `20261118170000_phase8_depreciation_start` derives dates only from existing approved custody transfers; it leaves dates unknown where history is absent. New SIV receipt stores the actual receipt date.

## Capital additions

Approved capital additions increment NBV when approved. They are depreciated prospectively from approval over the remaining useful-life months, derived from the actual in-service date and approval date. Historical depreciation entries are not changed. If the remaining life is already exhausted, the addition does not receive depreciation postings; such additions should be reviewed before approval.

## API and access

- `PATCH /api/depreciation/assets/:assetId/config` — Bursary Asset Accountant configures useful life, salvage value and depreciable flag.
- `POST /api/depreciation/batches` — Bursary Asset Accountant runs a monthly batch.
- `GET /api/depreciation/batches` — paginated period summaries derived from ledger rows.
- `GET /api/depreciation/ledger` — paginated ledger.
- `GET /api/depreciation/assets/:assetId/history` — asset ledger history.

The batch runs as one serializable transaction; any critical database failure rolls back all ledger and NBV updates. Results include processed IDs, skipped assets and failure details. Each posting and batch result is audited after commit through the existing Phase 4 service.

## Known constraints

The existing schema has no explicit fiscal-calendar configuration or depreciation-batch table. This implementation uses calendar months and derives batch summaries from ledger entries. Assets with no trustworthy service date require data stewardship before they can be depreciated; the migration does not invent one.
