'use client';

import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import type { Language } from '../lib/language';

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
    <div className={`language-menu${className ? ` ${className}` : ''}`} ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        className="language-trigger"
        aria-label={`${label}: ${selectedLanguage.label}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={optionsId}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="language-name">{selectedLanguage.label}</span>
        <svg
          className={`language-chevron${isOpen ? ' is-open' : ''}`}
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="m5.75 7.5 4.25 4.25 4.25-4.25" />
        </svg>
      </button>

      {isOpen ? (
        <div id={optionsId} className="language-options" role="listbox" aria-label={label}>
          {languageOptions.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                className="language-option"
                role="option"
                aria-selected={isSelected}
                onClick={() => selectLanguage(option.value)}
                onKeyDown={moveBetweenOptions}
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
  );
}
