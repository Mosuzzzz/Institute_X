# Institute X — consolidated project review

Reviewed 5–6 September 2026, including the existing uncommitted changes. This consolidates the earlier findings and the broader follow-up audit; it is not a list of only newly discovered defects. Application code was not changed, committed, or deployed as part of this review.

## Implementation follow-up — 6 September 2026

The remediation pass after this review changed application code and database migrations. The original findings below are retained as the audit record; this table is the current disposition.

| Scope | Status | Implemented evidence |
| --- | --- | --- |
| F01 | Implemented | Direct draft metadata updates now use an atomic DRAFT/owner/archive predicate. Submission validates and changes state in a serializable transaction. Migration `202609060001_lock_draft_authoring` serializes child-table mutations through the parent Version row and rejects writes outside DRAFT. |
| F02 | Implemented | Archived Courses are rejected by Pre-Test, Post-Test, lesson media, cover, question-image and Approver-preview access paths; submitted-review lookup also excludes archived Courses. |
| F03 | Implemented | Upload completion copies verified bytes from the reusable upload key to a new server-owned READY key. The original PUT URL can no longer replace the bytes served to reviewers or learners. |
| F04 | Implemented | Expiry finalization has bounded retry/backoff, result recovery and an explicit retry action after repeated failure. |
| F05 | Implemented | OWNER is accepted by both the cover controller guard and service authorization. |
| F06 | Implemented | Migration `202609060002_preserve_discarded_review_history` adds an audit snapshot for reviews before a reopened Draft is discarded. |
| F07 | Implemented | Lesson, cover and question-image reservations share one course-wide quota calculation; revision copies are checked inside a serializable transaction. |
| F08 | Implemented | New question position is derived from the maximum current position instead of array length. |
| F09 | Implemented | Student catalog records and filters against all assigned category slugs. |
| F10 | Implemented | A signing failure compensates the database reservation for all upload types. Partial browser upload/completion failures refresh the editor so pending reservations can be retried or removed. |
| F11 | Partially implemented | Draft discard no longer reports success if storage deletion fails, and database references remain available for a safe retry. A durable background cleanup queue and Owner operations view are still recommended before high-volume production use. |
| F12 | Implemented | Lesson media responses, errors, loading state and scrolling are gated by request identity. |
| F13 | Implemented | Course creation uses a prevented submit handler and preserves uncontrolled input on validation, API and network failure. |
| F14 | Implemented | Approver review renders authorized question images; signed image URLs renew before expiry. |
| G01 | Implemented | Students can revisit the single mandatory Pre-Test score and Post-Test attempt history. Own submitted results remain queryable after version replacement or unpublish. |
| G02 | Implemented | The Teacher Course workspace links to a course analytics page showing enrollment, access, attempts, averages, pass rate and outcomes. |
| G03 | Implemented | Owner category create/edit UI and Teacher Draft category reassignment UI are available. |
| G04 | Partially implemented | Readiness now checks PostgreSQL and object-storage bucket accessibility. Upload screens still need a proactive offline banner/disabled state rather than relying only on the returned API error. |
| G05 | Resolved by specification | The blueprint now states that Draft persistence is explicit through Save Draft and add/update actions; continuous autosave is not promised. |
| G06 | Open | Complete Thai, English, Simplified Chinese and Japanese coverage still requires a dedicated localization pass over Teacher, Approver, assessment and Owner copy. |

Latest verification after remediation: backend targeted regression tests **112 passed**; full backend unit suite **274 passed / 5 skipped**; PostgreSQL integration **5 passed**; backend E2E **55 passed**; backend and frontend typechecks, lint checks and production builds passed. No deployment or live concurrency certification was performed.

### Residual verification fixes

The three issues V01–V03 found by the independent verification below have now been remediated:

- **V01 fixed:** Draft discard takes a conditional DRAFT row lock inside its transaction before any object deletion. Submit uses the same lock protocol, so the losing operation fails before published bytes can be removed. A regression test verifies that no storage deletion occurs when the lock cannot be acquired.
- **V02 fixed:** lesson, cover and question-image completion now atomically transitions the matching source key from PENDING/FAILED to READY. A losing concurrent completion deletes its own copied key and returns the winner's READY record, making retry idempotent.
- **V03 fixed:** Post-Test history is rendered independently from attempt creation. Opening the page does not start a timed attempt; **Start Post-Test/Retake Post-Test** is now an explicit action, and historical results remain visible when a new attempt is unavailable.

