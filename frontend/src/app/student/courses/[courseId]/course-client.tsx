'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  backendApi,
  type CourseEntryDto,
  type EligibleCourseDto,
  type PublishedCourseContentDto,
  type SignedViewUrlDto,
} from '../../../../lib/backend-api';
import { courseLanguageLabel } from '../../../../lib/course-language';
import { useAppLanguage } from '../../../../lib/language';
import { learningCopy } from '../../../../lib/learning-copy';
import ApiState from '../../../api-state';
import BootstrapIcon from '../../../bootstrap-icon';
import { useUiTranslation } from "../../../../lib/ui-translations";


type ContentItem = PublishedCourseContentDto['contentItems'][number];

const reportReasons = [
  'Inappropriate or harmful content',
  'Incorrect or misleading information',
  'Copyright or ownership concern',
  'Spam or promotional content',
  'Technical problem with the course',
  'Other',
] as const;

function ContentTypeIcon({ type }: { type: string }) {
  const name = type === 'VIDEO' ? 'play-btn' : type === 'AUDIO' ? 'music-note-beamed' : 'file-earmark-text';
  return <BootstrapIcon name={name} className="text-base" />;
}

export default function CourseClient({ courseId }: { courseId: string }) {
  const t = useUiTranslation();
  const [language] = useAppLanguage();
  const copy = learningCopy[language];
  const [course, setCourse] = useState<EligibleCourseDto | null>(null);
  const [entry, setEntry] = useState<CourseEntryDto | null>(null);
  const [content, setContent] = useState<PublishedCourseContentDto | null>(null);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const [openingContent, setOpeningContent] = useState(false);
  const [savingCompletion, setSavingCompletion] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reporting, setReporting] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedReportReasons, setSelectedReportReasons] = useState<string[]>([]);
  const [reportDetails, setReportDetails] = useState('');
  const contentRequestId = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const catalog = await backendApi<EligibleCourseDto[]>('courses');
        const selected = catalog.find((item) => item.courseId === courseId);
        if (!selected) throw new Error("This Course is not available for your Major or has not been published.");
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
            initialContentError = mediaError instanceof Error ? mediaError.message : "Unable to open this content.";
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
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : "Unable to enter this Course.");
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
    const requestId = ++contentRequestId.current;
    setSelectedItem(item);
    setMediaUrl(null);
    setContentError(null);
    setOpeningContent(Boolean(item.media));
    try {
      if (item.media) {
        const signed = await backendApi<SignedViewUrlDto>(`media/${item.media.assetId}/view-url`);
        if (requestId !== contentRequestId.current) return;
        setMediaUrl(signed.url);
      }
      if (requestId !== contentRequestId.current) return;
      if (scroll) {
        requestAnimationFrame(() =>
          document.getElementById('lesson-viewer')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        );
      }
    } catch (requestError) {
      if (requestId !== contentRequestId.current) return;
      setContentError(requestError instanceof Error ? requestError.message : "Unable to open this content.");
    } finally {
      if (requestId === contentRequestId.current) setOpeningContent(false);
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
  const allLessonsComplete = flatItems.length > 0 && flatItems.every(item => item.completed);

  async function markLessonComplete() {
    if (!selectedItem || savingCompletion) return;
    const itemId = selectedItem.id;
    setSavingCompletion(true);
    setCompletionError(null);
    try {
      const updated = await backendApi<PublishedCourseContentDto>(`courses/${courseId}/content/${itemId}/complete`, { method: 'POST' });
      setContent(updated);
      setSelectedItem(current => updated.contentItems.find(item => item.id === current?.id) ?? current);
      const catalog = await backendApi<EligibleCourseDto[]>('courses');
      setCourse(current => catalog.find(item => item.courseId === courseId) ?? current);
    } catch (cause) {
      setCompletionError(cause instanceof Error ? cause.message : copy.saveError);
    } finally { setSavingCompletion(false); }
  }

  if (!course || !entry) {
    return (
      <main data-ui="page" className="mx-auto w-[min(calc(100%-48px),1720px)] pt-[clamp(54px,6vw,96px)] pb-[70px] max-[820px]:w-[min(calc(100%-36px),760px)]">
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
  const otherReasonNeedsDetails = selectedReportReasons.includes('Other') && !reportDetails.trim();

  return (
    <main data-ui="page" className="bg-white">
      {/* Top back navigation bar */}
      <div className="border-b border-[#e2e6ec] bg-[#f8fafc] px-6 py-3">
        <div className="mx-auto flex max-w-[1720px] flex-wrap items-center justify-between gap-3">
          <Link
            href="/student/courses"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#073d78] hover:underline"
          >
            <BootstrapIcon name="arrow-left" />{t("Back to Course catalog")}</Link>
          <span className="text-xs text-[#687486]">
            {course.title} · {courseLanguageLabel(course.languageCode, language)}
          </span>
        </div>
      </div>
      <section className="mx-auto flex max-w-[1720px] justify-end px-6 pt-4">
        <button className="text-sm text-red-700 underline underline-offset-4" type="button" onClick={() => { setReportMessage(''); setReportOpen(true); }}><BootstrapIcon name="flag" /> {t('Report course')}</button>
      </section>
      {reportMessage ? <p className="mx-auto max-w-[1720px] px-6 py-2 text-right text-sm text-[#58677c]" role="status">{reportMessage}</p> : null}
      {reportOpen ? <div className="fixed inset-0 z-100 grid place-items-center bg-slate-950/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !reporting) setReportOpen(false); }}>
        <section className="w-full max-w-xl rounded-panel bg-white p-6 shadow-[0_24px_70px_rgb(15_23_42_/_28%)] sm:p-8" role="dialog" aria-modal="true" aria-labelledby="report-course-title">
          <header className="flex items-start justify-between gap-6"><div><h2 id="report-course-title" className="text-2xl font-semibold text-[#20243a]">{t('Report this course')}</h2><p className="mt-2 text-sm leading-6 text-muted">{t('Select every reason that applies. Your report will be reviewed by an Approver.')}</p></div><button className="grid size-11 shrink-0 place-items-center rounded-control text-xl hover:bg-slate-100" type="button" disabled={reporting} aria-label={t('Close')} onClick={() => setReportOpen(false)}><BootstrapIcon name="x-lg" /></button></header>
          <form className="mt-6" onSubmit={async (event) => {
            event.preventDefault();
            if (!selectedReportReasons.length || otherReasonNeedsDetails) return;
            const reason = `${selectedReportReasons.map(item => t(item)).join(', ')}${reportDetails.trim() ? `\n\n${reportDetails.trim()}` : ''}`;
            setReporting(true); setReportMessage('');
            try { await backendApi(`course-reports/courses/${courseId}`, { method: 'POST', body: JSON.stringify({ reason }) }); setReportMessage(t('Course report submitted.')); setReportOpen(false); setSelectedReportReasons([]); setReportDetails(''); }
            catch (cause) { setReportMessage(cause instanceof Error ? t(cause.message) : t('Unable to submit course report.')); }
            finally { setReporting(false); }
          }}>
            <fieldset className="grid gap-2"><legend className="mb-3 font-medium">{t('Reason for reporting')}</legend>{reportReasons.map(reason => <label key={reason} className="flex min-h-12 items-center gap-3 rounded-control border border-line px-4 py-3 text-sm transition hover:border-[#9db3cc] hover:bg-slate-50"><input className="size-4" type="checkbox" checked={selectedReportReasons.includes(reason)} onChange={(event) => setSelectedReportReasons(current => event.target.checked ? [...current, reason] : current.filter(item => item !== reason))} /><span>{t(reason)}</span></label>)}</fieldset>
            {selectedReportReasons.includes('Other') ? <label className="mt-5 grid gap-2 text-sm font-medium">{t('Additional details (required)')}<textarea className="min-h-28 resize-y border border-line bg-white px-4 py-3 font-normal" maxLength={1500} required aria-invalid={otherReasonNeedsDetails} aria-describedby={otherReasonNeedsDetails ? 'report-details-error' : undefined} value={reportDetails} onChange={event => setReportDetails(event.target.value)} placeholder={t('Add information that will help the Approver review this report.')} autoFocus /></label> : null}
            {!selectedReportReasons.length ? <p className="mt-3 text-sm text-amber-700">{t('Select at least one reason.')}</p> : null}
            {otherReasonNeedsDetails ? <p id="report-details-error" className="mt-3 text-sm text-amber-700">{t('Additional details are required when Other is selected.')}</p> : null}
            {reportMessage ? <p className="mt-3 text-sm text-red-700" role="alert">{reportMessage}</p> : null}
            <footer className="mt-6 flex flex-wrap justify-end gap-3"><button className="min-h-11 rounded-control border border-line px-5 py-2 text-sm font-medium" type="button" disabled={reporting} onClick={() => setReportOpen(false)}>{t('Cancel')}</button><button className="min-h-11 rounded-control bg-red-700 px-5 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={reporting || !selectedReportReasons.length || otherReasonNeedsDetails}>{reporting ? t('Submitting…') : t('Submit report')}</button></footer>
          </form>
        </section>
      </div> : null}

      <div className="grid min-h-svh grid-cols-[minmax(0,1fr)_minmax(360px,520px)] max-[1180px]:grid-cols-[minmax(0,1fr)_390px] max-[900px]:block">
        <section className="min-w-0">
          <section
            className={`relative grid min-h-[clamp(320px,42vw,680px)] max-[900px]:min-h-[clamp(240px,56vw,440px)] scroll-mt-24 overflow-hidden ${
              viewerIsLight ? 'bg-white text-[#292b3a]' : 'bg-[#252832] text-white'
            }`}
            id="lesson-viewer"
          >
            {!entry.contentUnlocked ? (
              <div className="grid place-content-center justify-items-center gap-4 p-10 text-center">
                <p className="text-xs font-bold tracking-[0.13em] text-[#7b39d8] uppercase">{t("Course content locked")}</p>
                <h1 className="text-[clamp(2rem,5vw,4rem)] font-bold tracking-[-0.04em]">
                  {copy.preGate}
                </h1>
                <p className="max-w-md text-sm leading-6 text-[#d7e3f0]">
                  {copy.preHint}{t("You will have one attempt to complete it.")}</p>
                {entry.preTestId ? (
                  <Link
                    className="mt-3 rounded bg-[#7b39d8] px-6 py-3 font-semibold text-white transition hover:bg-[#682ac0]"
                    href={`/student/assessments/pre-test/${entry.preTestId}?returnTo=${encodeURIComponent(
                      `/student/courses/${courseId}`
                    )}`}
                  >
                    {copy.startPre} <BootstrapIcon name="arrow-right" />
                  </Link>
                ) : (
                  <p className="text-xs text-[#8b343b]">{copy.prePreparing}</p>
                )}
              </div>
            ) : selectedItem ? (
              <div className="grid min-h-0 content-center px-[clamp(28px,7vw,110px)] py-[clamp(48px,7vw,100px)]">
                <div className="mx-auto w-full max-w-[1050px]">
                  <p
                    className={`text-xs font-bold tracking-[0.13em] uppercase ${
                      viewerIsLight ? 'text-[#6f2bd2]' : 'text-[#b79be5]'
                    }`}
                  >{t("Lesson")}{Math.max(1, selectedIndex + 1)} · {t(selectedItem.contentType)}
                  </p>
                  <h1 className="mt-3 max-w-[920px] text-[clamp(2rem,4.5vw,4rem)] leading-[1.1] tracking-[-0.03em]">
                    {selectedItem.title ?? selectedItem.contentType}
                  </h1>

                  {contentError ? (
                    <div className="mt-7 rounded-control border border-[#e96b72] bg-[#fae9eb] px-5 py-4 text-[#8b343b]">
                      <p>{t(contentError)}</p>
                      <button
                        type="button"
                        onClick={() => void openContent(selectedItem, false)}
                        className="mt-2 text-xs font-bold underline"
                      >{t("Retry loading content")}</button>
                    </div>
                  ) : openingContent ? (
                    <p className="mt-7 text-[#85899a]">{t("Opening content…")}</p>
                  ) : selectedItem.contentType === 'TEXT' ? (
                    <div className="mt-10 max-h-[520px] overflow-y-auto whitespace-pre-wrap border-t border-line pt-6 text-[clamp(1rem,1.4vw,1.25rem)] leading-[2] text-[#4c4d5e]">
                      {selectedItem.textBody || t("No text content in this lesson.")}
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
                      >{t("Open document in a new tab")}<BootstrapIcon name="box-arrow-up-right" />
                      </a>
                    </div>
                  ) : (
                    <div className="mt-7 rounded border border-dashed border-[#85899a]/40 p-8 text-center text-sm text-[#85899a]">{t("No media preview is available for this lesson item.")}</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid place-content-center justify-items-center gap-3 p-10 text-center">
                <p className="text-xs font-bold tracking-[0.13em] text-[#b79be5] uppercase">{course.title}</p>
                <h1 className="text-[clamp(2rem,5vw,4.5rem)] tracking-[-0.03em]">{t("Select a lesson to begin")}</h1>
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
                aria-label={t("Previous lesson")}
              >
                <BootstrapIcon name="arrow-left" />
              </button>
              {entry.contentUnlocked && selectedItem ? <button type="button" className="mr-auto rounded bg-[#073d78] px-4 py-2 text-sm text-white disabled:opacity-50" disabled={savingCompletion || openingContent || (Boolean(selectedItem.media) && !mediaUrl) || selectedItem.completed} onClick={() => void markLessonComplete()}>{selectedItem.completed ? `✓ ${copy.completed}` : savingCompletion ? copy.saving : copy.markComplete}</button> : null}
              {completionError ? <span role="alert" className="text-xs text-red-600">{t(completionError)}</span> : null}
              <button
                className="grid size-9 cursor-pointer place-items-center rounded border border-transparent bg-transparent text-lg hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-25"
                type="button"
                disabled={!nextItem}
                onClick={() => nextItem && void openContent(nextItem)}
                aria-label={t("Next lesson")}
              >
                <BootstrapIcon name="arrow-right" />
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
                <span className="text-sm text-[#77798c]">{t("Course progress")}</span>
              </div>
              <div>
                <strong className="block text-2xl text-[#292b3a]">{flatItems.length}</strong>
                <span className="text-sm text-[#77798c]">{t("Lessons")}</span>
              </div>
              <div>
                <strong className="block text-base text-[#292b3a]">
                  {courseLanguageLabel(course.languageCode, language)}
                </strong>
                <span className="text-sm text-[#77798c]">{t("Language")}</span>
              </div>
            </div>
            <p className="mt-8 max-w-[780px] text-base leading-[1.8] text-[#606274]">
              {course.description ?? t("Continue through the published learning content and assessments.")}
            </p>

            {entry.contentUnlocked && entry.preTestId ? (
              <Link
                className="mt-8 inline-flex text-sm font-bold text-[#073d78] hover:underline"
                href={`/student/assessments/pre-test/${entry.preTestId}?returnTo=${encodeURIComponent(
                  `/student/courses/${courseId}`,
                )}`}
              >
                {copy.preResult} <BootstrapIcon name="arrow-right" />
              </Link>
            ) : null}

            {/* Post-Test action card if unlocked */}
            {entry.contentUnlocked && entry.postTestId && (
              <div className="mt-10 rounded-lg border border-[#d9dce7] bg-[#fcfaff] p-6">
                <h3 className="text-lg font-semibold text-[#292b3a]">{copy.postReady}</h3>
                <p className="mt-1 text-sm text-[#606274]">{t("Test your understanding of this course material. Passing score is 80%. You have unlimited attempts.")}</p>
                {allLessonsComplete ? <Link
                  className="mt-4 inline-flex rounded bg-[#6f2bd2] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#5b1fb6]"
                  href={`/student/assessments/post-test/${entry.postTestId}`}
                >
                  {copy.takePost} <BootstrapIcon name="arrow-right" />
                </Link> : <p className="mt-4 text-sm text-[#606274]">{copy.unlockPost}</p>}
              </div>
            )}
            {allLessonsComplete && !entry.postTestId ? <p role="status" className="mt-8 text-emerald-700">✓ {copy.courseCompleted}</p> : null}
          </section>
        </section>

        {/* Right sidebar: Course content syllabus */}
        <aside
          className="h-svh overflow-y-auto border-l border-[#d9dce7] bg-white max-[900px]:h-auto max-[900px]:border-t max-[900px]:border-l-0"
          aria-label={t("Course content")}
        >
          <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-[#d9dce7] bg-white px-6">
            <h2 className="text-[1.05rem] font-semibold tracking-[-0.02em] text-[#292b3a]">{t("Course content")}</h2>
            <span className="text-xs text-[#77798c]">{flatItems.length}{t(" lessons")}</span>
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
                          {group.items.length}{t(" lesson")}{group.items.length === 1 ? '' : 's'}
                          {hasSelectedItem ? t(" · Learning now") : ''}
                        </small>
                      </span>
                      <BootstrapIcon name="chevron-up" className={`text-base transition-transform ${collapsed ? 'rotate-180' : ''}`} />
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
                                  {item.completed ? '✓' : active ? '▶' : itemIndex + 1}
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
              <strong className="text-[1.05rem] text-[#292b3a]">{copy.preGate}</strong>
              <p className="max-w-[360px] text-sm leading-[1.6]">
                {copy.preUnlocks}
              </p>
              {entry.preTestId ? (
                <Link
                  className="rounded bg-[#6f2bd2] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#5b1fb6]"
                  href={`/student/assessments/pre-test/${entry.preTestId}?returnTo=${encodeURIComponent(
                    `/student/courses/${courseId}`
                  )}`}
                >
                  {copy.startPre} <BootstrapIcon name="arrow-right" />
                </Link>
              ) : null}
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
