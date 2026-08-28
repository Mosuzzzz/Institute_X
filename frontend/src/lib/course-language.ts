import type { Language } from "./language";

export const COURSE_LANGUAGES = [
  { code: "th", label: "Thai" },
  { code: "en", label: "English" },
  { code: "zh-CN", label: "Chinese (Simplified)" },
  { code: "ja", label: "Japanese" },
] as const;

export type CourseLanguageCode = (typeof COURSE_LANGUAGES)[number]["code"];

const labels: Record<Language, Record<CourseLanguageCode, string>> = {
  th: { th: "ภาษาไทย", en: "ภาษาอังกฤษ", "zh-CN": "ภาษาจีน (ตัวย่อ)", ja: "ภาษาญี่ปุ่น" },
  en: { th: "Thai", en: "English", "zh-CN": "Chinese (Simplified)", ja: "Japanese" },
  "zh-CN": { th: "泰语", en: "英语", "zh-CN": "简体中文", ja: "日语" },
  ja: { th: "タイ語", en: "英語", "zh-CN": "中国語（簡体字）", ja: "日本語" },
};

export function courseLanguageLabel(code: string, language: Language = "en"): string {
  return labels[language][code as CourseLanguageCode] ?? code;
}