Verification after these fixes: full backend unit suite **276 passed / 5 skipped**; backend and frontend typechecks and lint checks passed; both production builds passed; `git diff --check` passed. The independent-verification section remains below as historical evidence of why these regressions were added.

### Verification of V01–V03 remediation

Rechecked the latest code: `discardDraft` now acquires its DRAFT row lock before storage deletion; all three upload completion methods use a source-key/status conditional transition and clean up a losing copy; Post-Test history has a separate initial view; the course page links to the Pre-Test result. Backend unit tests rerun in this verification: **276 passed / 5 skipped**. `git diff --check` passed. Two residual issues remain:

- **P1 / V01 scope remains incomplete:** individual deletion paths still remove objects before the database mutation obtains the parent lock. See `media.service.ts:671` (`deleteDraftAsset`), `deleteDraftCover`, `deleteDraftQuestionImage`, and `quiz-authoring.service.ts` (`deleteQuestion`, `deleteQuiz`). The same publication race identified in V01 therefore remains outside whole-draft discard. A controlled probe of the actual `deleteDraftAsset` service reproduced object deletion followed by the simulated database trigger rejecting a now-PUBLISHED version. Apply the deletion-state/lock protocol consistently before any external deletion. This probe is not a live database concurrency test.
- **P2 / Post-Test start retry gets stuck:** `assessment-client.tsx:197–200` sets `postTestStartRequested` to true. After a failed attempt-start request, the effect leaves that value true and returns to the start/history screen. Clicking Start again sets loading true but does not change any dependency of the fetching effect, so no retry runs and the page remains loading. Use an explicit async start handler or a retry counter/state transition; test a failed first request followed by recovery. This finding is source-traced, not browser-tested.

The original upload-copy race mechanism V02 is addressed in code, and the history visibility mechanism V03 is addressed; this does not certify live storage failure recovery. No application code was changed during this verification.

### Completion of the remaining V01 scope and Post-Test retry

The two residual issues immediately above have now been fixed:

- Lesson, Cover, Question Image, individual Question, clear-questions and whole-Quiz deletion now acquire the parent Version's conditional DRAFT/owner/archive lock inside a serializable transaction before deleting any object. If Submit wins the lock, the delete operation returns a conflict without touching storage. New regression tests cover the five storage-bearing deletion paths.
- Post-Test start uses an incrementing request sequence instead of a sticky boolean. A failed start returns to the history/start screen, and every subsequent Start/Retake click changes the effect dependency and performs a new request instead of remaining in loading state.

Latest verification: backend unit suite **282 passed / 8 integration tests skipped in the unit command**; backend and frontend typechecks, lint checks and production builds passed; `git diff --check` passed. The sections above remain as historical verification evidence.

### Live PostgreSQL, MinIO and Redis verification

`test/concurrency.integration.spec.ts` now exercises the repaired races against the running local dependencies instead of ORM/storage doubles:

- **PostgreSQL row-lock test:** a real Lesson deletion holds the parent Version lock while its storage deletion is paused. A concurrent real `CourseVersionsService.submit()` remains blocked, then validates and submits only after the deletion transaction commits. The final database state contains no deleted asset reference and the Version is SUBMITTED with its retained content.
- **MinIO finalization test:** two real `MediaService.completeUpload()` calls are forced to reach two actual MinIO copy operations before either can claim READY. Both calls return the same winning key. A real `HeadObject` confirms the winning object exists, while the original upload key and losing copied key no longer exist.
- **Redis authentication-cache test:** two guarded requests use the same Bearer token. The first request verifies the token and synchronizes the User; the second obtains the session from real Redis without another local authentication verification or database synchronization. The test also confirms a positive TTL and that the Redis key contains a SHA-256 token digest rather than the raw token.
- **Serializable retry:** the PostgreSQL race exposed Prisma `P2034` write conflicts. Course submission now retries a serializable transaction at most three times and returns a controlled conflict after exhaustion instead of leaking an ORM error. A regression test covers successful recovery after the first conflict.

