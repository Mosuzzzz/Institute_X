'use client';

import Image from 'next/image';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';

type Language = 'th' | 'en' | 'zh-CN' | 'ja';

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

const languageOptions: ReadonlyArray<{ value: Language; label: string }> = [
  { value: 'th', label: 'ภาษาไทย' },
  { value: 'en', label: 'English' },
  { value: 'zh-CN', label: '中文' },
  { value: 'ja', label: '日本語' },
];

interface AuthenticationPageProps {
  ssoLoginUrl: string;
}

export default function AuthenticationPage({ ssoLoginUrl }: AuthenticationPageProps) {
  const [language, setLanguage] = useState<Language>('th');
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const languageTriggerRef = useRef<HTMLButtonElement>(null);
  const text = copy[language];
  const selectedLanguage = languageOptions.find((option) => option.value === language)!;

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!isLanguageMenuOpen) {
      return;
    }

    const selectedOption = languageMenuRef.current?.querySelector<HTMLButtonElement>(
      '[role="option"][aria-selected="true"]',
    );
    selectedOption?.focus();

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!languageMenuRef.current?.contains(event.target as Node)) {
        setIsLanguageMenuOpen(false);
      }
    };

    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsLanguageMenuOpen(false);
        languageTriggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isLanguageMenuOpen]);

  const selectLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    setIsLanguageMenuOpen(false);
    languageTriggerRef.current?.focus();
  };

  const moveBetweenLanguageOptions = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const options = Array.from(
      languageMenuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [],
    );
    const currentIndex = options.indexOf(event.currentTarget);
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? options.length - 1
          : (currentIndex + (event.key === 'ArrowDown' ? 1 : -1) + options.length) %
            options.length;

    options[nextIndex]?.focus();
  };

  return (
    <main className="auth-shell">
      <nav className="language-nav" aria-label={text.languageLabel}>
        <div className="language-menu" ref={languageMenuRef}>
          <button
            ref={languageTriggerRef}
            type="button"
            className="language-trigger"
            aria-label={`${text.languageLabel}: ${selectedLanguage.label}`}
            aria-haspopup="listbox"
            aria-expanded={isLanguageMenuOpen}
            aria-controls="language-options"
            onClick={() => setIsLanguageMenuOpen((isOpen) => !isOpen)}
          >
            <span className="language-name">{selectedLanguage.label}</span>
            <svg
              className={`language-chevron${isLanguageMenuOpen ? ' is-open' : ''}`}
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="m5.75 7.5 4.25 4.25 4.25-4.25" />
            </svg>
          </button>

          {isLanguageMenuOpen ? (
            <div
              id="language-options"
              className="language-options"
              role="listbox"
              aria-label={text.languageLabel}
            >
              {languageOptions.map((option) => {
                const isSelected = option.value === language;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className="language-option"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => selectLanguage(option.value)}
                    onKeyDown={moveBetweenLanguageOptions}
                  >
                    <span className="language-option-copy">{option.label}</span>
                    <svg className="language-check" viewBox="0 0 20 20" aria-hidden="true">
                      {isSelected ? <path d="m4.5 10.25 3.5 3.5 7.5-7.5" /> : null}
                    </svg>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
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
          <a className="sso-link" href={ssoLoginUrl}>
            <span>{text.signIn}</span>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M7 4.75 12.25 10 7 15.25" />
            </svg>
          </a>
          <p className="access-note">{text.accessNote}</p>
        </div>
      </section>
    </main>
  );
}
