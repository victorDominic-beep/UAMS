# UAMS backend

This is the CommonJS/Express API for the University Asset Management System. It uses PostgreSQL through Prisma. The API does not connect to Bursary FMIS, Works systems, gate registries, auction platforms, insurance providers, or physical printers.

## Local setup

Requirements: Node.js compatible with the project lockfile and a reachable PostgreSQL server.

1. From this directory install dependencies with `npm ci`.
2. Create `.env` from `.env.example` only if `.env` does not already exist. If it exists, preserve it and edit only the settings you intend to change. Never commit `.env`.
3. Set `DATABASE_URL` to a PostgreSQL database and schema reserved for UAMS. The database user must be able to create/alter tables for migrations. Do not point a local development setup at production.
4. Set a private random `JWT_SECRET` of at least 32 characters. Use a different value for production.
5. Run `npx prisma validate`, `npx prisma migrate status`, `npx prisma migrate deploy`, and `npx prisma generate` from this directory. `migrate deploy` applies pending migrations; it does not reset data. Review migration files before applying them to an existing or production database.
6. Create the initial roles and administrator using the project seed workflow (`npm run prisma:seed`) only where appropriate for a new database. Inspect `prisma/seed.js` before running it against an existing database.
7. Start the API with `npm run dev`; production starts with `npm start`. The default port is 4000. `GET /api/health` reports API and database connectivity.

The frontend preview defaults to `http://localhost:8443`; configure `FRONTEND_URL` to the exact trusted origin. The frontend API client uses `VITE_UAMS_API_URL` (default `http://localhost:4000/api`). For a production deployment, set the API URL and CORS origin to the deployed HTTPS origins and terminate TLS at the deployment proxy/load balancer. This repository alone does not configure TLS 1.3.

## Environment variables

| Variable | Required | Purpose |
|---|---:|---|
| `PORT` | No | API port; defaults to `4000`. |
| `NODE_ENV` | No | `development`, `test`, or `production`; defaults to `development`. |
| `DATABASE_URL` | Yes | PostgreSQL connection URL. Do not expose its credentials. |
| `JWT_SECRET` | Yes | Private signing secret, at least 32 characters. |
| `JWT_EXPIRES_IN` | No | JWT lifetime; defaults to `8h`. |
| `FRONTEND_URL` | Yes | Single allowed browser origin for CORS. |
| `VITE_UAMS_API_URL` | Frontend | API base URL including `/api`. |
| `UAMS_TEST_DATABASE_SCHEMA` | Integration tests | Exact isolated disposable schema `uams_phase_test_YYYYMMDD_8hex`; must match the `DATABASE_URL` schema parameter. |
| `UAMS_DEMO_DATABASE_SCHEMA` | Demo seed | Dedicated local schema name beginning `uams_demo_`; must match the `DATABASE_URL` schema parameter. |
| `UAMS_SEED_DEMO` | Demo seed | Must equal `1` to explicitly enable demo seeding; keep `0` otherwise. |
| `UAMS_DEMO_PASSWORD` | Demo seed | Private 12+ character password shared by demonstration accounts; never commit it. |

## Authentication and roles

Login is `POST /api/auth/login` with `staffNumber` and `password`. Send the returned bearer token as `Authorization: Bearer <token>`. `GET /api/auth/me` returns the authenticated user and roles. Login is rate limited. Passwords are bcrypt-hashed. Role checks are enforced by the API; frontend navigation is not an authorization boundary.

The nine operational roles are `SYSTEM_ADMINISTRATOR`, `STORE_OFFICER`, `WORKS_INSPECTION_OFFICER`, `DEPARTMENTAL_CUSTODIAN`, `BURSARY_ASSET_ACCOUNTANT`, `BURSAR`, `VICE_CHANCELLOR`, `BOARD_OF_SURVEY_MEMBER`, and `INTERNAL_AUDITOR`. The System Administrator manages user accounts and roles but has no financial operational privileges. The Internal Auditor can inspect assets and audit records and record physical verification; this role has no operational asset mutation privileges. Approvals that require separation of duties are checked against the authenticated user ID as well as role.

## Workflows and financial controls

