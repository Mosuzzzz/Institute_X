# Institute X Backend Completion

> Current authentication update (12 September 2026): the historical verification report below is not the current auth contract. Authentication now uses institutional Email OTP, HttpOnly cookie sessions and five additive roles (STUDENT, TEACHER, APPROVER, REGISTRAR, EXECUTIVE). Password/SSO login and public manual account creation are removed. Registrar manages existing verified users with role-change audits; Executive is read-only. See `System_Business_Rules_Blueprint.md` and `Email_OTP_Setup.md`. Migration, live email delivery and real-browser verification remain operational acceptance steps.

Date: 26 August 2026
Source: Institute X eLearning SRS v1.5

## Functional traceability

| SRS area | Implementation | Verification |
|---|---|---|
| FR-AUTH-01–06 | local authentication bearer guard plus local authentication fixture adapter, verified university domain, inactive-account denial, local authentication user synchronization, no password model | local authentication/local authentication fixture guard and verifier unit tests; protected-route E2E tests. Live Institute endpoint remains an Institute UAT item. |
| FR-TA-01–04 | Teacher requests, personal status, Approver pending queue, approve/reject, effective latest permission enforcement | Teacher permission unit and authoring E2E tests |
| FR-CM-01–12 | Course creation, owned workspace, Draft metadata/text editing, category assignment, new revisions, immutable published Versions, submit/reopen/re-submit | Course, category, content, and Version unit/E2E tests; PostgreSQL approval integration test |
| FR-COST-01–02 | No payment, subscription, password, or paid-lock models or endpoints | Prisma schema contract |
| FR-CA-01–09 / FR-CAT-01–05 | Major- and category-filtered catalog, taxonomy, entry eligibility, unique Enrollment, repeated access events | Learning/category unit and E2E tests; PostgreSQL Enrollment integration test |
| FR-AP-01–09 | Submitted queue, review, rejection correction, automatic publication and superseding | Version unit/E2E tests; PostgreSQL approval integration test |
| FR-PRE-01–12 | Single attempt, randomized presentation, timer, server grading, stored score/result, result endpoint, content unlock | Pre-Test unit and Student E2E tests |
| FR-LC-01–09 | Text and supported media authoring, 1 GiB limits, ordered published content, private signed URLs, Draft deletion recovery | Content/media/learning unit and E2E tests; S3 adapter tests |
| FR-POST-01–12 | Unlimited independent attempts, randomized presentation, timer, server grading, 80% PASS, numeric result history | Post-Test unit and Student E2E tests |
| FR-AN-01–05 | Owned Teacher Course analytics for enrollment, traffic, Pre/Post score and outcomes | Analytics unit and management E2E tests |
| FR-POP-01–04 | Enrollment grouping and deterministic popularity ranking | Analytics unit tests and Owner dashboard E2E coverage |
| FR-OW-01–07 | Owner user/Course/enrollment/assessment/traffic/peak dashboard | Analytics unit and management E2E tests |
| FR-CAE-01–04 | One event per eligible Course entry, separate from unique Enrollment | Learning unit tests and PostgreSQL integration test |

## Main API workflows

- Teacher permissions: `POST /api/teacher-permissions`, `GET /api/teacher-permissions/me`
- Approver permission queue: `GET /api/teacher-permissions/pending`, `PATCH /api/teacher-permissions/:id/review`
- Teacher workspace: `GET /api/courses/mine`, `POST /api/courses`, `POST /api/courses/:id/versions`
- Draft authoring: `PATCH /api/course-versions/:id`, text/media/quiz/question endpoints
- Version approval: submit, pending-review queue, review, rejection reopen and resubmit
- Student catalog and learning: `GET /api/courses`, Course entry, Pre-Test, published content, signed media view, Post-Test
- Categories and catalog filtering: `GET /api/categories`, Owner `POST/PATCH /api/categories`, owning Teacher `PUT /api/courses/:id/categories`, and `GET /api/courses?categoryId=...`; `POST /api/courses` requires `categoryIds`
- Analytics: owned Teacher Course analytics and Owner dashboard
- Operations: `/api/health`, `/api/ready`, `/api/docs`

## Local local authentication fixture

The development environment uses the deployed local authentication fixture at `the retired identity provider`:

1. The client obtains a bearer token from `POST /api/auth/login`.
2. The backend authenticates it through `GET /api/auth/me`.
3. The backend loads `username`, identity status, and `major_code` directly from the authenticated `/api/auth/me` response. `/api/auth/verify` is retained only as a legacy fallback when `/me` omits a Student Major.
4. `major_code: CS` maps to the idempotently seeded Computer Science Major. The supplied `year_level` is not persisted because SRS v1.5 defines Course eligibility by Major only.

The synchronized User stores both `username` and the display `full_name`. If the provider omits `username`, the stable `user_id`/local authentication subject is used. Passwords are never stored. Inactive identities are denied. Mock lecturers map to `TEACHER`; Mock staff maps to the configured `APPROVER` or `OWNER` role.

The deployed login form sends `{ username, password }` and returns an access token. Live acceptance passed for `/login` → `/me` → the protected backend Course catalog with Student `6600000001`; PostgreSQL synchronization stored the username, display name, active Student role, university email, and Major `CS`.

## Verification commands

```bash
cd backend
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run test:integration
npm run lint
npm run typecheck
npm run build
npx prisma migrate status
```

The integration suite creates UUID-scoped temporary records in the configured local PostgreSQL database and deletes only those records after the suite.

Migration `202608260001_add_course_categories` is applied locally. It creates the normalized Category tables, seeds `Uncategorized`, and backfills existing Courses. The integration suite verifies the migration and category relationships.

## External acceptance items

- Configure the real `local authentication_USERINFO_URL`, allowed university email domain, and Institute claim names, then perform Institute local authentication UAT.
- Run the SRS concurrency/load target in a production-like environment; this is infrastructure capacity validation, not a local unit-test claim.
- Complete frontend multilingual and accessibility verification separately.

No application deployment is part of this completion pass.
