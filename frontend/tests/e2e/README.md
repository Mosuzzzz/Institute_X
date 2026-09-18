# การทดสอบ End-to-End ของ Institute X

ชุดทดสอบนี้ใช้ระบบจริงในเครื่อง ได้แก่ Next.js ที่พอร์ต `3001`, NestJS ที่พอร์ต `3000`, PostgreSQL, Redis TLS, MinIO และ Mailpit โดยไม่ mock เส้นทางหลักของระบบ

การทดสอบ Authentication จะขอ OTP ผ่านหน้า/API จริง แล้วอ่านรหัสจาก Mailpit ในเครื่องเท่านั้น ไม่มีการ bypass การยืนยันตัวตน และจะไม่บันทึก OTP, session cookie หรือ Playwright storage state ลง Git

## สิ่งที่ต้องเตรียม

- Node.js และ npm ตามที่โปรเจกต์รองรับ
- Docker Desktop หรือ Docker Engine
- ไฟล์ `.env`, `backend/.env` และ `frontend/.env` ตามไฟล์ตัวอย่างของโปรเจกต์
- `backend/.env` ต้องใช้ `OTP_EMAIL_PROVIDER=mailpit`
- `frontend/.env` ต้องมี `BACKEND_BASE_URL=http://localhost:3000`

ติดตั้ง dependencies จากแต่ละ workspace:

```sh
cd backend
npm ci

cd ../frontend
npm ci
```

## เริ่มบริการในเครื่อง

จาก repository root ให้เริ่ม PostgreSQL, Redis และ MinIO ตาม Compose หลักก่อน จากนั้นเริ่ม Mailpit แยกต่างหาก:

```sh
docker compose up -d postgres redis minio minio-init
docker compose -f docker-compose.mailpit.yml up -d
```

Compose หลักมีตัวแปรบังคับของ production backend หากคำสั่งข้างต้นแจ้งว่า `RESEND_API_KEY` หรือค่า OTP ขาดหาย ให้กำหนดค่า placeholder เฉพาะคำสั่งที่เริ่ม infrastructure โดยห้ามนำค่า placeholder ไปใช้กับ production

ตัวอย่างสำหรับ infrastructure ในเครื่องเท่านั้น:

```sh
RESEND_API_KEY=unused-local \
OTP_HASH_SECRET=unused-local-secret-at-least-32-characters \
OTP_FROM_EMAIL=no-reply@x.ac.th \
docker compose up -d postgres redis minio minio-init
```

คัดลอก Redis CA certificate และใช้ migration ล่าสุด:

```sh
docker compose cp redis:/public/ca.crt backend/.redis-ca.crt
cd backend
npx prisma migrate deploy
```

เปิด Backend และ Frontend คนละ terminal:

```sh
cd backend
npm run start:local
```

```sh
cd frontend
npm run dev
```

ตรวจสอบว่าบริการพร้อมก่อนรันทดสอบ:

```sh
curl http://localhost:3000/api/health
curl http://localhost:3001/
curl http://localhost:8025/api/v1/messages
```

## ติดตั้ง Browser ของ Playwright

รันครั้งแรกหรือหลังอัปเดต Playwright:

```sh
cd frontend
npx playwright install chromium firefox webkit
```

## คำสั่งทดสอบ

รันทั้งหมดสาม browser:

```sh
npm run test:e2e
```

รันเฉพาะ core journeys:

```sh
npm run test:e2e:core
```

รันแยกตาม browser หรือไฟล์:

```sh
npx playwright test --project=chromium
npx playwright test --project=webkit --grep @core
npx playwright test tests/e2e/auth.spec.ts --project=chromium
npx playwright test tests/e2e/business-rules.spec.ts --project=chromium
npx playwright test tests/e2e/remaining-workflows.spec.ts --project=chromium
npm run test:e2e:firefox
npm run test:e2e:firefox:core
```

เปิด HTML report:

```sh
npm run test:e2e:report
```

## Environment variables สำหรับ E2E

| ตัวแปร | ค่าเริ่มต้น | หน้าที่ |
|---|---|---|
| `E2E_BASE_URL` | `http://localhost:3001` | URL ของ Frontend ที่ Playwright เปิด |
| `E2E_MAILPIT_URL` | `http://127.0.0.1:8025` | Mailpit API ที่ใช้รับ OTP |
| `E2E_REUSE_SERVER` | ไม่กำหนด | ตั้งเป็น `false` เพื่อให้ Playwright เริ่ม `npm run dev` เอง |
| `E2E_EXISTING_TEACHER_EMAIL` | ไม่กำหนด | ใช้ resume บัญชี QA แบบใช้แล้วทิ้งเมื่อ workflow หลายบทบาทหยุดกลางทาง |

## โครงสร้างชุดทดสอบ

- `auth.spec.ts` — domain validation, OTP, cookie/session, logout, CSRF, rate limit และ unauthenticated redirects
- `business-rules.spec.ts` — OTP expiry 5 นาทีจริง, assessment attempts/80%, lifecycle/versioning/unpublish, MinIO upload และ controlled Executive analytics
- `role-access.spec.ts` — สิทธิ์เข้า workspace, workspace switcher และ backend authorization
- `responsive-localization.spec.ts` — viewport ตัวแทนและการคงค่าภาษาไทย อังกฤษ จีน และญี่ปุ่น
- `remaining-workflows.spec.ts` — role assignment, Teacher authoring, refresh persistence, catalog entry และ invalid-resource state
- `support/auth.ts` — helper ขอ/อ่าน/ยืนยัน OTP โดยไม่สร้าง storage-state artifact
- `support/diagnostics.ts` — เก็บ console errors และ failed requests เป็น attachment

## Test artifacts และความปลอดภัย

- รันด้วย worker เดียว เพื่อลด race condition และควบคุมขีดจำกัด OTP 5 ครั้งต่อ 15 นาที
- สร้าง screenshot เฉพาะเมื่อทดสอบล้มเหลว
- เก็บ video และ trace เฉพาะเมื่อทดสอบล้มเหลว
- `playwright-report/`, `test-results/` และ `blob-report/` ถูก ignore จาก Git
- ห้าม commit OTP, cookie, token, `.env` หรือ storage-state file
- ใช้เฉพาะ Mailpit ในเครื่อง ห้ามส่งอีเมลจริงหรือใช้ข้อมูล production
- บัญชีทดสอบใหม่ใช้ prefix `qa-e2e-`; ลบเฉพาะข้อมูล prefix นี้หลังทดสอบ

### Firefox บน macOS 27

Playwright Firefox ไม่สามารถเริ่มบน macOS 27 ได้จากปัญหา Firefox sandbox โดยอาจแสดงข้อความที่ทำให้เข้าใจผิดว่า `Could not find profile folder` การเปลี่ยน `TMPDIR` หรือสร้าง profile directory เองไม่สามารถแก้ปัญหานี้ได้

โปรเจกต์จึงรัน Firefox ใน Playwright Linux container โดยตัวช่วย `scripts/playwright_container.py` จะ forward `localhost:3001` และ `localhost:8025` กลับมายังบริการบน host ทำให้ URL และ CSRF origin ยังตรงกับการรันปกติ:

```sh
npm run test:e2e:firefox:core
```

Frontend, Backend และ Mailpit ต้องทำงานอยู่บน host ก่อนสั่งคำสั่งนี้ ภาพทดสอบยังคงเป็น Firefox ของ Playwright เวอร์ชันเดียวกับ dependency ของโปรเจกต์ ไม่ใช่ Chromium ที่เปลี่ยนชื่อ project
