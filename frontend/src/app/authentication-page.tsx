'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { SSO_STATE_KEY } from '../lib/sso-session';
import LanguageSelector, { type Language } from './language-selector';

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
  const [language, setLanguage] = useState<Language>('th');
  const text = copy[language];

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

  return (
    <main className="auth-shell">
      <nav className="language-nav" aria-label={text.languageLabel}>
        <LanguageSelector value={language} label={text.languageLabel} onChange={setLanguage} />
      </nav>

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
          <h2>{text.personnelHeading}</h2>
          <button className="sso-link" type="button" onClick={startSsoLogin}>
            <span>{text.signIn}</span>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M7 4.75 12.25 10 7 15.25" />
            </svg>
          </button>
          <p className="access-note">{text.accessNote}</p>
        </div>
      </section>
    </main>
  );
}
