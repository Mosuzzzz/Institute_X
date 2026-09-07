'use client';

import Image from 'next/image';
import { useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useAppLanguage } from '../lib/language';
import { getSessionHomePath, SSO_STATE_KEY } from '../lib/sso-session';
import { commonCopy } from '../lib/app-copy';
import LanguageSelector from './language-selector';
import { authUi, commonUi } from './ui-styles';

function subscribeToSession(listener: () => void) {
  window.addEventListener('storage', listener);
  window.addEventListener('pageshow', listener);
  window.addEventListener('focus', listener);
  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener('pageshow', listener);
    window.removeEventListener('focus', listener);
  };
}

const pendingSession = () => undefined;

const copy = {
  th: {
    languageLabel: 'เลือกภาษา',
    personnelHeading: 'สำหรับบุคลากร',
    signIn: 'ลงชื่อเข้าใช้ด้วย X SSO',
    accessNote: 'ใช้บัญชีมหาวิทยาลัยของคุณเพื่อเข้าสู่ระบบ',
  },
  en: {
    languageLabel: 'Select language',
    personnelHeading: 'For personnel',
    signIn: 'Sign in with X SSO',
    accessNote: 'Use your university account to sign in',
  },
  'zh-CN': {
    languageLabel: '选择语言',
    personnelHeading: '教职员工',
    signIn: '使用 X SSO 登录',
    accessNote: '使用您的大学账户登录',
  },
  ja: {
    languageLabel: '言語を選択',
    personnelHeading: '教職員の方',
    signIn: 'X SSOでログイン',
    accessNote: '大学のアカウントを使用してログインしてください',
  },
} as const;

interface AuthenticationPageProps {
  ssoLoginUrl: string;
}

export default function AuthenticationPage({ ssoLoginUrl }: AuthenticationPageProps) {
  const router = useRouter();
  const [language, setLanguage] = useAppLanguage();
  const text = copy[language];
  const homePath = useSyncExternalStore(subscribeToSession, getSessionHomePath, pendingSession);

  useEffect(() => {
    if (homePath) router.replace(homePath);
  }, [homePath, router]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const startSsoLogin = () => {
    const state = crypto.randomUUID();
    const redirectUri = `${window.location.origin}/auth/callback`;
    const loginUrl = new URL(ssoLoginUrl);

    sessionStorage.setItem(SSO_STATE_KEY, state);
    loginUrl.searchParams.set('redirect_uri', redirectUri);
    loginUrl.searchParams.set('state', state);
    window.location.assign(loginUrl.toString());
  };

  // Hide the sign-in form during hydration and while routing an active session.
  if (homePath !== null) {
    return (
      <main className={commonUi.callbackShell}>
        <section className={commonUi.callbackPanel} role="status" aria-live="polite">
          <span className={commonUi.spinner} aria-hidden="true" />
          <h1>{commonCopy[language].checking}</h1>
        </section>
      </main>
    );
  }

  return (
    <main className={authUi.shell}>
      <nav className="fixed top-[clamp(18px,3vw,34px)] right-[clamp(18px,3vw,42px)] z-10 max-[560px]:top-4 max-[560px]:right-4" aria-label={text.languageLabel}>
        <LanguageSelector value={language} label={text.languageLabel} onChange={setLanguage} />
      </nav>

      <section className={authUi.panel} aria-labelledby="authentication-title">
        <header className={authUi.brand}>
          <Image
            className={authUi.logo}
            src="/logoX.png"
            alt="Institute X"
            width={1238}
            height={1238}
            priority
          />
          <h1 id="authentication-title">Authentication Service</h1>
        </header>

        <div className={authUi.rule} aria-hidden="true" />

        <div className={authUi.access}>
          <h2>{text.personnelHeading}</h2>
          <button className={authUi.ssoButton} type="button" onClick={startSsoLogin}>
            <span>{text.signIn}</span>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M7 4.75 12.25 10 7 15.25" />
            </svg>
          </button>
          <p className="text-center text-sm leading-6 text-muted">{text.accessNote}</p>
        </div>
      </section>
    </main>
  );
}
