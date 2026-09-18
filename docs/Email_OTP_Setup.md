# Email OTP authentication setup

Current contract: 12 September 2026. No password or SSO login is supported.

## Mock domain: Mailpit (current development setup)

`@x.ac.th` is fictitious and has no real mailbox. Development therefore uses Nodemailer SMTP delivery into Mailpit, not Resend. OTP generation, hashing, expiry and single-use checks remain unchanged. Captured email is not proof of ownership of a real institutional mailbox; anyone with inbox access can see the codes.

Run the standalone inbox yourself from the project root:

```sh
docker compose -f docker-compose.mailpit.yml up -d
```

This standalone file needs no application/database secrets and starts no application services. It binds SMTP and the inbox only to localhost, with no outbound container network. The official Mailpit image uses SMTP port 1025 and inbox port 8025 ([Mailpit Docker documentation](https://mailpit.axllent.org/docs/install/docker/)).

Set these values in `backend/.env` (not frontend/.env):

```dotenv
NODE_ENV=development
OTP_EMAIL_PROVIDER=mailpit
MAILPIT_HOST=127.0.0.1
MAILPIT_SMTP_PORT=1025
OTP_FROM_EMAIL=Institute X <no-reply@x.ac.th>
```

Keep your existing `DATABASE_URL` and valid `OTP_HASH_SECRET`. No `RESEND_API_KEY` is needed in Mailpit mode. Restart your local backend yourself after configuration. With backend and frontend running, request an OTP for e.g. `student@x.ac.th`, open `http://localhost:8025`, read the captured code and enter it on the login page. All mock recipients share this inbox.

Development defaults to Mailpit when `OTP_EMAIL_PROVIDER` is absent. Mailpit is rejected in production by both environment validation and the sender. The existing full-stack production Compose continues using Resend; it does not enable this mock inbox. If a backend runs inside a container, localhost is not the host machine—configure an explicitly reachable Mailpit host/network rather than using `127.0.0.1`.

## Configuration

For real email delivery, set `OTP_EMAIL_PROVIDER=resend` and configure `DATABASE_URL`, a randomly generated `OTP_HASH_SECRET` (at least 32 characters), `RESEND_API_KEY`, and `OTP_FROM_EMAIL` in `backend/.env`. Configure a verified sender identity in your mail provider and real recipient addresses; a fictitious domain cannot receive real email. Keep actual secrets out of Git and frontend environment variables. No live delivery has been verified in this implementation round.

`frontend/.env` needs only the server-side `BACKEND_BASE_URL` for authentication. The browser uses same-origin Next.js API routes; the backend token stays inside an HttpOnly cookie. Production requires HTTPS because the cookie is Secure.

Redis uses `REDIS_URL`, optional configured password and `AUTH_CACHE_SIGNING_KEY`. Cache TTL defaults to 60 seconds and is bounded by session expiry. PostgreSQL validates sessions when Redis is unavailable.

## Database transition

Back up PostgreSQL before applying migrations. Migration `202609120001_email_otp_auth` removes username/password-hash columns, removes existing database sessions, adds OTP challenges and role audits, and requires legacy users to verify their mailbox before access. It does not delete course data or assigned roles. Old Redis session namespaces are no longer accepted.

Apply the prepared migrations with `cd backend` then `npx prisma migrate deploy`. The migration has not been applied during this round; do not consider live login ready until this step and mail configuration are complete.

## Initial Registrar

1. Sign in using an existing institutional mailbox and its delivered OTP. The first verified login creates a STUDENT account only.
2. Set `BOOTSTRAP_REGISTRAR_EMAIL` to that verified mailbox and run `npm run bootstrap:registrar` from the backend with its environment loaded.
3. Log out and log in again to load the new Registrar role. Switch to `/registrar` and assign additional roles to existing verified users.

Bootstrap is a privileged operator recovery/provisioning action, not a public endpoint. API role changes are audited with a Registrar actor; the bootstrap script itself is not currently captured in that audit table.

Assigning `TEACHER` by a Registrar grants Teacher workspace and course-authoring access immediately. The legacy Teacher-permission request routes are not part of the current authorization flow. Approvers review submitted Course Versions, not Teacher role assignments.

## Local acceptance status

The Playwright suite in `frontend/tests/e2e` has verified against the local frontend, backend and Mailpit:

- Mailpit OTP delivery and successful browser login.
- Rejection of invalid institutional domains and incorrect or reused OTPs.
- Five-request-per-15-minute mailbox limit.
- HttpOnly, SameSite=Lax session cookies; refresh persistence and logout.
- CSRF rejection and unauthenticated workspace redirects.
- Role switching for the five supported roles.
- Immediate Teacher authoring access after Registrar assignment.
- Natural five-minute OTP expiry without altering the application clock or database.
- Pre-Test/Post-Test attempt rules, the 80% threshold, course version lifecycle, real MinIO upload and Executive analytics reconciliation against controlled data.

Still requiring dedicated coverage:

- PostgreSQL concurrency races for OTP claims, request limits and role-audit writes.
- Production email delivery. Local Mailpit delivery is not evidence that a real provider or mailbox works.