The integration command now includes all three suites. Result: **8/8 integration tests passed** against local PostgreSQL, MinIO and Redis. The full ordinary unit command reports **282 passed / 8 integration tests skipped**. Backend typecheck, lint and production build also pass after this addition.

Redis remains a fail-open performance dependency: when `REDIS_URL` is configured, `AuthGuard` caches authenticated sessions for `AUTH_SESSION_CACHE_TTL_SECONDS` (default 300 seconds); when Redis is absent or temporarily unavailable, authentication falls back to local authentication verification plus User synchronization. This preserves availability but restores the local authentication/database load that the cache is intended to prevent, so production monitoring should alert on Redis connectivity and cache effectiveness.

Real browser verification was attempted against the local production frontend/backend, but the available in-app browser runtime could not initialize in this environment. Therefore no browser-interaction pass is claimed. Frontend typecheck, lint and production build pass, but the Start → failure → retry interaction should still receive a manual or automated browser run when a working browser runtime is available.

## Independent verification after remediation — 6 September 2026

The implementation table above records the remediation author's disposition. This verification found the reported changes in the current source, but the following residual issues prevent treating the entire remediation as closed. In particular, G01 is only partially delivered through the user interface, and F11 still includes a publication-integrity risk.

1. **V01 / P1 — Discard can delete files belonging to a concurrently published version.** `backend/src/course-versions/course-versions.service.ts:331` deletes storage objects before entering the transaction and before the conditional DRAFT deletion at line 352. Start discard, pause object deletion, submit/approve the same version, then resume discard: object deletion succeeds before the later database operation rejects the changed state. The new child-table triggers cannot undo external storage deletion. A controlled execution of the actual discard service with simulated state changes reproduced the rejected discard plus deleted object. This also applies to the existing delete-media/question/quiz paths that delete objects before their guarded database mutations. Claim a non-publishable deletion state or use transactional deletion plus durable cleanup work before removing any object. Acceptance: racing discard against submit/approve must leave all published asset bytes intact; partial storage failure must remain safely recoverable.

2. **V02 / P2 — Concurrent upload completions leak READY objects.** `backend/src/media/media.service.ts:577–589` generates a new key for every completion and updates the asset by ID alone. Two requests can read the same upload key, copy into different READY keys, and both update successfully. The last database update wins while the other READY key is never deleted, because both requests clean up only the original upload key. The cover and question-image completion methods have the same pattern. A controlled service probe reproduced two remaining READY objects with only one database reference. The fix to prevent original PUT URLs overwriting finalized content is present; this is a separate lifecycle defect introduced by the copy step. Make completion idempotent and atomically claim/compare the asset's status and source key, with cleanup for losing copies. Acceptance: simultaneous completion and lost-response retry leave exactly one referenced final object and no untracked copy.

3. **V03 / P2 — Historical Post-Test results are hidden when a new attempt cannot start.** `frontend/src/app/student/assessments/[quizType]/[quizId]/assessment-client.tsx:38–43` fetches history and immediately starts an attempt. For a superseded/unpublished version, history now succeeds but attempt start correctly fails. The `!attempt` branch renders only `ApiState` when no submitted result is in local state, hiding the fetched history. Opening current history also starts a fresh timed attempt without a separate user action. This is a source-traced UI issue, not a browser reproduction. Separate history viewing from an explicit Start/Retake action and render history independently of attempt-start success. Also provide a visible way to revisit the Pre-Test score: after unlock, the current course page removes its Pre-Test start links and does not replace them with a score link. Acceptance: navigate to both types of results without starting an attempt, including after version replacement.

Fresh checks in this verification: full backend unit suite **274 passed / 5 skipped**; backend and frontend typechecks **passed**; `git diff --check` **passed**. The two storage/state probes above used simulated dependencies, not live PostgreSQL/MinIO concurrency. No new browser, migration deployment, integration or E2E certification is implied. G04's proactive upload-offline UI and G06 localization remain explicitly unfinished in the implementation table. Only this report was edited during verification.

