"use client";

import Link from "next/link";
import type { CategoryDto, EligibleCourseDto } from "../../lib/backend-api";
import { useBackendQuery } from "../../lib/use-backend-query";
import { useAppLanguage } from "../../lib/language";
import { translateCategory } from "../../lib/reference-translations";
import { courseLanguageLabel } from "../../lib/course-language";
import ApiState from "../api-state";
import CourseCard from "./course-card";
import type { StudentCourse } from "./course-data";

const studentCopy = {
  th: {
    enrolled: "รายวิชาที่ลงทะเบียน",
    myLearning: "การเรียนของฉัน",
    noEnrolled: "ยังไม่มีรายวิชาที่ลงทะเบียน",
    enterCourse: "เลือกรายวิชาจากแค็ตตาล็อกเพื่อเริ่มเรียน",
    progress: "ความคืบหน้าจริงจากการลงทะเบียนและผลการประเมิน",
    results: "ผลการค้นหา",
    allCourses: "รายวิชาทั้งหมด",
    catalog: "แค็ตตาล็อกรายวิชา",
    eligible: "รายวิชาที่เข้าเรียนได้",
    noMatch: "ไม่พบรายวิชาที่ตรงกัน",
    tryAgain: "ลองใช้คำค้นอื่นหรือเลือกหมวดหมู่อื่น",
    classroom: "ห้องเรียนของคุณ",
    continueLearning: "เรียนต่อ",
    viewLearning: "ดูการเรียนของฉัน",
    chooseCourse: "เลือกรายวิชาด้านล่างเพื่อเริ่มเรียน",
    learnNext: "เรียนอะไรต่อดี",
    courses: "รายวิชา",
    noPublished: "ยังไม่มีรายวิชาที่เผยแพร่สำหรับสาขาของคุณ",
  },
  en: {
    enrolled: "Your enrolled courses",
    myLearning: "My learning",
    noEnrolled: "No enrolled courses",
    enterCourse: "Enter a course from the catalog to begin learning.",
    progress: "Live milestone progress from enrollment and assessment results.",
    results: "Results for",
    allCourses: "All courses",
    catalog: "Course catalog",
    eligible: "eligible courses",
    noMatch: "No matching courses",
    tryAgain: "Try a different search term or choose another category.",
    classroom: "Your classroom",
    continueLearning: "Continue learning",
    viewLearning: "View my learning",
    chooseCourse: "Choose a course below to begin learning.",
    learnNext: "What to learn next",
    courses: "Courses",
    noPublished: "No published courses are eligible for your Major yet.",
  },
  "zh-CN": {
    enrolled: "已报名的课程",
    myLearning: "我的学习",
    noEnrolled: "尚未报名课程",
    enterCourse: "从课程目录中选择课程以开始学习。",
    progress: "根据报名和评估结果显示实时进度。",
    results: "搜索结果",
    allCourses: "全部课程",
    catalog: "课程目录",
    eligible: "门可学习课程",
    noMatch: "没有匹配的课程",
    tryAgain: "请尝试其他关键词或选择其他类别。",
    classroom: "你的课堂",
    continueLearning: "继续学习",
    viewLearning: "查看我的学习",
    chooseCourse: "选择下方课程开始学习。",
    learnNext: "接下来学什么",
    courses: "课程",
    noPublished: "目前没有适合你专业的已发布课程。",
  },
  ja: {
    enrolled: "受講中のコース",
    myLearning: "マイラーニング",
    noEnrolled: "受講中のコースはありません",
    enterCourse: "カタログからコースを選んで学習を始めましょう。",
    progress: "登録状況と評価結果に基づく進捗です。",
    results: "検索結果",
    allCourses: "すべてのコース",
    catalog: "コースカタログ",
    eligible: "件の受講可能コース",
    noMatch: "一致するコースはありません",
    tryAgain: "別の検索語またはカテゴリーをお試しください。",
    classroom: "あなたの教室",
    continueLearning: "学習を続ける",
    viewLearning: "マイラーニングを見る",
    chooseCourse: "下のコースを選んで学習を始めましょう。",
    learnNext: "次に学ぶこと",
    courses: "コース",
    noPublished: "あなたの専攻で受講できる公開コースはまだありません。",
  },
} as const;

const studentMain =
  "mx-auto w-[min(calc(100%-48px),1720px)] pt-[clamp(54px,6vw,96px)] pb-[70px] max-[820px]:w-[min(calc(100%-36px),760px)] max-[820px]:pt-11 max-[540px]:w-[min(calc(100%-28px),500px)] max-[540px]:pt-9";
const eyebrow =
  "mb-2 text-xs font-bold tracking-[0.13em] text-[#073d78] uppercase";
const emptyState = "my-5 py-7 leading-[1.55] text-[#667182]";
const courseGrid =
  "grid grid-cols-5 gap-[clamp(18px,1.6vw,30px)] max-[1180px]:grid-cols-3 max-[820px]:grid-cols-2 max-[540px]:grid-cols-1 max-[540px]:gap-11";

function humanizeCategorySlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function toStudentCourse(
  course: EligibleCourseDto,
  language: ReturnType<typeof useAppLanguage>[0],
): StudentCourse {
  const categoryRecord = course.categories[0];
  const category = categoryRecord
    ? translateCategory(categoryRecord, language)
    : "General";
  const mark = course.title
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  const palette = ["#58b9c9", "#f2c94c", "#e87f45", "#92a5d8", "#73b88c"];
  return {
    id: course.courseId,
    title: course.title,
    instructor: course.description ?? "Institute X learning programme",
    category,
    categorySlug: categoryRecord?.slug,
    language: courseLanguageLabel(course.languageCode, language),
    availability: course.eligibilityMode,
    accent: palette[course.title.length % palette.length],
    mark: mark || "IX",
    coverAssetId: course.coverAssetId,
    ...(course.enrolled ? { progress: course.progress } : {}),
  };
}

