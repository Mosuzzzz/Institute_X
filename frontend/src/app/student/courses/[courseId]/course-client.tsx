'use client';

import Link from 'next/link';
import { Fragment, useEffect, useState } from 'react';
import {
  backendApi,
  type CourseEntryDto,
  type EligibleCourseDto,
  type PublishedCourseContentDto,
  type SignedViewUrlDto,
} from '../../../../lib/backend-api';
import ApiState from '../../../api-state';
import { useAppLanguage } from '../../../../lib/language';
import { courseLanguageLabel } from '../../../../lib/course-language';

export default function CourseClient({ courseId }: { courseId: string }) {
  const [language] = useAppLanguage();
  const [course, setCourse] = useState<EligibleCourseDto | null>(null);
  const [entry, setEntry] = useState<CourseEntryDto | null>(null);
  const [content, setContent] = useState<PublishedCourseContentDto | null>(null);
  const [selectedItem, setSelectedItem] = useState<
    PublishedCourseContentDto['contentItems'][number] | null
  >(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const [openingContent, setOpeningContent] = useState(false);
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

  const openContent = async (
    item: PublishedCourseContentDto['contentItems'][number],
  ) => {
    setSelectedItem(item);
    setMediaUrl(null);
    setContentError(null);
    setOpeningContent(Boolean(item.media));
    try {
      if (item.media) {
        const signed = await backendApi<SignedViewUrlDto>(
          `media/${item.media.assetId}/view-url`,
        );
        setMediaUrl(signed.url);
      }
      requestAnimationFrame(() =>
        document
          .getElementById('lesson-viewer')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      );
    } catch (requestError) {
      setContentError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to open this content.',
      );
    } finally {
      setOpeningContent(false);
    }
  };

  if (!course || !entry) return <main className="mx-auto w-[min(calc(100%-48px),1720px)] pt-[clamp(54px,6vw,96px)] pb-[70px] max-[820px]:w-[min(calc(100%-36px),760px)] max-[540px]:w-[min(calc(100%-28px),500px)]"><ApiState loading={loading} error={error} /></main>;
  return (
    <main className="grid min-h-[calc(100svh-96px)] grid-cols-[minmax(0,1fr)_minmax(360px,520px)] max-[1180px]:grid-cols-[minmax(0,1fr)_380px] max-[820px]:block">
      <section className="min-w-0 bg-white">
        <section
          className="grid min-h-[min(66vw,760px)] scroll-mt-28 bg-[#272c36] text-white max-[820px]:min-h-[560px] max-[540px]:min-h-[520px]"
          id="lesson-viewer"
        >
          {!entry.contentUnlocked ? (
            <div className="grid place-content-center justify-items-center gap-3 p-10 text-center">
              <p className="text-xs font-bold tracking-[0.13em] text-[#8ccbd0] uppercase">
                Course content locked
              </p>
              <h1 className="text-[clamp(2rem,5vw,4.5rem)] tracking-[-0.05em]">
                Complete the Pre-Test first
              </h1>
            </div>
          ) : selectedItem ? (
            <div className="grid min-h-0 content-center p-[clamp(28px,5vw,80px)]">
              <p className="text-xs font-bold tracking-[0.13em] text-[#8ccbd0] uppercase">
                {selectedItem.contentType}
              </p>
              <h1 className="mt-2 text-[clamp(1.8rem,4vw,3.5rem)] tracking-[-0.04em]">
                {selectedItem.title ?? selectedItem.contentType}
              </h1>
              {contentError ? (
                <p className="mt-6 border-l-[3px] border-[#e96b72] bg-[#3a282e] px-4 py-3 text-[#ffdadd]">
                  {contentError}
                </p>
              ) : openingContent ? (
                <p className="mt-6 text-[#cbd2df]">Opening content…</p>
              ) : selectedItem.contentType === 'TEXT' ? (
                <div className="mt-8 max-h-[520px] overflow-y-auto whitespace-pre-wrap border-l-4 border-[#8ccbd0] pl-6 text-lg leading-9 text-[#edf1f6]">
                  {selectedItem.textBody}
                </div>
              ) : mediaUrl && selectedItem.contentType === 'VIDEO' ? (
                <video className="mt-6 max-h-[600px] w-full bg-black" controls src={mediaUrl} />
              ) : mediaUrl && selectedItem.contentType === 'AUDIO' ? (
                <audio className="mt-8 w-full" controls src={mediaUrl} />
              ) : mediaUrl && selectedItem.contentType === 'IMAGE' ? (
                <div
                  aria-label={selectedItem.title ?? 'Course image'}
                  className="mt-6 min-h-[460px] w-full bg-contain bg-center bg-no-repeat"
                  role="img"
                  style={{ backgroundImage: `url(${mediaUrl})` }}
                />
              ) : mediaUrl ? (
                <div className="mt-6 min-h-0">
                  <iframe
                    className="h-[min(60vh,620px)] w-full border-0 bg-white"
                    src={mediaUrl}
                    title={selectedItem.title ?? 'Course document'}
                  />
                  <a
                    className="mt-3 inline-flex font-bold text-[#8ccbd0]"
                    href={mediaUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open document in a new tab →
                  </a>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid place-content-center justify-items-center gap-3 p-10 text-center">
              <p className="text-xs font-bold tracking-[0.13em] text-[#8ccbd0] uppercase">
                {course.title}
              </p>
              <h1 className="text-[clamp(2rem,5vw,4.5rem)] tracking-[-0.05em]">
                Select a lesson to begin
              </h1>
              <p className="text-[#cbd2df]">
                Choose an item from Course content on the right.
              </p>
            </div>
          )}
        </section>
        <div className="px-[clamp(30px,8vw,140px)] py-[clamp(46px,6vw,90px)] max-[540px]:px-6 max-[540px]:py-[46px]">
          <p className="mb-2 text-xs font-bold tracking-[0.13em] text-[#073d78] uppercase">Course overview</p>
          <h2 className="max-w-[850px] text-[clamp(1.8rem,3vw,3rem)] tracking-[-0.035em] text-[#20243a]">{course.title}</h2>
          <p className="mt-5 max-w-[720px] leading-[1.7] text-[#747b92]">{course.description ?? 'Continue through the published learning content and assessments.'}</p>
          <dl className="mt-9 flex flex-wrap gap-x-20 gap-y-[30px]">
            <div className="grid gap-[5px]"><dt className="text-[0.72rem] tracking-[0.08em] text-[#747b92] uppercase">Enrollment</dt><dd className="m-0">Active</dd></div>
            <div className="grid gap-[5px]"><dt className="text-[0.72rem] tracking-[0.08em] text-[#747b92] uppercase">Content</dt><dd className="m-0">{entry.contentUnlocked ? 'Unlocked' : 'Pre-Test required'}</dd></div>
            <div className="grid gap-[5px]"><dt className="text-[0.72rem] tracking-[0.08em] text-[#747b92] uppercase">Language</dt><dd className="m-0">{courseLanguageLabel(course.languageCode, language)}</dd></div>
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
              <Fragment key={item.id}>
              {(index === 0 || content.contentItems[index - 1]?.section?.id !== item.section?.id) ? (
                <li className="border-b border-[#d9dce7] bg-[#e8edf3] px-7 py-3 text-xs font-bold tracking-[0.08em] text-[#435166] uppercase">
                  {item.section ? `Section ${item.section.position}: ${item.section.title}` : "General"}
                </li>
              ) : null}
              <li className="border-b border-[#d9dce7]">
                <button
                  aria-pressed={selectedItem?.id === item.id}
                  className="grid w-full cursor-pointer gap-1.5 border-0 bg-transparent px-7 py-[23px] text-left text-[#20243a] hover:bg-[#eef1f6] aria-pressed:bg-[#e8eef5] focus-visible:-outline-offset-4 focus-visible:outline-3 focus-visible:outline-focus"
                  onClick={() => void openContent(item)}
                  type="button"
                >
                  <span className="text-[0.72rem] font-bold tracking-[0.06em] text-[#073d78] uppercase">Item {index + 1}</span>
                  <strong className="text-[0.95rem] leading-[1.35]">{item.title ?? item.contentType}</strong>
                  <small className="text-[#747b92]">{item.contentType}{item.media ? ` · ${item.media.fileName}` : ''}</small>
                </button>
              </li>
              </Fragment>
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