**Historical pre-remediation assessment:** the original audit identified three P1 findings, eleven P2 defects and six requirement gaps below. Consult the implementation table and subsequent verification above for current status. Passing existing tests does not cover every failure path identified here. This is a code and targeted behavior review, not a claim that every possible defect has been found.

Evidence labels: **probe** means a controlled execution of application services or extracted frontend logic with simulated dependencies; **code** means traced implementation/constraints, without reproducing the full user journey; **integration** means PostgreSQL-backed tests. A probe is not a browser or production concurrency test.

## Historical follow-up code review, before remediation — 6 September 2026

Re-read the current implementation behind F01–F14, including the uncommitted assessment, media, Docker and frontend changes. All fourteen findings remain open: the relevant state predicates, storage lifecycle, schema constraints and frontend handlers still contain the mechanisms described below. No additional confirmed finding was added in this follow-up. The six requirement gaps remain in the original audit scope; they were not each independently retested in this follow-up.

Fresh validation: backend unit tests **264 passed / 5 skipped**; backend and frontend typechecks **passed**; `git diff --check` **passed**. Re-executed the source/service probes for F09, F10, F11 and F12 and reproduced all four. This follow-up did not rerun PostgreSQL integration, E2E, builds or real-browser checks; their earlier results and limitations remain dated evidence below. Only this report was updated; application code was not changed.

## Findings

### F01 · P1 · Draft writes can land after submission or publication

References: `backend/src/courses/courses.service.ts:341–362`; `backend/src/course-versions/course-versions.service.ts:97–155`. The related content, quiz and media mutation methods also need the same state boundary.

`updateDraft` reads DRAFT, then updates by ID alone. A request can pass that check, pause, and write after another request submits and approves the version. Submission readiness validation is also outside the transaction that changes its state. Published content can therefore differ from what was reviewed.

**Evidence — probe:** an interleaving of the actual update/submit/review service methods allowed a delayed title update to land in PUBLISHED state. This was controlled scheduling with ORM doubles, not a load test.

**Fix/acceptance:** use atomic status predicates for direct version writes and a shared version lock/transaction protocol for child mutations and submit validation. Merely wrapping each method in an independent transaction is insufficient. Race submission against metadata, content, quiz and upload completion changes; the submitted snapshot must remain stable and the losing mutation must fail cleanly.

### F02 · P1 · Archiving does not consistently revoke student access

References: `backend/src/assessments/post-test.service.ts:101`; `backend/src/assessments/pre-test.service.ts` (`start`); `backend/src/media/media.service.ts:472–525`.

The lesson-media URL check now handles `archivedAt`, but assessment starts and student cover/question-image URL checks still rely on PUBLISHED status and eligibility. Archiving leaves version status intact, so a student with existing identifiers can continue through those endpoints.

**Evidence — probe:** archived-course fixtures still allowed Pre-Test/Post-Test starts and new cover/question-image signatures. Lesson URL denial is already fixed.

**Fix/acceptance:** share an active-course access policy across all student entry points. Test archive after enrollment with known quiz/asset IDs. Also explicitly define and enforce how archived courses affect pending review and authoring; those services do not consistently check archive state either. Already issued download URLs remain a separate TTL policy.

### F03 · P1 · A previously issued upload URL can replace reviewed bytes

References: `backend/src/media/s3-object-storage.ts:27–39`; `backend/src/media/media.service.ts` (`completeUpload`, `completeCoverUpload`, `completeQuestionImageUpload`).

The signed PUT targets the same key subsequently served as READY content. Completion verifies metadata but does not move the object to an immutable key or pin an object version. A teacher retaining the PUT URL can upload different bytes of the same MIME type and length after completion, including after submission/approval if it happens before expiry. Database DRAFT checks do not protect this direct storage operation.

**Evidence — code + storage contract:** S3 documents that presigned URLs can be reused before expiry and uploads to an existing key replace that object. This is an inference from that contract and the implementation; a live overwrite against the deployed MinIO instance was not performed. [AWS presigned URL documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html).

**Fix/acceptance:** finalize into a server-owned immutable destination, pin an immutable object version, or enforce an equivalent write-once storage policy. Reusing the original upload URL must never change the bytes shown to an approver or student after finalization. Shortening TTL alone does not enforce immutability.

### F04 · P2 · Expired Pre-Test finalization gets stuck after a transient failure

