'use client';

import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import type { Language } from '../lib/language';
import BootstrapIcon from './bootstrap-icon';

export type { Language } from '../lib/language';

const languageOptions: ReadonlyArray<{ value: Language; label: string }> = [
  { value: 'th', label: 'ภาษาไทย' },
  { value: 'en', label: 'English' },
  { value: 'zh-CN', label: '中文' },
  { value: 'ja', label: '日本語' },
];

type LanguageSelectorProps = {
  value: Language;
  label: string;
  onChange: (language: Language) => void;
  className?: string;
};

export default function LanguageSelector({
  value,
  label,
  onChange,
  className = '',
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionsId = useId();
  const selectedLanguage = languageOptions.find((option) => option.value === value)!;

  useEffect(() => {
    if (!isOpen) return;

    menuRef.current
      ?.querySelector<HTMLButtonElement>('[role="option"][aria-selected="true"]')
      ?.focus();

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  const selectLanguage = (language: Language) => {
    onChange(language);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const moveBetweenOptions = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;

    event.preventDefault();
    const options = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [],
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
    <div className={`relative w-[132px] text-ink ${className}`} ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        className="flex min-h-12 w-full cursor-pointer items-center justify-end gap-1 rounded-control border border-transparent bg-transparent px-0.5 py-2.5 text-left text-[0.95rem] leading-[1.4] font-normal text-inherit transition-colors duration-150 hover:text-action-hover focus-visible:border-focus focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,var(--focus)_35%,transparent)] motion-reduce:transition-none forced-colors:border-[CanvasText] forced-colors:focus-visible:outline-[Highlight]"
        aria-label={`${label}: ${selectedLanguage.label}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={optionsId}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="truncate whitespace-nowrap">{selectedLanguage.label}</span>
        <BootstrapIcon name="chevron-down" className={`text-sm transition-transform duration-150 motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen ? (
        <div id={optionsId} className="absolute top-[calc(100%+8px)] right-0 z-[60] grid max-h-[min(280px,calc(100svh-88px))] w-full gap-[3px] overflow-y-auto rounded-control border border-line bg-surface p-1.5 shadow-[0_12px_28px_rgb(25_35_45_/_14%)] forced-colors:border-[CanvasText]" role="listbox" aria-label={label}>
          {languageOptions.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                className={`grid min-h-11 cursor-pointer grid-cols-[minmax(0,1fr)_20px] items-center gap-2.5 rounded-sm border border-transparent bg-transparent px-2.5 py-2 text-left text-ink hover:bg-[#f2f5f8] focus-visible:border-focus focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,var(--focus)_35%,transparent)] forced-colors:border-[CanvasText] forced-colors:focus-visible:outline-[Highlight] ${isSelected ? 'bg-[#edf5fc] text-action-hover' : ''}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => selectLanguage(option.value)}
                onKeyDown={moveBetweenOptions}
              >
                <span className="block min-w-0 truncate whitespace-nowrap text-[0.925rem] font-normal">{option.label}</span>
                {isSelected ? <BootstrapIcon name="check-lg" className="text-lg" /> : <span />}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
