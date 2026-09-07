'use client';

import Link from 'next/link';
import { useAppLanguage, type Language } from '../lib/language';
import styles from './status-page.module.css';

const copy = {
  en: {
    label: 'A small pause in your journey',
    missing: 'This page is off the map.',
    missingBody: 'The link may have changed, or this page may no longer exist. Let’s get you back to Institute X.',
    failed: 'Something went wrong.',
    failedBody: 'We couldn’t load this page. Try again, or return to the home page to continue.',
    home: 'Go to home', back: 'Go back', retry: 'Try again', foot: 'Institute X · Learning continues',
  },
  th: {
    label: 'พักสักครู่ แล้วไปต่อ',
    missing: 'ไม่พบหน้าที่คุณกำลังค้นหา',
    missingBody: 'ลิงก์อาจมีการเปลี่ยนแปลง หรือหน้านี้ไม่มีอยู่แล้ว กลับไปที่ Institute X เพื่อเรียนรู้ต่อได้เลย',
    failed: 'เกิดข้อผิดพลาดบางอย่าง',
    failedBody: 'เราไม่สามารถโหลดหน้านี้ได้ ลองอีกครั้ง หรือกลับไปที่หน้าหลักเพื่อใช้งานต่อ',
    home: 'กลับหน้าหลัก', back: 'ย้อนกลับ', retry: 'ลองอีกครั้ง', foot: 'Institute X · เรียนรู้ต่อได้เสมอ',
  },
  'zh-CN': {
    label: '稍作停留，继续前行',
    missing: '找不到此页面',
    missingBody: '链接可能已更改，或此页面已不存在。返回 Institute X，继续学习。',
    failed: '出了点问题', failedBody: '无法加载此页面。请重试，或返回首页继续。',
    home: '返回首页', back: '返回上一页', retry: '重试', foot: 'Institute X · 学习不止步',
  },
  ja: {
    label: 'ひと息ついて、次へ',
    missing: 'ページが見つかりません',
    missingBody: 'リンクが変更されたか、ページが削除された可能性があります。Institute X に戻って学習を続けましょう。',
    failed: '問題が発生しました', failedBody: 'ページを読み込めませんでした。再試行するか、ホームに戻ってください。',
    home: 'ホームに戻る', back: '前のページに戻る', retry: '再試行', foot: 'Institute X · 学びを続けよう',
  },
} satisfies Record<Language, Record<string, string>>;

export default function StatusPage({ code, onRetry }: { code: 404 | 500; onRetry?: () => void }) {
  const [language] = useAppLanguage();
  const text = copy[language];
  const missing = code === 404;

  return (
    <main className={styles.page} lang={language}>
      <title>{`${code} · Institute X`}</title>
      <meta name="robots" content="noindex" />
      <div className={styles.frame}>
        <section className={styles.panel} aria-labelledby="status-heading">
          <div className={styles.art} aria-hidden="true">
            <span className={styles.orbit} />
            <span className={styles.code}>{code}</span>
            <span className={styles.dot} />
          </div>
          <div className={styles.content}>
            <p className={styles.eyebrow}>{text.label}</p>
            <h1 id="status-heading">{missing ? text.missing : text.failed}</h1>
            <p className={styles.description}>{missing ? text.missingBody : text.failedBody}</p>
            <div className={styles.actions}>
              {missing ? (
                <Link className={styles.primary} href="/">{text.home}</Link>
              ) : (
                <button className={styles.primary} type="button" onClick={onRetry ?? (() => window.location.reload())}>{text.retry}</button>
              )}
              {missing ? (
                <button className={styles.secondary} type="button" onClick={() => {
                  if (window.history.length > 1) window.history.back();
                  // Keep recovery independent of the router in this shared error fallback.
                  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                  else window.location.assign('/');
                }}>{text.back}</button>
              ) : (
                // A full document navigation also recovers a broken root layout.
                // eslint-disable-next-line @next/next/no-html-link-for-pages
                <a className={styles.secondary} href="/">{text.home}</a>
              )}
            </div>
          </div>
        </section>
        <footer className={styles.footer}>{text.foot}</footer>
      </div>
    </main>
  );
}