- An approved SRV generates PAIN identifiers and creates assets in `PENDING_INSCRIPTION`. A Works Inspection Officer confirms tag inscription; a Store Officer creates and separately approves an SIV; the destination Departmental Custodian confirms receipt. Custody confirmation moves the asset into service and records its service date.
- A Works Inspection Officer opens and closes maintenance. Opening moves `IN_SERVICE` to `UNDER_MAINTENANCE`; completion restores `IN_SERVICE`. Maintenance costs are operating expenditure and do not change historical cost.
- Works Inspection Officers maintain insurance policies. This tracks dates and coverage only; it does not contact an insurer.
- A Bursar flags capital additions and a different Bursar approves them. Approval increases the asset book value. Approved additions are depreciated prospectively over remaining useful life; historic ledger entries are retained.
- A Bursary Asset Accountant configures depreciation and runs monthly batches. Decimal arithmetic, per-period duplicate prevention, salvage-value clamping, and all-or-nothing transactions are used. Only depreciable assets in service with a recorded service date are eligible.
- A Departmental Custodian reports an asset unserviceable. A Board of Survey Member creates a docket, adds eligible assets, and records condition/reserve assessment. A Bursar and a different Vice-Chancellor must both approve write-off before the asset becomes `WRITTEN_OFF`. The Bursary Asset Accountant records disposal proceeds; the asset becomes `DISPOSED` atomically.
- An Internal Auditor records physical verification. Verification does not change financial values or asset status.
- Audit entries are hash chained and append-only at the database level. Hash payloads canonicalize JSON keys to survive PostgreSQL `jsonb` serialization. The verification endpoint should be checked after operational database upgrades and restore procedures.

## API reference

All routes below are under `/api`. Unless marked public, they require a bearer token. Responses use `{ "success": true, "data": ... }`; errors use a structured error response. List routes return `items` and `pagination` where applicable. UUID path parameters are database IDs.

| Method and path | Permission / role | Purpose |
|---|---|---|
| `GET /health` | Public | API and database health. |
| `POST /auth/login` | Public; rate limited | Authenticate with staff number and password. |
| `GET /auth/me`, `POST /auth/logout`, `POST /auth/change-password` | Authenticated | Current user, logout, password update. |
| `GET/POST /users`, `GET/PATCH /users/:id`, `PATCH /users/:id/roles`, `PATCH /users/:id/status` | System Administrator | User and role administration. |
| `GET /departments`, `GET /asset-categories` | `assets.read` | Active reference records. |
| `GET /assets`, `GET /assets/:id` | `assets.read` | Search, filter and view assets. |
| `POST /assets/:id/label`, `GET /assets/:id/label` | `label.print` | Generate/read barcode, QR and print payloads; no printer connection. |
| `POST /assets/:id/inscription/confirm` | Works Inspection Officer; `tag.confirm` | Confirm inscription with matching PAIN. |
| `POST /assets/:id/movements`, `GET /assets/:id/movements`, `GET /assets/movements` | Works Inspection Officer for create (`assets.move`); `assets.read` for history | Record and inspect movement history. |
| `POST /assets/:id/report-unserviceable` | Departmental Custodian; `asset.unserviceable.report` | Report an asset for survey consideration. |
| `POST/GET /srv`, `GET/PATCH /srv/:id` | `srv.create`, `assets.read`, `srv.edit` | Create, list, read and edit draft SRVs. |
| `POST /srv/:id/submit`, `POST /srv/:id/reject` | `srv.create`, `srv.approve` | Submit or reject SRV. |
| `POST /srv/:id/approve` | `srv.approve` | Approve SRV with creator separation. |
| `POST/GET /siv`, `GET /siv/:id` | `siv.create`, `assets.read` | Create and inspect SIV. |
| `POST /siv/:id/approve` | `siv.approve` | Approve SIV with creator separation. |
| `GET /siv/pending-receipt`, `POST /siv/:id/confirm-receipt` | Departmental Custodian; `siv.receipt.sign` | Confirm delivery for destination department. |
| `POST /maintenance`, `POST /maintenance/:id/complete` | Works Inspection Officer; `maintenance.log` / `maintenance.close` | Open and complete maintenance. |
| `GET /maintenance`, `GET /maintenance/:id` | `assets.read` | Maintenance history and detail. |
| `POST /insurance`, `PATCH /insurance/:id` | Works Inspection Officer; `insurance.track` | Create or update policy details. |
| `GET /insurance`, `GET /insurance/:id` | `assets.read` | Policy list (active, expired, upcoming) and detail. |
| `POST /capital-additions`, `POST /capital-additions/:id/approve` | Bursar; `capital_addition.flag` | Flag and separately approve capital additions. |
| `GET /capital-additions` | `assets.read` | Capital addition history. |
| `PATCH /depreciation/assets/:assetId/config` | Bursary Asset Accountant; `depreciation.configure` | Configure useful life, salvage and depreciability. |
| `POST /depreciation/batches` | Bursary Asset Accountant; `depreciation.run` | Run an all-or-nothing monthly batch (`period` as `YYYY-MM`). |
| `GET /depreciation/batches`, `GET /depreciation/ledger`, `GET /depreciation/assets/:assetId/history` | `assets.read` | Batch summaries and depreciation history. |
| `POST /survey/dockets`, `POST /survey/dockets/:id/items`, `POST /survey/items/:id/assessment` | Board of Survey Member; `survey.compile`, `survey.rate`, `survey.reserve_value` | Create docket, add eligible assets, record assessment. |
| `GET /survey/dockets`, `GET /survey/dockets/:id`, `GET /survey/items/:id/authorization` | `assets.read` | Survey and approval history. |
| `POST /survey/items/:id/approvals/bursar` | Bursar; `writeoff.bursar.approve` | First write-off decision. |
| `POST /survey/items/:id/approvals/vice-chancellor` | Vice-Chancellor; `writeoff.vc.approve` | Separate second write-off decision. |
| `POST /disposals` | Bursary Asset Accountant; `auction.proceeds.record` | Record proceeds and disposal gain/loss for a written-off asset. |
| `GET /disposals` | `assets.read` | Disposal history. |
| `POST /verification` | Internal Auditor; `verification.record` | Record physical verification. |
| `GET /verification` | `assets.read` | Verification history. |
| `GET /audit`, `GET /audit/:id` | Internal Auditor, Bursar, Vice-Chancellor | Inspect audit entries. |

