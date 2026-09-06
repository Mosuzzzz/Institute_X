'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { backendApi, type CategoryDto, type MajorDto, type TeacherCourseDto, type TeacherPermissionDto } from '../../../../lib/backend-api';
import { useBackendQuery } from '../../../../lib/use-backend-query';
import { useAppLanguage } from '../../../../lib/language';
import { translateCategory, translateMajor } from '../../../../lib/reference-translations';
import ApiState from '../../../api-state';
import { formUi, staffUi } from '../../../ui-styles';

export default function CreateCourseClient() {
  const router = useRouter();
  const [language] = useAppLanguage();
  const categories = useBackendQuery<CategoryDto[]>('categories');
  const majors = useBackendQuery<MajorDto[]>('majors');
  const permission = useBackendQuery<TeacherPermissionDto | null>('teacher-permissions/me');
  const [eligibilityMode, setEligibilityMode] = useState<'OPEN' | 'LIMITED'>('OPEN');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (categories.loading || majors.loading || permission.loading) return <main className={formUi.page}><ApiState loading error={null} /></main>;
  if (categories.error || majors.error || permission.error) return <main className={formUi.page}><ApiState loading={false} error={categories.error ?? majors.error ?? permission.error} /></main>;
  if (permission.data?.status !== 'APPROVED') return <main className={formUi.page}><section className="border border-[#dce1e7] bg-white p-8"><p className={staffUi.eyebrow}>Permission required</p><h1 className="mt-2 text-3xl text-[#202a38]">Course creation is locked</h1><p className="mt-3 text-[#667182]">An Approver must approve your Teacher permission before you can create a Course.</p><Link className={`${staffUi.primaryAction} mt-6 inline-flex`} href="/teacher/permission">Open permission request</Link></section></main>;
  if (!categories.data || !majors.data) return <main className={formUi.page}><ApiState loading={false} error="Course reference data is unavailable." /></main>;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaving(true); setError(null);
    try {
      const categoryIds = formData.getAll('category');
      if (categoryIds.length === 0) {
        setError('Choose at least one Category.');
        setSaving(false);
        return;
      }
      const majorIds = eligibilityMode === 'OPEN' ? [] : formData.getAll('major');
      if (eligibilityMode === 'LIMITED' && majorIds.length === 0) {
        setError('Choose at least one eligible Major for a LIMITED Course.');
        setSaving(false);
        return;
      }
      const course = await backendApi<TeacherCourseDto>('courses', {
        method: 'POST',
        body: JSON.stringify({
          title: formData.get('title'),
          description: formData.get('description'),
          languageCode: language,
          categoryIds,
          eligibilityMode,
          majorIds,
        }),
      });
      router.replace(`/teacher/courses/${course.id}`);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to create Course.'); setSaving(false); }
  };

  return (
    <main className="min-h-full bg-[#f7f7f9] pb-16">
      <header className="sticky top-0 z-20 flex min-h-[72px] flex-wrap items-center gap-x-5 gap-y-2 bg-[#17171f] px-[clamp(20px,4vw,56px)] py-4 text-white shadow-[0_12px_28px_rgba(23,23,31,0.14)]">
        <Link className="text-sm text-white/80 no-underline transition hover:text-white" href="/teacher/courses">
          ← Back to courses
        </Link>
        <strong className="text-sm font-semibold">Untitled Course</strong>
        <span className="rounded bg-[#77798a] px-3 py-1 text-xs font-semibold tracking-wide text-white uppercase">
          Draft
        </span>
        <span className="text-sm text-white/70">Version 1 · New course</span>
      </header>

      <form
        className="mx-auto grid w-[min(calc(100%-48px),1420px)] grid-cols-[280px_minmax(0,1fr)] py-10 max-[900px]:w-full max-[900px]:grid-cols-1 max-[900px]:py-0"
        onSubmit={(event) => void submit(event)}
      >
        <nav className="sticky top-[104px] grid h-fit content-start gap-8 px-7 py-8 max-[900px]:static max-[900px]:grid-cols-3 max-[900px]:gap-5 max-[900px]:overflow-x-auto max-[900px]:bg-white max-[640px]:grid-cols-1" aria-label="New course sections">
          <div>
            <h2 className="text-sm font-semibold text-[#292b3a]">Plan your course</h2>
            <div className="mt-3 grid">
              <a className="flex min-w-52 items-center gap-3 border-l-[3px] border-[#6d28d9] bg-white px-4 py-2.5 text-sm text-[#292b3a] no-underline" href="#course-information">
                <span className="size-5 rounded-full border border-[#77798a]" />
                Course information
              </a>
              <a className="flex min-w-52 items-center gap-3 border-l-[3px] border-transparent px-4 py-2.5 text-sm text-[#4c4d5e] no-underline transition hover:border-[#6d28d9] hover:bg-white" href="#discovery">
                <span className="size-5 rounded-full border border-[#77798a]" />
                Discovery
              </a>
              <a className="flex min-w-52 items-center gap-3 border-l-[3px] border-transparent px-4 py-2.5 text-sm text-[#4c4d5e] no-underline transition hover:border-[#6d28d9] hover:bg-white" href="#eligibility">
                <span className="size-5 rounded-full border border-[#77798a]" />
                Student eligibility
              </a>
            </div>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#292b3a]">Create your content</h2>
            <p className="mt-3 px-4 text-xs leading-5 text-[#747d8c]">
              Curriculum, media, Pre-Test and Post-Test become available after the Draft is created.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#292b3a]">Continue editing</h2>
            <button className="mt-5 inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-sm bg-[#6d28d9] px-5 text-sm font-semibold text-white transition hover:bg-[#5b21b6] disabled:cursor-not-allowed disabled:bg-[#b7afc9]" type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create Draft & Continue'}
            </button>
            <Link className="mt-3 flex min-h-10 items-center justify-center text-sm font-medium text-[#5b21b6] no-underline hover:underline" href="/teacher/courses">
              Cancel
            </Link>
          </div>
        </nav>

        <div className="min-w-0 overflow-hidden bg-white shadow-[0_8px_30px_rgba(24,24,35,0.09)]">
          <section className="scroll-mt-28 border-b border-[#e2e4eb] p-6 sm:p-10" id="course-information">
            <p className="text-xs font-bold tracking-[0.12em] text-[#6d28d9] uppercase">Course setup</p>
            <h1 className="mt-2 text-3xl tracking-[-0.04em] text-[#202a38]">Course information</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#687486]">
              Enter the title and description that students will see in the course catalog.
            </p>
            <div className="mt-7 grid max-w-3xl gap-5">
              <label className="grid gap-2 text-sm font-semibold text-[#292b3a]">
                Course title
                <input className="min-h-12 border border-[#cfd2df] px-4 font-normal outline-none transition focus:border-[#6d28d9] focus:ring-2 focus:ring-[#6d28d9]/15" name="title" required maxLength={255} placeholder="e.g. Network Fundamentals" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[#292b3a]">
                Description
                <textarea className="min-h-36 resize-y border border-[#cfd2df] px-4 py-3 font-normal outline-none transition focus:border-[#6d28d9] focus:ring-2 focus:ring-[#6d28d9]/15" name="description" rows={5} maxLength={10000} placeholder="What will students learn in this course?" />
              </label>
            </div>
          </section>

          <section className="scroll-mt-28 border-b border-[#e2e4eb] p-6 sm:p-10" id="discovery">
            <p className="text-xs font-bold tracking-[0.12em] text-[#6d28d9] uppercase">Catalog discovery</p>
            <h2 className="mt-2 text-2xl text-[#202a38]">Categories</h2>
            <p className="mt-2 text-sm text-[#687486]">Choose at least one category so students can find the course.</p>
            <fieldset className="mt-6">
              <legend className="sr-only">Categories</legend>
              <div className={formUi.choices}>
                {categories.data.map((category) => (
                  <label key={category.id}>
                    <input type="checkbox" name="category" value={category.id} />{' '}
                    {translateCategory(category, language)}
                  </label>
                ))}
              </div>
            </fieldset>
          </section>

          <section className="scroll-mt-28 p-6 sm:p-10" id="eligibility">
            <p className="text-xs font-bold tracking-[0.12em] text-[#6d28d9] uppercase">Audience access</p>
            <h2 className="mt-2 text-2xl text-[#202a38]">Student eligibility</h2>
            <p className="mt-2 text-sm text-[#687486]">Choose whether every active student or only selected majors can access this course.</p>
            <fieldset className="mt-6">
              <legend className="sr-only">Course access</legend>
              <div className="grid grid-cols-2 border border-[#d7dce5] max-[600px]:grid-cols-1">
                {(['OPEN', 'LIMITED'] as const).map((mode) => (
                  <label className={`grid min-h-24 cursor-pointer grid-cols-[20px_1fr] items-center gap-3 px-5 py-4 transition-colors ${eligibilityMode === mode ? 'bg-[#f1edff] text-[#5b21b6]' : 'bg-white hover:bg-[#f7f7f9]'}`} key={mode}>
                    <input className="size-[17px] accent-[#6d28d9]" type="radio" name="eligibilityMode" value={mode} checked={eligibilityMode === mode} onChange={() => { setEligibilityMode(mode); setError(null); }} />
                    <span>
                      <strong className="block text-sm">{mode}</strong>
                      <small className="mt-1 block font-normal leading-5 text-[#667182]">{mode === 'OPEN' ? 'All active students can enter; no major selection required.' : 'Only students from selected majors can enter.'}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            {eligibilityMode === 'LIMITED' ? (
              <fieldset className="mt-7">
                <legend className="mb-3 text-sm font-semibold text-[#292b3a]">Eligible majors</legend>
                <div className={formUi.choices}>
                  {majors.data.map((major) => (
                    <label key={major.id}>
                      <input type="checkbox" name="major" value={major.id} />{' '}
                      {translateMajor(major, language)} ({major.code})
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : (
              <p className="mt-5 text-sm text-[#667182]">No major selection is needed for an OPEN course.</p>
            )}
            {error ? <p className="mt-6 border-l-4 border-[#b42318] bg-[#fff3f2] p-4 text-sm text-[#8f1d14]" role="alert">{error}</p> : null}
            <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-[#e2e4eb] pt-6">
              <button className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-sm bg-[#6d28d9] px-7 text-sm font-semibold text-white transition hover:bg-[#5b21b6] disabled:cursor-not-allowed disabled:bg-[#b7afc9]" type="submit" disabled={saving}>
                {saving ? 'Creating…' : 'Create Draft & Continue'}
              </button>
              <span className="text-sm text-[#687486]">You will add the cover, curriculum and assessments on the next page.</span>
            </div>
          </section>
        </div>
      </form>
    </main>
  );
}