Reference: `frontend/src/app/student/assessments/[quizType]/[quizId]/assessment-client.tsx:58–90`.

The timer sets `expiryHandled.current = true` before the request. If finalization and the fallback result request both fail, it never resets or offers a dedicated retry. Later ticks skip finalization even after connectivity returns. A browser clock ahead of the server can trigger the same path. Reloading can recover, but the open page does not.

**Evidence — probe:** the actual timer effect, with a failed first request and subsequent recovery, issued only one finalization request across repeated ticks.

**Fix/acceptance:** provide bounded retry/backoff or an explicit retry action and account for server time. Test lost response after server success, genuine failure before completion, and client clock skew. Preserve the bodyless finalize-expired endpoint already added.

### F05 · P2 · Owner course covers return 403

References: `frontend/src/app/owner/courses/page.tsx:164`; `backend/src/media/course-covers.controller.ts:26–27`; `backend/src/media/media.service.ts:487–525`.

The Owner course list renders `CourseCoverImage`, but both the controller role list and the service policy exclude OWNER. Courses with real covers consequently show a failed image/fallback.

**Evidence — guard probe + code.** Fix both authorization layers, within the Owner's intended course visibility. Test the actual Owner route with a READY cover; adding OWNER to the decorator alone is insufficient.

### F06 · P2 · A rejected and reopened draft cannot be discarded

References: `backend/src/course-versions/course-versions.service.ts:221–304`; `backend/prisma/schema.prisma:216–225`; `backend/prisma/migrations/202608250001_init/migration.sql:339`.

Submit → reject → reopen preserves a `CourseVersionReview`. Discard then deletes the version without handling that review. Its foreign key uses ON DELETE RESTRICT, unlike cascading content relations, so PostgreSQL rejects deletion and the request fails instead of discarding the draft.

**Evidence — code/schema:** the specific rejection/discard journey was not added to the live database suite. The existing five integration tests pass but do not exercise it.

**Fix/acceptance:** decide how review history must survive draft removal, then implement an explicit transactional policy. Do not blindly cascade audit history. Test first-ever draft discard and reject/reopen/discard with one and multiple submissions.

### F07 · P2 · The course asset quota can be exceeded

References: `backend/src/media/media.service.ts:130,208–215,264`; `backend/src/courses/courses.service.ts:368–517`. Requirements: SRS FR-LC-05 and FR-LC-08.

Lesson initialization totals lesson media only; cover initialization totals lessons and covers; question-image initialization has no course-total check. Revision creation copies assets to new keys and rows without checking the across-version total. For example, copying a version containing 600 MiB creates 1,200 MiB across the two versions, exceeding even the implementation's 1 GiB ceiling.

**Evidence — code:** traced the reservation and copy paths; no large files were uploaded for this review.

**Fix/acceptance:** use one transactional reservation/accounting policy covering all asset types and revision copies across all non-deleted versions. Test mixed asset types near the limit, revision creation and simultaneous reservations. Clarify the specification's GB versus the implementation's GiB while centralizing this rule.

### F08 · P2 · Adding a quiz question fails after deleting a middle question

References: `frontend/src/app/teacher/courses/[courseId]/course-detail-client.tsx:125`; `backend/src/quizzes/quiz-authoring.service.ts:250–273`.

The UI chooses `questions.length + 1`; deletion does not compact positions. With positions 1,2,3, delete 2 and add another question: the UI submits position 3, which conflicts with the existing unique quiz/position pair.

**Evidence — code.** Allocate the next position from the current maximum or compact positions transactionally. Acceptance must cover deleting the first/middle/last question and then adding, including concurrent authoring.

### F09 · P2 · Category filtering hides courses assigned to a secondary category

Reference: `frontend/src/app/student/student-catalog-client.tsx:116–169`.

`toStudentCourse` keeps only `categories[0].slug`, and the catalog filters against that single value. A course assigned to A and B disappears when the student selects B.

**Evidence — probe:** executed the actual transformation with a two-category course and confirmed the secondary-category predicate fails.

**Fix/acceptance:** retain all category identifiers for filtering or use the backend category filter. Test a course in multiple categories, with and without search text.

