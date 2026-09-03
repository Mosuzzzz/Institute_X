'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  backendApi,
  type CourseEntryDto,
  type EligibleCourseDto,
  type PublishedCourseContentDto,
  type SignedViewUrlDto,
} from '../../../../lib/backend-api';
import { courseLanguageLabel } from '../../../../lib/course-language';
import { useAppLanguage } from '../../../../lib/language';
import ApiState from '../../../api-state';

type ContentItem = PublishedCourseContentDto['contentItems'][number];

function ContentTypeIcon({ type }: { type: string }) {
  if (type === 'VIDEO') {
    return (
      <svg className="size-4" viewBox="0 0 20 20" aria-hidden="true">
        <rect x="2.5" y="3.5" width="15" height="13" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="m8 7 5 3-5 3V7Z" fill="currentColor" />
      </svg>
    );
  }
  if (type === 'AUDIO') {
    return (
      <svg className="size-4" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M7.5 14.5V5l7-1.5v9" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="5.5" cy="14.5" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12.5" cy="12.5" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg className="size-4" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5 2.75h6l4 4v10.5H5V2.75Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 2.75v4h4M7.5 10h5M7.5 13h5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function CourseClient({ courseId }: { courseId: string }) {
  const [language] = useAppLanguage();
  const [course, setCourse] = useState<EligibleCourseDto | null>(null);
  const [entry, setEntry] = useState<CourseEntryDto | null>(null);
  const [content, setContent] = useState<PublishedCourseContentDto | null>(null);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const [openingContent, setOpeningContent] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const catalog = await backendApi<EligibleCourseDto[]>('courses');
        const selected = catalog.find((item) => item.courseId === courseId);
        if (!selected) throw new Error('This Course is not available for your Major or has not been published.');
        const entered = await backendApi<CourseEntryDto>(`courses/${courseId}/enter`, { method: 'POST' });
        const publishedContent = entered.contentUnlocked
          ? await backendApi<PublishedCourseContentDto>(`courses/${courseId}/content`)
          : null;
        const initialItem = publishedContent?.contentItems[0] ?? null;
        let initialMediaUrl: string | null = null;
        let initialContentError: string | null = null;
        if (initialItem?.media) {
          try {
            const signed = await backendApi<SignedViewUrlDto>(`media/${initialItem.media.assetId}/view-url`);
            initialMediaUrl = signed.url;
          } catch (mediaError) {
            initialContentError = mediaError instanceof Error ? mediaError.message : 'Unable to open this content.';
          }
        }
        if (!cancelled) {
          setCourse(selected);
          setEntry(entered);
          setContent(publishedContent);
          setSelectedItem(initialItem);
          setMediaUrl(initialMediaUrl);
          setContentError(initialContentError);
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to enter this Course.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const openContent = useCallback(async (item: ContentItem, scroll = true) => {
    setSelectedItem(item);
    setMediaUrl(null);
    setContentError(null);
    setOpeningContent(Boolean(item.media));
    try {
      if (item.media) {
        const signed = await backendApi<SignedViewUrlDto>(`media/${item.media.assetId}/view-url`);
        setMediaUrl(signed.url);
      }
      if (scroll) {
        requestAnimationFrame(() =>
          document.getElementById('lesson-viewer')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        );
      }
    } catch (requestError) {
      setContentError(requestError instanceof Error ? requestError.message : 'Unable to open this content.');
    } finally {
      setOpeningContent(false);
    }
  }, []);

  const contentGroups = useMemo(() => {
    if (!content) return [];
    return Array.from(
      content.contentItems.reduce<
        Map<string, { title: string; position: number; items: PublishedCourseContentDto['contentItems'] }>
      >((groups, item) => {
        const key = item.section?.id ?? 'general';
        const group = groups.get(key) ?? {
          title: item.section ? `Section ${item.section.position}: ${item.section.title}` : 'General',
          position: item.section?.position ?? 0,
          items: [],
        };
        group.items.push(item);
        groups.set(key, group);
        return groups;
      }, new Map()).entries()
    )
      .map(([key, group]) => ({
        key,
        ...group,
        items: group.items.sort((left, right) => left.position - right.position),
      }))
      .sort((left, right) => left.position - right.position);
  }, [content]);

  const flatItems = useMemo(() => contentGroups.flatMap((group) => group.items), [contentGroups]);
  const selectedIndex = selectedItem ? flatItems.findIndex((item) => item.id === selectedItem.id) : -1;
  const previousItem = selectedIndex > 0 ? flatItems[selectedIndex - 1] : null;
  const nextItem = selectedIndex >= 0 && selectedIndex < flatItems.length - 1 ? flatItems[selectedIndex + 1] : null;

  if (!course || !entry) {
    return (
      <main className="mx-auto w-[min(calc(100%-48px),1720px)] pt-[clamp(54px,6vw,96px)] pb-[70px] max-[820px]:w-[min(calc(100%-36px),760px)]">
        <ApiState loading={loading} error={error} />
      </main>
    );
  }

  const toggleSection = (key: string) => {
    setCollapsedSections((current) =>
      current.includes(key) ? current.filter((sectionKey) => sectionKey !== key) : [...current, key]
    );
  };
  const viewerIsLight = selectedItem?.contentType === 'TEXT' || selectedItem?.contentType === 'IMAGE';

  return (
    <main className="bg-white">
      {/* Top back navigation bar */}
      <div className="border-b border-[#e2e6ec] bg-[#f8fafc] px-6 py-3">
        <div className="mx-auto flex max-w-[1720px] items-center justify-between">
          <Link
            href="/student/courses"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#073d78] hover:underline"
          >
            ← Back to Course catalog
          </Link>
          <span className="text-xs text-[#687486]">
            {course.title} · {courseLanguageLabel(course.languageCode, language)}
          </span>
        </div>
      </div>

      <div className="grid min-h-svh grid-cols-[minmax(0,1fr)_minmax(360px,520px)] max-[1180px]:grid-cols-[minmax(0,1fr)_390px] max-[900px]:block">
        <section className="min-w-0">
          <section
            className={`relative grid min-h-[clamp(520px,61vw,820px)] scroll-mt-24 overflow-hidden ${
              viewerIsLight ? 'bg-white text-[#292b3a]' : 'bg-[#252832] text-white'
            } max-[900px]:min-h-[560px] max-[560px]:min-h-[500px]`}
            id="lesson-viewer"
          >
            {!entry.contentUnlocked ? (
              <div className="grid place-content-center justify-items-center gap-4 p-10 text-center">
                <p className="text-xs font-bold tracking-[0.13em] text-[#7b39d8] uppercase">
                  Course content locked
                </p>
                <h1 className="text-[clamp(2rem,5vw,4rem)] font-bold tracking-[-0.04em]">
                  Complete the Pre-Test to begin
                </h1>
                <p className="max-w-md text-sm leading-6 text-[#687486]">
                  Institutional policy requires taking a short Pre-Test before accessing this course&apos;s learning content.
                  You will have one attempt to complete it.
                </p>
                {entry.preTestId ? (
                  <Link
                    className="mt-3 rounded bg-[#7b39d8] px-6 py-3 font-semibold text-white transition hover:bg-[#682ac0]"
                    href={`/student/assessments/pre-test/${entry.preTestId}?returnTo=${encodeURIComponent(
                      `/student/courses/${courseId}`
                    )}`}
                  >
                    Start Pre-Test now →
                  </Link>
                ) : (
                  <p className="text-xs text-[#8b343b]">Pre-Test is being prepared by the teacher.</p>
                )}
              </div>
            ) : selectedItem ? (
              <div className="grid min-h-0 content-center px-[clamp(28px,7vw,110px)] py-[clamp(48px,7vw,100px)]">
                <div className="mx-auto w-full max-w-[1050px]">
                  <p
                    className={`text-xs font-bold tracking-[0.13em] uppercase ${
                      viewerIsLight ? 'text-[#6f2bd2]' : 'text-[#b79be5]'
                    }`}
                  >
                    Lesson {Math.max(1, selectedIndex + 1)} · {selectedItem.contentType}
                  </p>
                  <h1 className="mt-3 max-w-[920px] text-[clamp(2rem,4.5vw,4rem)] leading-[1.1] tracking-[-0.045em]">
                    {selectedItem.title ?? selectedItem.contentType}
                  </h1>

                  {contentError ? (
                    <div className="mt-7 border-l-4 border-[#e96b72] bg-[#fae9eb] px-5 py-4 text-[#8b343b]">
                      <p>{contentError}</p>
                      <button
                        type="button"
                        onClick={() => void openContent(selectedItem, false)}
                        className="mt-2 text-xs font-bold underline"
                      >
                        Retry loading content
                      </button>
                    </div>
                  ) : openingContent ? (
                    <p className="mt-7 text-[#85899a]">Opening content…</p>
                  ) : selectedItem.contentType === 'TEXT' ? (
                    <div className="mt-10 max-h-[520px] overflow-y-auto whitespace-pre-wrap border-l-4 border-[#7b39d8] pl-7 text-[clamp(1rem,1.4vw,1.25rem)] leading-[2] text-[#4c4d5e]">
                      {selectedItem.textBody || 'No text content in this lesson.'}
                    </div>
                  ) : mediaUrl && selectedItem.contentType === 'VIDEO' ? (
                    <video className="mt-7 max-h-[650px] w-full rounded bg-black shadow-2xl" controls src={mediaUrl} />
                  ) : mediaUrl && selectedItem.contentType === 'AUDIO' ? (
                    <audio className="mt-10 w-full" controls src={mediaUrl} />
                  ) : mediaUrl && selectedItem.contentType === 'IMAGE' ? (
                    <div
                      className="mt-7 min-h-[480px] w-full bg-contain bg-center bg-no-repeat"
                      role="img"
                      aria-label={selectedItem.title ?? 'Course image'}
                      style={{ backgroundImage: `url(${mediaUrl})` }}
                    />
                  ) : mediaUrl ? (
                    <div className="mt-7 min-h-0">
                      <iframe
                        className="h-[min(62vh,680px)] w-full rounded border-0 bg-white shadow"
                        src={mediaUrl}
                        title={selectedItem.title ?? 'Course document'}
                      />
                      <a
                        className="mt-3 inline-flex font-bold text-[#b79be5] hover:underline"
                        href={mediaUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open document in a new tab →
                      </a>
                    </div>
                  ) : (
                    <div className="mt-7 rounded border border-dashed border-[#85899a]/40 p-8 text-center text-sm text-[#85899a]">
                      No media preview is available for this lesson item.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid place-content-center justify-items-center gap-3 p-10 text-center">
                <p className="text-xs font-bold tracking-[0.13em] text-[#b79be5] uppercase">{course.title}</p>
                <h1 className="text-[clamp(2rem,5vw,4.5rem)] tracking-[-0.05em]">Select a lesson to begin</h1>
              </div>
            )}

            <div
              className={`absolute inset-x-0 bottom-0 flex min-h-14 items-center justify-end gap-2 border-t px-5 ${
                viewerIsLight ? 'border-[#d9dce7] bg-white' : 'border-white/15 bg-[#252832]'
              }`}
            >
              <button
                className="grid size-9 cursor-pointer place-items-center rounded border border-transparent bg-transparent text-lg hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-25"
                type="button"
                disabled={!previousItem}
                onClick={() => previousItem && void openContent(previousItem)}
                aria-label="Previous lesson"
              >
                ←
              </button>
              <button
                className="grid size-9 cursor-pointer place-items-center rounded border border-transparent bg-transparent text-lg hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-25"
                type="button"
                disabled={!nextItem}
                onClick={() => nextItem && void openContent(nextItem)}
                aria-label="Next lesson"
              >
                →
              </button>
            </div>
          </section>

          <section className="px-[clamp(28px,9vw,140px)] py-[clamp(46px,6vw,90px)]">
            <h2 className="max-w-[880px] text-[clamp(1.8rem,3vw,3rem)] font-bold tracking-[-0.035em] text-[#292b3a]">
              {course.title}
            </h2>
            <div className="mt-8 grid max-w-[760px] grid-cols-3 gap-8 border-y border-[#e0e1e7] py-6 max-[560px]:grid-cols-1">
              <div>
                <strong className="block text-2xl text-[#6f2bd2]">{course.progress}%</strong>
                <span className="text-sm text-[#77798c]">Course progress</span>
              </div>
              <div>
                <strong className="block text-2xl text-[#292b3a]">{flatItems.length}</strong>
                <span className="text-sm text-[#77798c]">Lessons</span>
              </div>
              <div>
                <strong className="block text-base text-[#292b3a]">
                  {courseLanguageLabel(course.languageCode, language)}
                </strong>
                <span className="text-sm text-[#77798c]">Language</span>
              </div>
            </div>
            <p className="mt-8 max-w-[780px] text-base leading-[1.8] text-[#606274]">
              {course.description ?? 'Continue through the published learning content and assessments.'}
            </p>

            {/* Post-Test action card if unlocked */}
            {entry.contentUnlocked && entry.postTestId && (
              <div className="mt-10 rounded-lg border border-[#d9dce7] bg-[#fcfaff] p-6">
                <h3 className="text-lg font-semibold text-[#292b3a]">Ready for the Post-Test?</h3>
                <p className="mt-1 text-sm text-[#606274]">
                  Test your understanding of this course material. Passing score is 80%. You have unlimited attempts.
                </p>
                <Link
                  className="mt-4 inline-flex rounded bg-[#6f2bd2] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#5b1fb6]"
                  href={`/student/assessments/post-test/${entry.postTestId}`}
                >
                  Take Post-Test →
                </Link>
              </div>
            )}
          </section>
        </section>

        {/* Right sidebar: Course content syllabus */}
        <aside
          className="h-svh overflow-y-auto border-l border-[#d9dce7] bg-white max-[900px]:h-auto max-[900px]:border-t max-[900px]:border-l-0"
          aria-label="Course content"
        >
          <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-[#d9dce7] bg-white px-6">
            <h2 className="text-[1.05rem] font-semibold tracking-[-0.02em] text-[#292b3a]">Course content</h2>
            <span className="text-xs text-[#77798c]">{flatItems.length} lessons</span>
          </header>

          {content ? (
            <div>
              {contentGroups.map((group) => {
                const collapsed = collapsedSections.includes(group.key);
                const hasSelectedItem = group.items.some((item) => item.id === selectedItem?.id);
                return (
                  <section key={group.key}>
                    <button
                      className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_20px] items-center gap-3 border-0 border-b border-[#d9dce7] bg-[#f5f5f7] px-6 py-4 text-left hover:bg-[#eeeef2]"
                      type="button"
                      onClick={() => toggleSection(group.key)}
                      aria-expanded={!collapsed}
                    >
                      <span>
                        <strong className="block text-[0.95rem] leading-[1.35] text-[#292b3a]">{group.title}</strong>
                        <small className="mt-1 block text-[#696b7b]">
                          {group.items.length} lesson{group.items.length === 1 ? '' : 's'}
                          {hasSelectedItem ? ' · Learning now' : ''}
                        </small>
                      </span>
                      <svg
                        className={`size-4 transition-transform ${collapsed ? 'rotate-180' : ''}`}
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path d="m5 12.5 5-5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                      </svg>
                    </button>
                    {!collapsed && (
                      <ol className="m-0 list-none p-0">
                        {group.items.map((item) => {
                          const itemIndex = flatItems.findIndex((contentItem) => contentItem.id === item.id);
                          const active = selectedItem?.id === item.id;
                          return (
                            <li className="border-b border-[#e5e5ea]" key={item.id}>
                              <button
                                aria-current={active ? 'step' : undefined}
                                className="grid w-full cursor-pointer grid-cols-[22px_minmax(0,1fr)] gap-x-3 gap-y-1 border-0 bg-white px-6 py-[16px] text-left text-[#4d4f60] hover:bg-[#f7f5fa] aria-[current=step]:bg-[#e8e5ee]"
                                onClick={() => void openContent(item)}
                                type="button"
                              >
                                <span
                                  className={`mt-0.5 grid size-[19px] place-items-center rounded-full border text-[0.62rem] font-bold ${
                                    active
                                      ? 'border-[#6f2bd2] bg-[#6f2bd2] text-white'
                                      : 'border-[#77798c] text-[#77798c]'
                                  }`}
                                >
                                  {active ? '▶' : itemIndex + 1}
                                </span>
                                <strong className="text-[0.9rem] leading-[1.45] font-normal">
                                  {itemIndex + 1}. {item.title ?? item.contentType}
                                </strong>
                                <span className="col-start-2 flex items-center gap-1.5 text-xs text-[#77798c]">
                                  <ContentTypeIcon type={item.contentType} />
                                  {item.contentType.toLowerCase()}
                                  {item.media ? ` · ${item.media.fileName}` : ''}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </section>
                );
              })}
            </div>
          ) : (
            <section className="grid min-h-[280px] place-content-center justify-items-center gap-3 p-9 text-center text-[#4f5b6b]">
              <strong className="text-[1.05rem] text-[#292b3a]">Complete the Pre-Test first</strong>
              <p className="max-w-[360px] text-sm leading-[1.6]">
                The Pre-Test unlocks this Course&apos;s learning content and syllabus.
              </p>
              {entry.preTestId ? (
                <Link
                  className="rounded bg-[#6f2bd2] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#5b1fb6]"
                  href={`/student/assessments/pre-test/${entry.preTestId}?returnTo=${encodeURIComponent(
                    `/student/courses/${courseId}`
                  )}`}
                >
                  Start Pre-Test →
                </Link>
              ) : null}
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