export default function StudentCatalogClient({
  mode,
  category,
  query,
}: {
  mode: "home" | "catalog" | "learning";
  category?: string;
  query?: string;
}) {
  const [language] = useAppLanguage();
  const text = studentCopy[language];
  const { data, error, loading } =
    useBackendQuery<EligibleCourseDto[]>("courses");
  const categoriesQuery = useBackendQuery<CategoryDto[]>(
    mode === "catalog" && category ? "categories" : null,
  );
  if (!data)
    return (
      <main className={studentMain}>
        <ApiState loading={loading} error={error} />
      </main>
    );
  const normalizedQuery = query?.trim().toLowerCase();
  const allCourses = data.map((course) => toStudentCourse(course, language));
  const enrolled = allCourses.filter((course) => course.progress !== undefined);
  const visible = allCourses.filter(
    (course) =>
      (!category || course.categorySlug === category) &&
      (!normalizedQuery ||
        `${course.title} ${course.instructor} ${course.category}`
          .toLowerCase()
          .includes(normalizedQuery)),
  );

  if (mode === "learning") {
    return (
      <main className={`${studentMain} min-h-[calc(100svh-158px)]`}>
        <header className="mb-11">
          <p className={eyebrow}>{text.enrolled}</p>
          <h1 className="text-[clamp(2rem,3vw,3.15rem)] tracking-[-0.035em] text-[#20243a] uppercase max-[540px]:text-[2rem]">
            {text.myLearning}
          </h1>
        </header>
        {enrolled.length ? (
          <div className="grid w-[min(100%,860px)] grid-cols-2 gap-x-[22px] gap-y-[54px] max-[820px]:grid-cols-1">
            {enrolled.map((course) => (
              <CourseCard key={course.id} course={course} variant="learning" />
            ))}
          </div>
        ) : (
          <section className="py-16">
            <h2 className="text-2xl tracking-[-0.035em] text-[#20243a]">
              {text.noEnrolled}
            </h2>
            <p className="mt-2 text-[#747b92]">{text.enterCourse}</p>
          </section>
        )}
        <p className="mt-12 text-xs text-[#747b92]">{text.progress}</p>
      </main>
    );
  }

  if (mode === "catalog") {
    const selectedCategory =
      categoriesQuery.data?.find((item) => item.slug === category) ??
      data
        .flatMap((course) => course.categories)
        .find((item) => item.slug === category);
    const title = normalizedQuery
      ? `${text.results} “${query}”`
      : selectedCategory
        ? translateCategory(selectedCategory, language)
        : category
          ? humanizeCategorySlug(category)
          : text.allCourses;
    return (
      <main className={`${studentMain} min-h-[calc(100svh-158px)]`}>
        <header className="mb-11">
          <p className={eyebrow}>{text.catalog}</p>
          <h1 className="text-[clamp(2rem,3vw,3.15rem)] tracking-[-0.035em] text-[#20243a] max-[540px]:text-[2rem]">
            {title}
          </h1>
          <p className="mt-2.5 text-[#747b92]">
            {visible.length} {text.eligible}
          </p>
        </header>
        {visible.length ? (
          <div className={`${courseGrid} gap-y-16`}>
            {visible.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <section className="py-16">
            <h2 className="text-2xl tracking-[-0.035em] text-[#20243a]">
              {text.noMatch}
            </h2>
            <p className="mt-2 text-[#747b92]">{text.tryAgain}</p>
          </section>
        )}
      </main>
    );
  }

  return (
    <main className={studentMain}>
      {enrolled.length ? (
        <section aria-labelledby="continue-heading">
          <div className="mb-[34px] flex items-end justify-between gap-6 max-[540px]:items-start">
            <div>
              <p className={eyebrow}>{text.classroom}</p>
              <h1
                className="text-[clamp(2rem,3vw,3.15rem)] tracking-[-0.035em] text-[#20243a] uppercase max-[540px]:text-[2rem]"
                id="continue-heading"
              >
                {text.continueLearning}
              </h1>
            </div>
            <Link
              className="font-bold text-[#073d78] no-underline hover:underline hover:underline-offset-5 max-[540px]:text-[0.78rem]"
              href="/student/learning"
            >
              {text.viewLearning}
            </Link>
          </div>
          <div className="grid grid-cols-[repeat(2,minmax(0,540px))] gap-[26px] max-[820px]:grid-cols-1">
            {enrolled.slice(0, 2).map((course) => (
              <CourseCard key={course.id} course={course} variant="continue" />
            ))}
          </div>
        </section>
      ) : null}
      <section
        className={enrolled.length ? "mt-[clamp(70px,8vw,120px)]" : ""}
        aria-labelledby="next-heading"
      >
        <div className="mb-7">
          <h1
            className="text-[clamp(1.8rem,2.5vw,2.7rem)] tracking-[-0.035em] text-[#20243a] font-medium"
            id="next-heading"
          >
            {text.learnNext}
          </h1>
          <p className="mt-[26px] text-[1.4rem] font-medium">{text.courses}</p>
        </div>
        {allCourses.length ? (
          <div className={courseGrid}>
            {allCourses.slice(0, 5).map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <p className={emptyState}>{text.noPublished}</p>
        )}
      </section>
    </main>
  );
}
