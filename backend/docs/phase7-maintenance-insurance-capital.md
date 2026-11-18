# Phase 7: Maintenance, Insurance, Capital Additions and Movements

## Maintenance

`POST /api/maintenance` opens a service record only for an `IN_SERVICE` asset and moves it to `UNDER_MAINTENANCE` in the same transaction. The Works Inspection Officer records service date, description, parts and OpEx. These records always set `isCapitalAddition=false` and never alter asset cost or NBV. `POST /api/maintenance/:id/complete` closes an open record and returns its asset to `IN_SERVICE`. `GET /api/maintenance` supports asset/status filters and pagination; `GET /api/maintenance/:id` returns details.

## Insurance

Works Inspection Officers create and update policies at `/api/insurance`. Policy number is unique; date ranges are validated. Listing supports `active`, `expired` and `upcoming` (expiry within 30 days) filters, asset filtering and pagination. The application does not connect to an insurer.

## Capital additions

Only the Bursar may flag an addition using `POST /api/capital-additions`. A different Bursar must approve it using `POST /api/capital-additions/:id/approve`; approval is explicit in the existing model and increments the asset NBV. `GET /api/capital-additions` exposes paginated financial history. Routine maintenance cannot be marked as capital expenditure. Approved addition date and amount feed the Phase 8 prospective depreciation calculation. The model does not store an additional supporting-document reference.

## Movements and unserviceable reports

Works Inspection Officers record movement with `POST /api/assets/:id/movements`; immutable transfer history is available at `GET /api/assets/:id/movements`. The asset's current department/location updates atomically with its transfer. A Departmental Custodian may report an in-service asset unserviceable at `POST /api/assets/:id/report-unserviceable`, which records the state transition for later survey.

All writes reuse the Phase 4 audit chain and existing models. No migration was required for Phase 7.
