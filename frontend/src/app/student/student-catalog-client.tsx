'use client';

import Link from 'next/link';
import type { EligibleCourseDto } from '../../lib/backend-api';
import { useBackendQuery } from '../../lib/use-backend-query';
import { useAppLanguage } from '../../lib/language';
import { translateCategory } from '../../lib/reference-translations';
import ApiState from '../api-state';
import CourseCard from './course-card';
import type { StudentCourse } from './course-data';

const studentCopy = {
  th: { enrolled: 'รายวิชาที่ลงทะเบียน', myLearning: 'การเรียนของฉัน', noEnrolled: 'ยังไม่มีรายวิชาที่ลงทะเบียน', enterCourse: 'เลือกรายวิชาจากแค็ตตาล็อกเพื่อเริ่มเรียน', progress: 'ความคืบหน้าจริงจากการลงทะเบียนและผลการประเมิน', results: 'ผลการค้นหา', allCourses: 'รายวิชาทั้งหมด', catalog: 'แค็ตตาล็อกรายวิชา', eligible: 'รายวิชาที่เข้าเรียนได้', noMatch: 'ไม่พบรายวิชาที่ตรงกัน', tryAgain: 'ลองใช้คำค้นอื่นหรือเลือกหมวดหมู่อื่น', classroom: 'ห้องเรียนของคุณ', continueLearning: 'เรียนต่อ', viewLearning: 'ดูการเรียนของฉัน', chooseCourse: 'เลือกรายวิชาด้านล่างเพื่อเริ่มเรียน', eligibleProgramme: 'เหมาะสำหรับหลักสูตรของคุณ', learnNext: 'เรียนอะไรต่อดี', courses: 'รายวิชา', noPublished: 'ยังไม่มีรายวิชาที่เผยแพร่สำหรับสาขาของคุณ' },
  en: { enrolled: 'Your enrolled courses', myLearning: 'My learning', noEnrolled: 'No enrolled courses', enterCourse: 'Enter a course from the catalog to begin learning.', progress: 'Live milestone progress from enrollment and assessment results.', results: 'Results for', allCourses: 'All courses', catalog: 'Course catalog', eligible: 'eligible courses', noMatch: 'No matching courses', tryAgain: 'Try a different search term or choose another category.', classroom: 'Your classroom', continueLearning: 'Continue learning', viewLearning: 'View my learning', chooseCourse: 'Choose a course below to begin learning.', eligibleProgramme: 'Eligible for your programme', learnNext: 'What to learn next', courses: 'Courses', noPublished: 'No published courses are eligible for your Major yet.' },
  'zh-CN': { enrolled: '已报名的课程', myLearning: '我的学习', noEnrolled: '尚未报名课程', enterCourse: '从课程目录中选择课程以开始学习。', progress: '根据报名和评估结果显示实时进度。', results: '搜索结果', allCourses: '全部课程', catalog: '课程目录', eligible: '门可学习课程', noMatch: '没有匹配的课程', tryAgain: '请尝试其他关键词或选择其他类别。', classroom: '你的课堂', continueLearning: '继续学习', viewLearning: '查看我的学习', chooseCourse: '选择下方课程开始学习。', eligibleProgramme: '适合你的专业', learnNext: '接下来学什么', courses: '课程', noPublished: '目前没有适合你专业的已发布课程。' },
  ja: { enrolled: '受講中のコース', myLearning: 'マイラーニング', noEnrolled: '受講中のコースはありません', enterCourse: 'カタログからコースを選んで学習を始めましょう。', progress: '登録状況と評価結果に基づく進捗です。', results: '検索結果', allCourses: 'すべてのコース', catalog: 'コースカタログ', eligible: '件の受講可能コース', noMatch: '一致するコースはありません', tryAgain: '別の検索語またはカテゴリーをお試しください。', classroom: 'あなたの教室', continueLearning: '学習を続ける', viewLearning: 'マイラーニングを見る', chooseCourse: '下のコースを選んで学習を始めましょう。', eligibleProgramme: 'あなたの専攻で受講可能', learnNext: '次に学ぶこと', courses: 'コース', noPublished: 'あなたの専攻で受講できる公開コースはまだありません。' },
} as const;

