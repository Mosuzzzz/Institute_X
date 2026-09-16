# Institute X: Authoritative Business Rules & System Architecture Blueprint

> **Status:** Current contract, revised 14 September 2026: Email OTP, multi-role accounts and optional assessments
> **Date:** September 2026  
> **Scope:** Full-stack specifications covering Database, Backend (NestJS + Prisma), and Frontend (Next.js App Router).

---

## 1. Role Boundaries & Access Control (Strict Role Separation)

The only supported roles are STUDENT, TEACHER, APPROVER, REGISTRAR and EXECUTIVE. Every verified account retains STUDENT; additional roles are assigned by a Registrar. Permissions are additive, but each workspace is isolated and the switcher lists only assigned roles. OWNER and ADMIN are not supported.

STUDENT learns; TEACHER authors only after separate teaching approval; APPROVER reviews teaching requests and submitted courses; REGISTRAR manages existing verified users' roles; EXECUTIVE has read-only analytics.

| Role | Workspace | Responsibility |
|---|---|---|
| STUDENT | `/student` | Eligible catalog, Pre-Test gate, lessons and Post-Test history |
| TEACHER | `/teacher` | Teaching permission request, own draft authoring and publication visibility |
| APPROVER | `/approver` | Teaching requests and submitted course reviews with media previews |
| REGISTRAR | `/registrar` | Existing verified user search, role assignment/removal and role audit history |
| EXECUTIVE | `/executive` | Read-only system, course, enrollment, completion, score and major analytics |
---

## 2. Course Lifecycle & Versioning State Machine

All course content revisions are strictly versioned. A course never mutates live content.

```
       [ Teacher creates Course ]
                   │
                   ▼
         ┌───────────────────┐
         │       DRAFT       │ ◄──────────┐ (Teacher reopens)
         └─────────┬─────────┘            │
                   │ (Teacher Submits)     │
                   ▼                      │
         ┌───────────────────┐            │
         │     SUBMITTED     │            │
         └────┬─────────┬────┘            │
   (Approve)  │         │  (Reject)       │
              ▼         ▼                 │
     ┌─────────────┐   ┌─────────────┐    │
     │  PUBLISHED  │   │  REJECTED   ├────┘
     └──────┬──────┘   └─────────────┘
            │
            ├──────────────────────────┐
            ▼                          ▼
    ┌───────────────┐          ┌───────────────┐
    │  UNPUBLISHED  │          │  SUPERSEDED   │
    └───────────────┘          └───────────────┘
  (By owning Teacher)      (When v(n+1) Published)
```

### Key Business Rules for Course Versions:
1. **Auto-Publication upon Approval (SRS FR-AP-07 & FR-AP-08):**
   - When an Approver approves a submitted version, the backend automatically transitions it to `PUBLISHED` and sets `publishedAt = now()`.
   - An Approver may transition any `PUBLISHED` version to `UNPUBLISHED` when moderation is required.
   - **No manual "Publish" button is required from the Teacher.**
2. **Editing Published Courses (SRS FR-CM-07 & FR-CM-08):**
   - Published versions are immutable.
   - When a Teacher edits a published course, the system creates a new `DRAFT` version (`versionNumber = current + 1`), copying sections, content items, and quizzes from the active version.
   - While version `v(n+1)` is in `DRAFT` or `SUBMITTED`, version `vn` remains `PUBLISHED` and live for students.
   - Once `v(n+1)` is approved, `vn` automatically transitions to `SUPERSEDED`.
3. **Discarding Draft Revisions:**
   - If a Teacher creates a new revision `v(n+1)` and decides to cancel editing, they can click "Discard Draft".
   - The system deletes the unapproved `DRAFT` record and related draft assets, cleanly restoring the course back to only its currently published version.
4. **Rejection & Reopening (SRS FR-AP-05 & FR-AP-06):**
   - Approver rejection requires a non-empty `reviewComment`.
   - Status transitions to `REJECTED`.
   - Teacher views the reviewer's feedback and clicks "Reopen for Editing" (`POST /api/course-versions/:id/reopen`), which transitions the version back to `DRAFT` to allow corrections without creating a messy new version number.

---

## 3. Course Structure & Pre-Submission Validation Checklist

A Draft Course Version cannot be submitted to the Approver until all mandatory items pass validation:

| Component | Requirement | Validation Rule |
| :--- | :--- | :--- |
| **Title & Meta** | Mandatory | Course title must not be empty; Language code must be specified (e.g. `th`). |
| **Category** | Mandatory | At least 1 Category must be assigned to the course (`course_categories`). |
| **Eligibility** | Mandatory | Must be `OPEN` OR if `LIMITED`, at least 1 Major must be selected (`course_allowed_majors`). |
| **Learning Content** | Mandatory | At least 1 `ContentItem` must exist. |
| **Sections** | Optional | Content can be organized into Sections or remain unsectioned. |
| **Media Assets** | Mandatory Condition | All uploaded media (cover, content video/audio/doc, question image) must have status `READY`. Uploads in `PENDING` or `FAILED` will block submission. |
| **Pre-Test** | Optional | If added, must have at least 1 Question. Each question must have $\ge 2$ options and exactly 1 correct answer. An empty configured quiz blocks submission; remove it to omit the test. |
| **Post-Test** | Optional | If added, must have at least 1 Question conforming to the same question rules ($\ge 2$ options, exactly 1 correct answer). |