### F10 · P2 · Failed uploads leave reservations that obstruct retry

References: `backend/src/media/media.service.ts:98–184`; `frontend/src/app/teacher/courses/[courseId]/course-detail-client.tsx:81,584–607,700–724`.

Lesson initialization commits a PENDING asset and content position before signing the URL, with no compensation when signing fails. The client receives no asset identifier on that error, and retrying the same position conflicts. Separately, the frontend initializes, uploads, completes and only then refreshes: a PUT/completion failure leaves reservations unrefreshed, so retrying can collide with the existing cover, image or content position.

**Evidence — service probe + UI code:** a throwing signer left the reservation committed with no cleanup call. Browser upload-failure recovery was not exercised.

**Fix/acceptance:** compensate failed initialization and provide resumable/cancellable reservations with recovery information; reconcile UI state on partial failure. Test signer failure, expired PUT URL, failed binary upload and a lost completion response. Retry must not consume another slot or require discovering hidden pending rows manually.

### F11 · P2 · Draft deletion reports success while storage cleanup fails

Reference: `backend/src/course-versions/course-versions.service.ts:282–305`.

Discard commits database deletion first, then ignores rejected object deletions through `Promise.allSettled`. During a storage outage the UI receives success while files remain, and their database references are gone. There is no durable retry record in this path.

**Evidence — service probe:** forced object deletion to fail; discard still resolved after deleting the version record.

**Fix/acceptance:** persist cleanup work transactionally, process it idempotently with retries and expose unresolved cleanup operationally. Test storage failure followed by recovery. Apply the same durable-cleanup policy to revision-copy compensation, which also suppresses cleanup failures.

### F12 · P2 · Slow media responses can show the wrong selected lesson

Reference: `frontend/src/app/student/courses/[courseId]/course-client.tsx:99–119`.

`openContent` immediately selects a lesson but applies the eventual signed URL without checking whether it is still selected. Click A, then B; if B resolves first and A last, the heading/selection says B while the viewer receives A's URL. An older response can also overwrite loading/error state.

**Evidence — probe:** executed the actual callback with deferred responses and obtained selected B plus URL A.

**Fix/acceptance:** cancel superseded requests or gate all result/error/loading updates by request identity. Test fast switching with reversed response order, including media → text.

### F13 · P2 · Failed course creation can clear the entered form

Reference: `frontend/src/app/teacher/courses/new/create-course-client.tsx:72`.

The uncontrolled form action is `(formData) => void submit(formData)`. It returns immediately while asynchronous validation/API handling continues. React's form-action reset behavior therefore treats the action as returned successfully; errors handled inside `submit` do not preserve the uncontrolled field values. Even awaiting a function that catches errors and returns normally needs deliberate reset handling.

**Evidence — code and installed React implementation:** `frontend/node_modules/react-dom/cjs/react-dom-client.development.js:8940–8956` schedules form reset around the action. A real-browser reset test remains outstanding.

**Fix/acceptance:** use a prevented submit handler with explicit success-only reset, or controlled fields/action state that preserve failed input. Test a local validation failure, backend validation error and disconnected network; title, description and selections must remain intact.

### F14 · P2 · Approvers cannot see images attached to quiz questions

Reference: `frontend/src/app/approver/course-reviews/[versionId]/review-client.tsx:301–320`.

The review payload includes question-image metadata and an approver-authorized image URL path exists, but question rendering only shows text/options. A question such as “What is shown in this diagram?” cannot be assessed properly before approval. The new video/document preview does not cover these images.

**Evidence — code.** Render question images through the authorized signed URL flow with expiry renewal/error handling. Test a submitted course with illustrated questions in both quizzes and confirm answer correctness remains visible only to authorized author/reviewer roles.

## Requirement gaps to resolve explicitly

These are separate from the fourteen defect mechanisms above. Implement them or record an agreed specification change; do not silently count them as delivered.

