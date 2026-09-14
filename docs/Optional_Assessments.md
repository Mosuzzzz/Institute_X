# Optional assessments and lesson completion

Effective 14 September 2026: Pre-Test and Post-Test are independently optional. This supersedes prior mandatory-test wording in historical SRS/review reports.

| Configuration | Content access | Course completion |
|---|---|---|
| No tests | Enroll to unlock | Complete every lesson |
| Pre-Test only | Complete Pre-Test first | Complete every lesson |
| Post-Test only | Enroll to unlock | Complete every lesson and pass Post-Test |
| Both | Complete Pre-Test first | Complete every lesson and pass Post-Test |

Configured tests must contain valid questions before submission. To omit a test, remove the quiz entirely rather than leaving it empty. Existing single-attempt Pre-Test and unlimited Post-Test/80% passing rules are unchanged.

Students use **Mark lesson complete** in the viewer. The backend stores completion per student and content item, checks enrollment/eligibility/conditional Pre-Test, and rejects stale publication. Selecting a lesson alone never marks it complete. New course revisions have independent lesson progress.

## Local setup

The new `202609140001_lesson_completions` migration adds the lesson completion table without deleting existing course or assessment data. It does not backfill completions from old views or scores. Existing students must mark lessons complete under the new rule, even if they previously passed a Post-Test.

Apply migrations yourself before running the updated backend:

```sh
cd backend
npx prisma migrate deploy
npx prisma generate
```

Then restart the backend and local frontend (`npm run dev`, not an old production build). No Docker, server or deployment was started during implementation.
