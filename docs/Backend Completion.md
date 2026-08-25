# Institute X Backend Completion

Date: 25 August 2026  
Source: Institute X eLearning SRS v1.5

## Functional traceability

| SRS area | Implementation | Verification |
|---|---|---|
| FR-AUTH-01–06 | OIDC bearer guard, UserInfo validation, verified university domain, inactive-account denial, SSO user synchronization, no password model | OIDC guard/verifier and SSO user unit tests; protected-route E2E tests. Live Institute endpoint remains an Institute UAT item. |
| FR-TA-01–04 | Teacher requests, personal status, Approver pending queue, approve/reject, effective latest permission enforcement | Teacher permission unit and authoring E2E tests |
| FR-CM-01–10 | Course creation, owned workspace, Draft metadata/text editing, new revisions, immutable published Versions, submit/reopen/re-submit | Course, content, and Version unit/E2E tests; PostgreSQL approval integration test |
| FR-COST-01–02 | No payment, subscription, password, or paid-lock models or endpoints | Prisma schema contract |
| FR-CA-01–09 | Major-filtered catalog, entry eligibility, unique Enrollment, repeated access events | Learning unit/E2E tests; PostgreSQL Enrollment integration test |
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
- Analytics: owned Teacher Course analytics and Owner dashboard
- Operations: `/api/health`, `/api/ready`, `/api/docs`

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

## External acceptance items

- Configure the real `OIDC_USERINFO_URL`, allowed university email domain, and Institute claim names, then perform Institute SSO UAT.
- Run the SRS concurrency/load target in a production-like environment; this is infrastructure capacity validation, not a local unit-test claim.
- Complete frontend multilingual and accessibility verification separately.

No application deployment is part of this completion pass.