Filtering and pagination parameters are validated by each list route. Defaults are page 1 and a route-defined page size. The API returns validation errors for invalid filters instead of silently accepting them.

## Database and migrations

Prisma schema: `prisma/schema.prisma`. Migrations are in `prisma/migrations/` and must be applied in order with `npx prisma migrate deploy`. A nullable `Asset.inServiceDate` was added for prospective depreciation; migration backfill uses the earliest completed, approved custody receipt where available and leaves other dates null. Configure those assets with a verified service date through appropriate data correction before depreciation; do not invent historical dates.

Never use `prisma migrate reset` against an existing database. Review `prisma migrate diff` and migration SQL before deploying. Keep a verified backup and use a dedicated database/schema for tests.

## Tests

Run the full backend suite and PostgreSQL integration tests with `npm run test:integration`. The runner creates a unique disposable `uams_phase_test_*` schema, applies the current Prisma schema with `db push`, runs Jest, and drops only that schema. It refuses production mode and never resets or writes to `public`. Direct `npm test` remains useful for offline tests, but the database integration suite is skipped unless the exact dedicated schema name matches the connection URL. The integration coverage exercises acquisition through disposal, authentication/password/JWT flows, all nine role boundaries, concurrent identifiers and depreciation, and financial transaction rollback.

## Known limits

- Bursary FMIS, Works maintenance systems, Central Store gate registries, insurers and auction platforms are not connected.
- Barcode/QR data is generated, but no thermal printer is connected.
- Departmental submissions, document storage/viewer, report file exports and notification feed do not have backend endpoints in this repository and remain outside the live asset lifecycle integration. The role navigation no longer advertises the browser-only submission demo; reports preview the first page of live assets only.
- Deployment TLS, production CORS origin, secrets management, backup/restore, monitoring and database append-only controls beyond the repository migration require deployment configuration and operational review.
- Browser checks use the supplied FUNAAB UAMS system design and login visual reference. See [Phase 11 demo readiness](docs/phase11-demo-readiness.md) for UI boundaries, safe demo setup and integration test coverage.

## Demo preparation

The role-only setup command remains `npm run prisma:seed`. For demonstration records, use the guarded `npm run prisma:seed:demo` command only against a separate local `uams_demo_*` schema. It creates 11 demo accounts covering the nine official roles, sample lifecycle records and no production credentials. Follow the exact safety gates and setup steps in [Phase 11 demo readiness](docs/phase11-demo-readiness.md); the demo command refuses to run against `public` or production.