function toStudentCourse(course: EligibleCourseDto, language: ReturnType<typeof useAppLanguage>[0]): StudentCourse {
  const categoryRecord = course.categories[0];
  const category = categoryRecord ? translateCategory(categoryRecord, language) : 'General';
  const mark = course.title.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  const palette = ['#58b9c9', '#f2c94c', '#e87f45', '#92a5d8', '#73b88c'];
  return {
    id: course.courseId,
    title: course.title,
    instructor: course.description ?? 'Institute X learning programme',
    category,
    categorySlug: categoryRecord?.slug,
    availability: course.enrolled ? 'LIMITED' : 'OPEN',
    accent: palette[course.title.length % palette.length],
    mark: mark || 'IX',
    ...(course.enrolled ? { progress: course.progress } : {}),
  };
}

export default function StudentCatalogClient({ mode, category, query }: { mode: 'home' | 'catalog' | 'learning'; category?: string; query?: string }) {
  const [language] = useAppLanguage();
  const text = studentCopy[language];
  const { data, error, loading } = useBackendQuery<EligibleCourseDto[]>('courses');
  if (!data) return <main className="student-main"><ApiState loading={loading} error={error} /></main>;
  const normalizedQuery = query?.trim().toLowerCase();
  const allCourses = data.map((course) => toStudentCourse(course, language));
  const enrolled = allCourses.filter((course) => course.progress !== undefined);
  const visible = allCourses.filter((course) => (!category || course.categorySlug === category) && (!normalizedQuery || `${course.title} ${course.instructor} ${course.category}`.toLowerCase().includes(normalizedQuery)));

  if (mode === 'learning') return <main className="student-main learning-page"><header className="catalog-heading"><p className="eyebrow">{text.enrolled}</p><h1>{text.myLearning}</h1></header>{enrolled.length ? <div className="learning-grid">{enrolled.map((course) => <CourseCard key={course.id} course={course} />)}</div> : <section className="catalog-empty"><h2>{text.noEnrolled}</h2><p>{text.enterCourse}</p></section>}<p className="demo-note">{text.progress}</p></main>;
  if (mode === 'catalog') {
    const selectedCategory = data.flatMap((course) => course.categories).find((item) => item.slug === category);
    const title = normalizedQuery ? `${text.results} “${query}”` : selectedCategory ? translateCategory(selectedCategory, language) : text.allCourses;
    return <main className="student-main catalog-page"><header className="catalog-heading"><p className="eyebrow">{text.catalog}</p><h1>{title}</h1><p>{visible.length} {text.eligible}</p></header>{visible.length ? <div className="course-grid catalog-grid">{visible.map((course) => <CourseCard key={course.id} course={course} />)}</div> : <section className="catalog-empty"><h2>{text.noMatch}</h2><p>{text.tryAgain}</p></section>}<p className="demo-note">Live data from <code>GET /api/courses</code>.</p></main>;
  }
  return <main className="student-main"><section className="continue-section" aria-labelledby="continue-heading"><div className="section-heading-row"><div><p className="eyebrow">{text.classroom}</p><h1 id="continue-heading">{text.continueLearning}</h1></div><Link href="/student/learning">{text.viewLearning}</Link></div>{enrolled.length ? <div className="continue-grid">{enrolled.slice(0, 2).map((course) => <CourseCard key={course.id} course={course} />)}</div> : <p className="api-empty">{text.chooseCourse}</p>}</section><section className="recommend-section" aria-labelledby="next-heading"><div className="section-title-stack"><p className="eyebrow">{text.eligibleProgramme}</p><h2 id="next-heading">{text.learnNext}</h2><p>{text.courses}</p></div>{allCourses.length ? <div className="course-grid">{allCourses.slice(0, 5).map((course) => <CourseCard key={course.id} course={course} />)}</div> : <p className="api-empty">{text.noPublished}</p>}</section><p className="demo-note">Live catalog and enrollment data from the Institute X API.</p></main>;
}