| ID | Gap and evidence | Acceptance |
| --- | --- | --- |
| G01 | Student scores/history: Pre-Test submit and revisit redirect immediately; the frontend does not consume Post-Test history. `post-test.service.ts:239–259` also filters history to currently PUBLISHED versions, hiding old attempts after replacement/unpublish. Blueprint requires own scores and preserved attempt history. | Students can revisit scores and their attempt history across version replacement, under an explicit historical-access policy. |
| G02 | Teacher analytics API exists, but teacher pages do not call it or offer learner, score and pass-rate views. SRS FR-AN-01–04 describe these features. | An owning Teacher can navigate to the course analytics and reconcile statistics with recorded attempts/enrollments. |
| G03 | Category management is exposed by backend APIs but Owner create/edit UI is absent; teacher course editing also lacks category reassignment despite the API. | Provide the required management paths and verify catalog updates after edits. |
| G04 | Storage health: `health.controller.ts` returns liveness only and `readiness.indicator.ts` checks PostgreSQL only. Blueprint section 5 explicitly requires bucket accessibility reporting and disabling uploads when storage is offline. | A storage outage produces a clear readiness/dependency signal and actionable upload UI state. Keep liveness semantics separate if desired. |
| G05 | Blueprint section 3 says the editor continuously autosaves. The current editor uses manual save and a warning. | Either implement persistence/dirty-state protection, including submit/navigation, or update the agreed requirement and document manual-save behavior. |
| G06 | Four-language support is partial: shell/catalog use translations, but substantial authoring, approval, assessment and Owner content remains hardcoded English. | Exercise the required workflows in th/en/zh-CN/ja, or formally narrow the localization requirement. |

## Coverage and verification

The review traced the backend's 65 decorated HTTP routes by controller/service and their frontend consumers, across Student, Teacher, Approver and Owner. Areas covered: authentication/role guards and cache behavior; course ownership/eligibility; authoring and review state transitions; enrollment; Pre-Test/Post-Test flows; lesson, cover and question-image storage; analytics; frontend forms and async state; Prisma relations/migrations; Docker networking/configuration and health. Requirements were checked against the SRS v1.5 and business-rules blueprint. Route inventory coverage does not mean all 65 routes received new live HTTP tests.

| Validation | Result and scope |
| --- | --- |
| Backend unit suite, preceding review of this working tree | 264 passed; 5 database tests skipped in the ordinary unit run. |
| Backend E2E suite, preceding review | 55 passed across 6 suites. These do not substitute for browser journeys or live storage. |
| PostgreSQL integration, this audit | 5 passed with `npm run test:integration` outside the sandbox. Initial sandbox execution could not connect to localhost:5432; rerunning with permitted local connectivity passed. Fixtures are UUID-scoped and cleaned by the suite. |
| Frontend/backend typecheck, lint and production builds, preceding review | Passed. No application edits were made afterward by this audit. |
| Targeted behavior probes | Earlier review reproduced F01, F02, F04 and F05; follow-up probes reproduced F09, F10, F11 and F12. These use simulated dependencies or extracted frontend functions. |
| Whitespace validation | `git diff --check` passed. |
| Real-browser journeys | Not completed: browser runtime bootstrap failed with `Importing module "node:process" is not allowed in node_repl`. UI conclusions are source/probe based, not visual sign-off. |
| Live local authentication/storage/deployment and concurrency load | Not certified by this audit. No deployment, real-object overwrite test or production load test was performed. |

Previously applied fixes were retained: normal expired Pre-Test finalization to COMPLETED/0 and content unlock; the bodyless expiry endpoint; archived lesson-media denial; backend outbound Docker network; separate public S3 endpoint/MinIO port; approver lesson previews and renewal; removal of the Teacher's Owner-only Delete Course action; and all 24 Owner chart buckets with actual zero values. Related remaining edge cases are explicitly F02, F04 and F14, rather than treating those fixes as wholly absent.

## Recommended implementation order

1. Close F01–F03 together around publication immutability and archived access; add adversarial state/asset tests before release.
2. Repair draft/asset consistency: F06–F08, F10–F11. Include PostgreSQL constraint tests and injected storage failures.
3. Repair user journeys: F04–F05, F09, F12–F14, then run real-browser checks across all four roles when browser tooling is available.
4. Resolve G01–G06 against the agreed requirements and complete the live local authentication, MinIO/browser URL and deployment checks.

For each fix, use the acceptance case under its finding as a regression criterion. Re-review the shared policy and neighboring endpoints after changes, rather than testing only the originally failing button.
