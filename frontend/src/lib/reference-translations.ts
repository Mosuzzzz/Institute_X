import type { CategoryDto, MajorDto } from './backend-api';
import type { Language } from './language';

const categoryNames: Record<Exclude<Language, 'en'>, Record<string, string>> = {
  th: {
    mathematics: 'คณิตศาสตร์', japanese: 'ภาษาญี่ปุ่น', technology: 'เทคโนโลยี', science: 'วิทยาศาสตร์', english: 'ภาษาอังกฤษ', chinese: 'ภาษาจีน', korean: 'ภาษาเกาหลี', 'thai-language': 'ภาษาไทย', 'business-accounting': 'ธุรกิจและการบัญชี', 'design-arts': 'การออกแบบและศิลปะ', 'industry-engineering': 'อุตสาหกรรมและวิศวกรรม', agriculture: 'เกษตรกรรม', 'tourism-hospitality': 'การท่องเที่ยวและการบริการ', 'health-physical-education': 'สุขภาพและพลศึกษา', 'personal-development': 'การพัฒนาตนเอง',
  },
  'zh-CN': {
    mathematics: '数学', japanese: '日语', technology: '技术', science: '科学', english: '英语', chinese: '中文', korean: '韩语', 'thai-language': '泰语', 'business-accounting': '商业与会计', 'design-arts': '设计与艺术', 'industry-engineering': '工业与工程', agriculture: '农业', 'tourism-hospitality': '旅游与酒店管理', 'health-physical-education': '健康与体育', 'personal-development': '个人发展',
  },
  ja: {
    mathematics: '数学', japanese: '日本語', technology: 'テクノロジー', science: '科学', english: '英語', chinese: '中国語', korean: '韓国語', 'thai-language': 'タイ語', 'business-accounting': 'ビジネス・会計', 'design-arts': 'デザイン・芸術', 'industry-engineering': '産業・工学', agriculture: '農業', 'tourism-hospitality': '観光・ホスピタリティ', 'health-physical-education': '健康・体育', 'personal-development': '自己啓発',
  },
};

const educationLevels: Record<Exclude<Language, 'en'>, Record<string, string>> = {
  th: { VOC: 'ประกาศนียบัตรวิชาชีพ (ปวช.)', HVC: 'ประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)', BTECH: 'ปริญญาตรีสายเทคโนโลยีหรือสายปฏิบัติการ (ทล.บ.)' },
  'zh-CN': { VOC: '职业证书', HVC: '高级职业证书', BTECH: '技术学士' },
  ja: { VOC: '職業資格証明', HVC: '高等職業資格証明', BTECH: '技術学士' },
};

const majorFields: Record<Exclude<Language, 'en'>, Record<string, string>> = {
  th: { IND: 'อุตสาหกรรม', COM: 'พาณิชยกรรม', ART: 'ศิลปกรรม', HOME: 'คหกรรม', AGR: 'เกษตรกรรม', FISH: 'ประมง', TOUR: 'อุตสาหกรรมท่องเที่ยว', TEXT: 'อุตสาหกรรมสิ่งทอ', ICT: 'เทคโนโลยีสารสนเทศและการสื่อสาร' },
  'zh-CN': { IND: '工业', COM: '商业', ART: '美术', HOME: '家政', AGR: '农业', FISH: '渔业', TOUR: '旅游业', TEXT: '纺织业', ICT: '信息与通信技术' },
  ja: { IND: '産業', COM: '商業', ART: '美術', HOME: '家政', AGR: '農業', FISH: '水産', TOUR: '観光産業', TEXT: '繊維産業', ICT: '情報通信技術' },
};

export function translateCategory(category: Pick<CategoryDto, 'slug' | 'name'>, language: Language): string {
  if (language === 'en') return category.name;
  return categoryNames[language][category.slug] ?? category.name;
}

export function translateMajor(major: Pick<MajorDto, 'code' | 'name'>, language: Language): string {
  if (language === 'en') return major.name;
  const [levelCode, fieldCode] = major.code.split('-', 2);
  const level = educationLevels[language][levelCode];
  const field = majorFields[language][fieldCode];
  return level && field ? `${level} — ${field}` : major.name;
}