### UI Experience:
- The editor uses explicit **Save Draft** actions. Unsaved typed changes remain local to the current page and are not persisted until the Teacher presses Save Draft or another clearly labelled save/add action.
- A **Pre-submission Checklist card** in the Teacher UI indicates green checkmarks for completed requirements and highlights remaining missing items.
- The "Submit for Review" button remains disabled until all mandatory checklist items are green.

---

## 4. Student Catalog, Enrollment & Learning Rules

1. **Clean Catalog Display:**
   - The Student catalog (`/student/courses`) displays only courses that the student is academically eligible to take:
     - All `OPEN` courses.
     - `LIMITED` courses where the course's allowed majors includes the student's `majorId`.
2. **Automatic Enrollment:**
   - Clicking an eligible course enrolls the student automatically (`CourseEnrollment` record created if not already enrolled) and logs a `CourseAccessEvent`.
3. **Conditional Pre-Test Barrier:**
   - If configured, students cannot view learning content until they complete the Pre-Test. Without one, enrollment immediately unlocks content and media.
   - Pre-Test allows exactly **1 attempt**.
   - Questions and options are randomized.
   - Submitting the Pre-Test records score and immediately unlocks the course content.
4. **Post-Test:**
   - Post-Test is optional. If configured, every lesson must be completed before starting it, and passing is required for course completion.
   - Can be attempted unlimited times.
   - Passing criteria is 80%.
   - Full history of attempts is preserved for teacher and student analytics.
5. **Lesson-based completion and progress:**
   - Students explicitly mark each lesson complete using the lesson viewer. Completion is persisted per student/content item, cannot bypass enrollment or Pre-Test, and repeated requests are idempotent.
   - Without Post-Test, all lessons completed means 100%. With Post-Test, lesson completion accounts for up to 90%; all lessons plus a pass means 100%. A configured incomplete Pre-Test keeps progress at 0%.
   - Completion is not inferred from opening a lesson or downloading media. New version content has new identifiers and its lesson progress starts afresh; prior completion records/history remain available.
   - Executive completed-enrollment counts include students who fulfilled all configured requirements in any released version, counted once per course/student. Catalog progress reflects the current published version.

---

## 5. Media & Storage Architecture (MinIO / S3)

To eliminate "Object storage is not configured" and stuck `PENDING` assets:

1. **Direct Presigned Flow:**
   ```
   [Frontend] ──1. POST /media/.../initialize-upload──> [Backend] (Creates DB asset PENDING, returns Presigned PUT URL)
   [Frontend] ──2. Direct PUT binary payload──────────> [MinIO / S3 Bucket]
   [Frontend] ──3. POST /media/.../complete───────────> [Backend] (Runs HEAD request to verify file & sets status READY)
   ```
2. **Storage Health Verification:**
   - Backend `/api/health` must report MinIO/S3 bucket accessibility.
   - Frontend must disable upload inputs with a user-friendly error notice if storage service is offline.
3. **Safe Deletion & Cleanup:**
   - Deleting a Draft deletes associated object keys in MinIO to avoid orphaned files.

---

## 6. Email OTP Authentication and Role Management

- Only exact `@x.ac.th` email addresses are accepted; no passwords, SSO or public account-creation endpoint.
- OTPs contain six cryptographically random digits, expire after five minutes, are stored as email-bound HMAC hashes, and may be consumed only once. Each mailbox has a five-request/15-minute limit and each challenge permits at most five verification attempts.
- No new User exists before successful OTP verification. New users receive STUDENT only; existing users retain their assigned roles.
- The browser receives an opaque HttpOnly, SameSite=Lax session cookie (Secure in production). Tokens are not returned to browser JavaScript or stored in local/session storage. Mutation routes require a custom CSRF header and reject cross-origin requests.
- Redis caches verified local sessions for 60 seconds by default (configurable 15–300 seconds, bounded by session expiry). Keys use token digests, values are integrity-signed, and cache failure falls back to PostgreSQL session validation, not to an identity provider.
- Registrar role changes target existing email-verified accounts, disallow self-modification and modification of the mandatory STUDENT role, and record actor, target, old/new roles and timestamp atomically. Relevant cached sessions are invalidated.
- REGISTRAR assignment of TEACHER grants course-authoring access immediately. APPROVER reviews submitted course versions, not Teacher role assignment; EXECUTIVE cannot mutate courses, categories or roles.
- Initial Registrar provisioning is an operator bootstrap of an already mailbox-verified account, not public user creation. See `Email_OTP_Setup.md` for the migration and operational prerequisites.
