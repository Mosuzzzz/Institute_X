'use client';

import Image from 'next/image';
import { useAppLanguage } from '../lib/language';

const footerCopy = {
  th: {
    product: 'ระบบการเรียนรู้ออนไลน์',
    rights: 'สงวนลิขสิทธิ์',
  },
  en: {
    product: 'Online Learning System',
    rights: 'All rights reserved',
  },
  'zh-CN': {
    product: '在线学习系统',
    rights: '版权所有',
  },
  ja: {
    product: 'オンライン学習システム',
    rights: '無断転載を禁じます',
  },
} as const;

export default function AppFooter() {
  const [language] = useAppLanguage();
  const text = footerCopy[language];

  return (
    <footer className="border-t border-[#d9dce7] bg-white text-[#5f6878]">
      <div className="mx-auto flex min-h-20 w-[min(calc(100%-48px),1720px)] items-center justify-between gap-6 py-4 max-[640px]:w-[min(calc(100%-32px),560px)] max-[640px]:flex-col max-[640px]:items-start max-[640px]:gap-3 max-[640px]:py-6">
        <div className="flex items-center gap-3">
          <Image className="h-8 w-8 object-contain" src="/logoX.png" alt="" width={32} height={32} />
          <div className="grid gap-0.5">
            <strong className="text-[0.82rem] font-semibold text-[#20243a]">Institute X eLearning</strong>
            <span className="text-[0.7rem]">{text.product}</span>
          </div>
        </div>
        <p className="text-[0.7rem] tracking-[0.02em]">© 2026 Institute X · {text.rights}</p>
      </div>
    </footer>
  );
}
