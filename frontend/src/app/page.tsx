import Image from 'next/image';

const DEFAULT_SSO_LOGIN_URL = 'https://mock-university-sso.vercel.app';

export default function HomePage() {
  const ssoLoginUrl = process.env.NEXT_PUBLIC_SSO_LOGIN_URL ?? DEFAULT_SSO_LOGIN_URL;

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="authentication-title">
        <header className="brand-lockup">
          <Image
            className="x-mark"
            src="/logoX.png"
            alt="Institute X"
            width={1238}
            height={1238}
            priority
          />
          <h1 id="authentication-title">Authentication Service</h1>
        </header>

        <div className="panel-rule" aria-hidden="true" />

        <div className="personnel-access">
          <h2>สำหรับบุคลากร</h2>
          <a className="sso-link" href={ssoLoginUrl}>
            <span>ลงชื่อเข้าใช้ด้วย X SSO</span>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M7 4.75 12.25 10 7 15.25" />
            </svg>
          </a>
          <p className="access-note">ใช้บัญชีมหาวิทยาลัยของคุณเพื่อเข้าสู่ระบบ</p>
        </div>
      </section>
    </main>
  );
}
