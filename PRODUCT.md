# Institute X

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

An online learning system for Institute X, a vocational school. The current business rules define five user roles:

- STUDENT: Browse eligible courses, study learning content, take assessments, and view score history.
- TEACHER: Create and edit their own courses, submit courses for review, and view analytics for their own courses.
- APPROVER: Review course content before publication and review user reports.
- REGISTRAR: Search email-verified accounts, manage roles, and view role-change audit history.
- EXECUTIVE: View system, course, enrollment, completion, score, and major analytics with read-only access.

Every verified account always retains STUDENT. Additional permissions are additive, but workspaces are separated by role, and the workspace switcher lists only assigned roles. OWNER and ADMIN are not supported roles.

## Product Purpose

Centralize the institution's online learning, provide on-demand access to approved courses, reduce manual assessment work through automatic grading, control publication quality, and provide usage information to teachers and executives.

Product success means students can access learning they are eligible for, teachers can submit complete courses through the review process, and stakeholders can see learning outcomes and usage within their permission boundaries. Numerical success metrics are not yet defined.

## Operating Context

- Only institutional email addresses ending in @x.ac.th are accepted. Authentication uses Email OTP, with no passwords, SSO, or public account-registration endpoint.
- New accounts are created only after successful OTP verification and start with STUDENT. Registrars assign additional roles to verified accounts.
- Registrars assign the TEACHER role. That assignment immediately grants access to Teacher course-authoring capabilities; no separate approval is required.
- Teachers save drafts through explicit save actions. Unsaved text remains local to the current page.
- Approver approval automatically publishes the course version. Rejection requires a review comment.
- Opening an eligible course automatically enrolls the student. Students must submit the Pre-Test before accessing learning content and take the Post-Test after learning.

## Capabilities and Constraints

### Courses and Publication

- Courses include a title, language, at least one category, learning content, a Pre-Test, and a Post-Test. Content can optionally be organized into sections.
- Submission requires at least one content item and at least one question in each assessment. Each question must have at least two options and exactly one correct answer. Uploaded media must be READY.
- OPEN courses are available to all active students. LIMITED courses restrict access by assigned majors under the current business rules. Do not introduce education-level or year-level restrictions from older documents without confirmation.
- Published versions cannot be edited directly. Editing creates a new DRAFT. The existing published version remains available during editing and review; approval of the new version changes the previous version to SUPERSEDED.
- Version states are DRAFT, SUBMITTED, PUBLISHED, REJECTED, UNPUBLISHED, and SUPERSEDED. Rejected versions can be reopened for editing. Teachers can discard drafts or unpublish their own courses; Approvers can unpublish any published course when moderation is required.

### Learning and Assessment

- The catalog displays only courses the student is eligible to access.
- The Pre-Test permits exactly one attempt, with randomized questions and options. Submission records the score and unlocks learning content.
- The Post-Test permits unlimited attempts, has an 80% passing threshold, and preserves every attempt in history.

### Accounts and Permissions

- OTPs contain six digits, expire after five minutes, and can be used only once. Requests are limited to five per email address within 15 minutes, with at most five verification attempts per challenge.
- Browser sessions use HttpOnly cookies. Tokens are not exposed to JavaScript or stored in local/session storage. Mutations require CSRF protection.
- Registrars cannot modify their own roles or remove STUDENT. Role changes record the actor, target, previous and new roles, and timestamp.
- EXECUTIVE has read-only access and cannot modify courses, categories, or roles.

### Technical Scope and Open Decisions

- The existing codebase uses Next.js App Router and React for the frontend; NestJS, Prisma, PostgreSQL, Redis, and MinIO/S3 for the backend and infrastructure.
- The frontend offers Thai, English, Simplified Chinese, and Japanese, with Thai as the default. Language options do not establish that every string has been translated or linguistically reviewed.
- The user confirmed that all functionality must remain usable at every screen size and resolution. Support mobile, tablet, and desktop screens, including portrait and landscape orientations. Adapt layouts to available space, preserve essential functionality on small screens, and prevent content or controls from being clipped in ways that make them unusable.
- A specific device list, browser matrix, and resolution range for testing are not yet defined. Support for all screen sizes is a product requirement, not a claim that the current implementation has been tested at every resolution.
- Network constraints, a required accessibility standard, and other specific user needs are not yet defined.
- Differentiated positioning and comparative evidence are not yet defined. Do not invent competitive claims.

## Brand Commitments

Use the confirmed name Institute X. The existing logo is at frontend/public/logoX.png. The user has not specified additional binding voice or identity requirements. This record does not authorize changes to the logo or visual direction.

## Evidence on Hand

- The user confirmed docs/System_Business_Rules_Blueprint.md as the primary authority. It identifies itself as the current contract, revised 12 September 2026 for Email OTP and multi-role accounts.
- docs/Project Overview.md provides objectives and institutional context. Where it conflicts with the current business rules, the current rules take precedence.
- docs/Institute X eLearning SRS v1.5.md and docs/Institute Xschema Aug 25 2026.md are supporting references. Check their consistency with the current rules before using them.
- docs/Email_OTP_Setup.md documents OTP configuration and operational prerequisites.
- frontend/src/app contains all five role workspaces; frontend/src/lib/language.ts defines supported languages; backend/src and backend/prisma provide implementation and data-structure evidence.
- frontend/public/no_cover.png is a fallback cover image, not evidence of actual course content.
- No testimonials, user-research findings, or numerical outcomes have been confirmed by the user for design claims. Do not fabricate them.

## Product Principles

- Preserve permission boundaries and approval workflows in every workspace.
- Give students access only to eligible courses and make the steps before learning clear.
- Help teachers identify what must be saved and which requirements remain incomplete before submission.
- Preserve published versions and learning history while new versions are developed.
- Display evidence-based data and outcomes within role boundaries; do not add unconfirmed capabilities or claims.
- Preserve complete functionality for every role at every screen size, adapting presentation to available space without reducing system capabilities.
