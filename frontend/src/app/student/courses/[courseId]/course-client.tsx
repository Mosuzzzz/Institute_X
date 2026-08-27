'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { backendApi, type CourseEntryDto, type EligibleCourseDto, type PublishedCourseContentDto } from '../../../../lib/backend-api';
import ApiState from '../../../api-state';
import { useAppLanguage } from '../../../../lib/language';
import { translateCategory } from '../../../../lib/reference-translations';

export default function CourseClient({ courseId }: { courseId: string }) {
  const [language] = useAppLanguage();
  const [course, setCourse] = useState<EligibleCourseDto | null>(null);
  const [entry, setEntry] = useState<CourseEntryDto | null>(null);
  const [content, setContent] = useState<PublishedCourseContentDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const catalog = await backendApi<EligibleCourseDto[]>('courses');
        const selected = catalog.find((item) => item.courseId === courseId);
        if (!selected) throw new Error('This Course is not available for your Major.');
        const entered = await backendApi<CourseEntryDto>(`courses/${courseId}/enter`, { method: 'POST' });
        let publishedContent: PublishedCourseContentDto | null = null;
        if (entered.contentUnlocked) publishedContent = await backendApi<PublishedCourseContentDto>(`courses/${courseId}/content`);
        if (!cancelled) { setCourse(selected); setEntry(entered); setContent(publishedContent); }
      } catch (requestError) {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to enter this Course.');
      } finally { if (!cancelled) setLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [courseId]);

  if (!course || !entry) return <main className="mx-auto w-[min(calc(100%-48px),1720px)] pt-[clamp(54px,6vw,96px)] pb-[70px] max-[820px]:w-[min(calc(100%-36px),760px)] max-[540px]:w-[min(calc(100%-28px),500px)]"><ApiState loading={loading} error={error} /></main>;
  const category = course.categories[0] ? translateCategory(course.categories[0], language) : 'General';
  return (
    <main className="grid min-h-[calc(100svh-96px)] grid-cols-[minmax(0,1fr)_minmax(360px,520px)] max-[1180px]:grid-cols-[minmax(0,1fr)_380px] max-[820px]:block">
      <section className="min-w-0 bg-white">
        <div className="relative grid min-h-[min(66vw,760px)] content-center overflow-hidden bg-[#272c36] p-[clamp(50px,8vw,140px)] text-white max-[820px]:min-h-[560px] max-[540px]:min-h-[520px] max-[540px]:px-6 max-[540px]:pt-[84px] max-[540px]:pb-[210px]">
          <p className="absolute top-[38px] left-[clamp(30px,5vw,80px)] text-[0.82rem] tracking-[0.08em] text-[#cbd2df] uppercase">Institute X · {category}</p>
          <h1 className="relative z-2 max-w-[820px] text-[clamp(3rem,6.7vw,7.4rem)] leading-[0.92] tracking-[-0.07em] text-white max-[540px]:text-[3.5rem]">Build knowledge<br />through practice.</h1>
          <div className="absolute right-[5%] bottom-[8%] flex items-center max-[540px]:right-[18px] max-[540px]:bottom-[70px]" aria-hidden="true">
            <span className="-ml-[18px] grid aspect-square w-[clamp(90px,11vw,160px)] place-items-center border border-[rgb(255_255_255_/_35%)] bg-[#756b5e] text-[clamp(0.8rem,1vw,1.05rem)] text-white max-[540px]:w-[100px]">Concept</span>
            <span className="-ml-[18px] grid aspect-square w-[clamp(90px,11vw,160px)] -translate-y-8 place-items-center border border-[rgb(255_255_255_/_35%)] bg-[#936d70] text-[clamp(0.8rem,1vw,1.05rem)] text-white max-[540px]:w-[100px]">Practice</span>
            <span className="-ml-[18px] grid aspect-square w-[clamp(90px,11vw,160px)] place-items-center border border-[rgb(255_255_255_/_35%)] bg-[#496978] text-[clamp(0.8rem,1vw,1.05rem)] text-white max-[540px]:w-[100px]">Reflect</span>
          </div>
          <div className="absolute top-10 right-10 max-w-[310px] border-l-4 border-[#f0834f] pl-4 text-[0.9rem] font-bold max-[540px]:top-7 max-[540px]:right-6 max-[540px]:max-w-[210px]">{course.title}</div>
        </div>
        <div className="px-[clamp(30px,8vw,140px)] py-[clamp(46px,6vw,90px)] max-[540px]:px-6 max-[540px]:py-[46px]">
          <p className="mb-2 text-xs font-bold tracking-[0.13em] text-[#073d78] uppercase">Course overview</p>
          <h2 className="max-w-[850px] text-[clamp(1.8rem,3vw,3rem)] tracking-[-0.035em] text-[#20243a]">{course.title}</h2>
          <p className="mt-5 max-w-[720px] leading-[1.7] text-[#747b92]">{course.description ?? 'Continue through the published learning content and assessments.'}</p>
          <dl className="mt-9 flex flex-wrap gap-x-20 gap-y-[30px]">
            <div className="grid gap-[5px]"><dt className="text-[0.72rem] tracking-[0.08em] text-[#747b92] uppercase">Enrollment</dt><dd className="m-0">Active</dd></div>
            <div className="grid gap-[5px]"><dt className="text-[0.72rem] tracking-[0.08em] text-[#747b92] uppercase">Content</dt><dd className="m-0">{entry.contentUnlocked ? 'Unlocked' : 'Pre-Test required'}</dd></div>
          </dl>
          {entry.contentUnlocked && entry.postTestId ? <Link className="mt-7 inline-flex text-[0.82rem] font-bold text-[#073d78] no-underline" href={`/student/assessments/post-test/${entry.postTestId}`}>Take Post-Test →</Link> : null}
        </div>
      </section>
      <aside className="max-h-[calc(100svh-96px)] overflow-y-auto border-l border-[#d9dce7] bg-[#f5f7fa] max-[820px]:max-h-none max-[820px]:border-t max-[820px]:border-l-0" aria-label="Course content">
        <header className="sticky top-0 z-2 border-b border-[#d9dce7] bg-white px-7 py-6 max-[820px]:static">
          <Link className="text-[0.8rem] text-[#073d78] no-underline" href="/student/learning">← My learning</Link>
          <h2 className="mt-3.5 text-[1.2rem] tracking-[-0.035em] text-[#20243a]">Course content</h2>
        </header>
        {content ? (
          <ol className="m-0 list-none p-0">
            {content.contentItems.map((item, index) => (
              <li className="border-b border-[#d9dce7]" key={item.id}>
                <button className="grid w-full cursor-pointer gap-1.5 border-0 bg-transparent px-7 py-[23px] text-left text-[#20243a] hover:bg-[#eef1f6] focus-visible:-outline-offset-4 focus-visible:outline-3 focus-visible:outline-focus" type="button">
                  <span className="text-[0.72rem] font-bold tracking-[0.06em] text-[#073d78] uppercase">Item {index + 1}</span>
                  <strong className="text-[0.95rem] leading-[1.35]">{item.title ?? item.contentType}</strong>
                  <small className="text-[#747b92]">{item.contentType}{item.media ? ` · ${item.media.fileName}` : ''}</small>
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <section className="grid min-h-[280px] place-content-center justify-items-center gap-2.5 border border-[#d8dde5] bg-white p-10 text-center text-[#4f5b6b]">
            <strong className="text-[1.1rem] text-[#202a38]">Complete the Pre-Test first</strong>
            <p className="max-w-[520px] leading-[1.55]">The Pre-Test unlocks this Course&apos;s learning content.</p>
            {entry.preTestId ? <Link className="font-bold text-[#073d78]" href={`/student/assessments/pre-test/${entry.preTestId}`}>Start Pre-Test →</Link> : <small className="text-[#7a8492]">This Course does not have a Pre-Test configured.</small>}
          </section>
        )}
      </aside>
    </main>
  );
}
