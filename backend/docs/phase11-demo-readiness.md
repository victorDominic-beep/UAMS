# Phase 11: Demonstration readiness

## Frontend alignment

- The sign-in page uses the supplied dark, split-screen reference with FUNAAB UAMS branding and original decorative artwork. It keeps the real API login, input validation, password visibility control, error/loading states and dashboard entry. Social sign-in is not shown.
- Role navigation now follows the nine backend role definitions. The System Administrator sees account management and no asset-register link. The Internal Auditor keeps read-only asset and audit access plus physical verification.
- Dashboard values come from the authorized asset API page. Workspaces are role-filtered. Reports preview real loaded asset records; file export is unavailable and no export success is claimed.
- The header and settings state that notifications are not connected. The former local-only submission workflow is not included in role navigation because it is not an approved asset lifecycle workflow. FMIS reconciliation, document storage/viewer, thermal printing and external integrations remain unavailable.
- User and role administration now uses the protected `/api/users` API, and account creation includes the actual staff number, department, role and temporary password fields. Password change requires an authenticated session and the current password.

## Safe demo dataset

`npm run prisma:seed:demo` creates or updates demonstration users, departments, a category, seven lifecycle-state assets, an approved SRV, approved SIV and custody records, maintenance and insurance history, a capital addition, depreciation ledger entries, survey/write-off/disposal records, physical verification and a hash-chained audit event. It does not delete rows. Re-running it uses stable identifiers and avoids duplicate history rows.

The seed refuses to run unless all of these are true:

- `NODE_ENV` is not `production`.
- `UAMS_SEED_DEMO=1` is explicitly set.
- `UAMS_DEMO_DATABASE_SCHEMA` matches `DATABASE_URL`'s schema parameter and has a `uams_demo_` prefix.
- `UAMS_DEMO_PASSWORD` is set to a private password with at least 12 characters.

### Prepare a separate local demo schema

1. Back up and verify the intended local development database. Do not use a production or shared database for demo setup.
2. Create an empty `uams_demo_local` PostgreSQL schema using pgAdmin or an authorized local database administrator. Do not drop or reset any schema.
3. In the ignored `backend/.env`, point `DATABASE_URL` to that same local database with `?schema=uams_demo_local`. Keep the connection credentials private.
4. Set `UAMS_DEMO_DATABASE_SCHEMA=uams_demo_local`, `UAMS_SEED_DEMO=1`, and a private `UAMS_DEMO_PASSWORD` in the local environment. Keep all three out of source control.
5. From `backend`, run `npx prisma migrate deploy`, then `npm run prisma:seed:demo`.
6. Set `UAMS_SEED_DEMO=0` after seeding. Use the same private demo password for all demo accounts; never use it outside the isolated demonstration environment.

The seed creates 11 example accounts covering all nine official roles. Two Store Officer accounts and two Bursar accounts are included so the data demonstrates separation of duties. Emails use the reserved `.invalid` domain. Staff numbers use the `DEMO-` prefix. No demo password is committed or printed.

## Verification coverage

The Phase 11 database suite is an opt-in integration suite. It runs only if `UAMS_TEST_DATABASE_SCHEMA` has the exact form `uams_phase_test_YYYYMMDD_8hex` and matches the `schema` query parameter in `DATABASE_URL`. It exercises valid/invalid/missing login credentials, JWT validity and expiry, password changes, logout, the nine-role access boundary, parallel SRV/PAIN and SIV identifiers, parallel depreciation protection, and audit-chain verification. The existing lifecycle suite also verifies transaction rollback.

Jest teardown drops only the exact schema passed as `UAMS_TEST_DATABASE_SCHEMA`, after verifying that the connection URL points at the same named test schema. Never set this variable to `public`, a shared application schema or production. If database integration is unavailable, Jest marks these tests skipped; a passing unit suite is not a passing PostgreSQL verification.

## Limits

- Login is username/email plus password. Self-service password recovery is not available; an administrator must handle account recovery.
- Logout is stateless JWT disposal by the client. A stolen, otherwise valid token remains usable until expiry or account deactivation.
- Browser notifications, report file exports, document storage/viewing, and departmental submissions have no backend workflow here. Report previews use the first authorized API page only.
- Demo records are illustrative data in a dedicated local schema, not official University records. The browser uses the backend and will not log into the demo accounts until the API's `DATABASE_URL` points to the same seeded demo schema.
