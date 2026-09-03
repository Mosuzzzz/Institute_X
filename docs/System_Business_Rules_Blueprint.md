# Institute X: Authoritative Business Rules & System Architecture Blueprint

> **Status:** Final & Frozen (Single Source of Truth)  
> **Date:** September 2026  
> **Scope:** Full-stack specifications covering Database, Backend (NestJS + Prisma), and Frontend (Next.js App Router).

---

## 1. Role Boundaries & Access Control (Strict Role Separation)

To prevent routing conflicts, unauthorized actions, and UI confusion, each of the 4 roles has strictly demarcated boundaries.

| Role | Default Workspace Route | Primary Responsibilities | Strict Boundaries (What they CANNOT do) |
| :--- | :--- | :--- | :--- |
| **STUDENT** | `/student` | - Browse eligible courses<br>- Auto-enroll upon starting a course<br>- Complete mandatory 1-attempt Pre-Test<br>- View text & media content<br>- Attempt Post-Tests (unlimited attempts, 80% passing mark)<br>- View own scores & history | - Cannot access any `/teacher`, `/approver`, or `/owner` routes.<br>- Cannot bypass Pre-Test to access content.<br>- Cannot view courses from other majors when configured as `LIMITED`. |
| **TEACHER** | `/teacher` | - Request course creation permission (`/teacher/permission`)<br>- Create and edit Course Versions (in `DRAFT` status)<br>- Organize content into optional Sections<br>- Add Text, Video, Audio, Image, Document content<br>- Create Pre-Test (mandatory) and Post-Test (optional)<br>- Submit Draft Version for Approver review<br>- Reopen rejected drafts for correction<br>- Discard unwanted draft revisions<br>- Unpublish/republish own published courses<br>- View analytics for own courses | - **Cannot create courses without APPROVED permission.**<br>- **Cannot directly edit `PUBLISHED` content.** Changes must create a new Version.<br>- **Cannot approve own or others' courses.**<br>- Cannot access Approver review queues or Owner administrative panels. |
| **APPROVER** | `/approver` | - Review Teacher Permission requests (`APPROVE` / `REJECT`)<br>- Review Course Version submissions (`APPROVE` / `REJECT` with mandatory comment for rejection)<br>- View submitted content and quiz structures in read-only mode | - Cannot create, edit, or author courses.<br>- Cannot modify course content during review.<br>- Cannot access Owner system-wide analytics. |
| **OWNER** | `/owner` | - Executive Dashboard: Active users, course totals, enrollments, assessment statistics, traffic & peak hours<br>- Central Category Management (Create, Edit, List course categories)<br>- Administrative Course Moderation (Unpublish / Archive courses for institutional policy) | - Does not participate in routine course approval queues (handled strictly by Approver).<br>- Does not author courses directly. |

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
  (By Teacher/Owner)        (When v(n+1) Published)
```

### Key Business Rules for Course Versions:
1. **Auto-Publication upon Approval (SRS FR-AP-07 & FR-AP-08):**
   - When an Approver approves a submitted version, the backend automatically transitions it to `PUBLISHED` and sets `publishedAt = now()`.
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
| **Pre-Test** | Mandatory | Must have at least 1 Question. Each question must have $\ge 2$ options and exactly 1 correct answer. |
| **Post-Test** | Optional | If created, must have at least 1 Question conforming to the same question rules ($\ge 2$ options, 1 correct). |

### UI Experience:
- The editor continuously autosaves/persists state into the database.
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
3. **Mandatory Pre-Test Barrier:**
   - Students cannot view course learning content until they complete the Pre-Test.
   - Pre-Test allows exactly **1 attempt**.
   - Questions and options are randomized.
   - Submitting the Pre-Test records score and immediately unlocks the course content.
4. **Post-Test:**
   - Can be attempted unlimited times.
   - Passing criteria is 80%.
   - Full history of attempts is preserved for teacher and student analytics.

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

## 6. SSO Contract & Role Mapping

- Authentication source: `https://mock-university-sso.vercel.app`
- Direct role mapping supported:
  - `STUDENT` $\rightarrow$ Student role, requires valid `major_code`.
  - `TEACHER` $\rightarrow$ Teacher role (subject to internal `TeacherPermissionRequest`).
  - `APPROVER` $\rightarrow$ Course & Teacher Approver role.
  - `OWNER` $\rightarrow$ Executive Director role.
- Redirection upon SSO Callback:
  - Strictly routes according to verified role (`/student`, `/teacher`, `/approver`, or `/owner`).
