'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { backendApi, type CategoryDto, type MajorDto, type TeacherCourseDto } from '../../../../lib/backend-api';
import { useBackendQuery } from '../../../../lib/use-backend-query';
import { useAppLanguage } from '../../../../lib/language';
import { translateCategory, translateMajor } from '../../../../lib/reference-translations';
import ApiState from '../../../api-state';
import { formUi } from '../../../ui-styles';
import { useUiTranslation } from "../../../../lib/ui-translations";


export default function CreateCourseClient() {
  const t = useUiTranslation();
  const router = useRouter();
  const [language] = useAppLanguage();
  const categories = useBackendQuery<CategoryDto[]>('categories');
  const majors = useBackendQuery<MajorDto[]>('majors');
  const [eligibilityMode, setEligibilityMode] = useState<'OPEN' | 'LIMITED'>('OPEN');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (categories.loading || majors.loading) return <main data-ui="editor" className={formUi.page}><ApiState loading error={null} /></main>;
  if (categories.error || majors.error) return <main data-ui="editor" className={formUi.page}><ApiState loading={false} error={categories.error ?? majors.error} /></main>;
  if (!categories.data || !majors.data) return <main data-ui="editor" className={formUi.page}><ApiState loading={false} error="Course reference data is unavailable." /></main>;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaving(true); setError(null);
    try {
      const categoryIds = formData.getAll('category');
      if (categoryIds.length === 0) {
        setError(t("Choose at least one Category."));
        setSaving(false);
        return;
      }
      const majorIds = eligibilityMode === 'OPEN' ? [] : formData.getAll('major');
      if (eligibilityMode === 'LIMITED' && majorIds.length === 0) {
        setError(t("Choose at least one eligible Major for a LIMITED Course."));
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
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("Unable to create Course.")); setSaving(false); }
  };

  return (
    <main data-ui="editor" className="min-h-full bg-[#f7f7f9] pb-16">
      <header className="sticky top-0 z-20 flex min-h-[72px] flex-wrap items-center gap-x-5 gap-y-2 bg-[#1c1d1f] px-[clamp(20px,4vw,56px)] py-4 text-white shadow-[0_12px_28px_rgba(23,23,31,0.14)]">
        <Link className="text-sm font-medium text-white/80 no-underline transition hover:text-white" href="/teacher/courses">{t("Back to courses")}</Link>
        <strong className="text-sm font-semibold">{t("Untitled Course")}</strong>
        <span className="rounded bg-[#3e4143] px-2.5 py-0.5 text-xs font-bold tracking-wider text-white uppercase">{t("Draft")}</span>
        <span className="text-xs text-white/70">{t("Version 1 · New course")}</span>
      </header>

      <form
        className="mx-auto grid w-[min(calc(100%-48px),1420px)] grid-cols-[280px_minmax(0,1fr)] gap-8 py-10 max-[900px]:w-full max-[900px]:grid-cols-1 max-[900px]:py-0"
        onSubmit={(event) => void submit(event)}
      >
        <nav className="sticky top-[104px] grid h-fit content-start gap-8 px-7 py-8 max-[900px]:static max-[900px]:grid-cols-3 max-[900px]:gap-5 max-[900px]:overflow-x-auto max-[900px]:bg-white max-[640px]:grid-cols-1" aria-label={t("New course sections")}>
          <div>
            <h2 className="text-xs font-bold text-[#1c1d1f] tracking-wide mb-3">{t("Plan your course")}</h2>
            <div className="mt-3 grid gap-1">
              <a className="flex min-w-0 items-center gap-3 border-l-[3px] border-[#1c1d1f] bg-white px-4 py-2.5 text-sm font-bold text-[#1c1d1f] no-underline shadow-xs" href="#course-information">
                <span className="size-4.5 rounded-full border border-[#1c1d1f] bg-[#1c1d1f] flex items-center justify-center">
                  <span className="size-1.5 rounded-full bg-white" />
                </span>{t("Course information")}</a>
              <a className="flex min-w-0 items-center gap-3 border-l-[3px] border-transparent px-4 py-2.5 text-sm text-[#4c4d5e] no-underline transition hover:border-[#1c1d1f] hover:bg-white hover:text-[#1c1d1f]" href="#discovery">
                <span className="size-4.5 rounded-full border border-[#6a6f73]" />{t("Discovery")}</a>
              <a className="flex min-w-0 items-center gap-3 border-l-[3px] border-transparent px-4 py-2.5 text-sm text-[#4c4d5e] no-underline transition hover:border-[#1c1d1f] hover:bg-white hover:text-[#1c1d1f]" href="#eligibility">
                <span className="size-4.5 rounded-full border border-[#6a6f73]" />{t("Student eligibility")}</a>
            </div>
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#1c1d1f] tracking-wide mb-3">{t("Create your content")}</h2>
            <p className="px-3 text-xs leading-5 text-[#58677c]">{t("Curriculum, media, Pre-Test and Post-Test become available after the Draft is created.")}</p>
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#1c1d1f] tracking-wide mb-3">{t("Continue editing")}</h2>
            <button className="mt-3 inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded bg-[#073d78] hover:bg-[#052e5b] px-5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:bg-[#aebdce] shadow-sm" type="submit" disabled={saving}>
              {saving ? t("Creating…") : t("Create Draft & Continue")}
            </button>
            <Link className="mt-3 flex min-h-10 items-center justify-center text-sm font-medium text-[#073d78] no-underline hover:underline" href="/teacher/courses">{t("Cancel")}</Link>
          </div>
        </nav>

        <div className="min-w-0 overflow-hidden bg-white shadow-[0_8px_30px_rgba(24,24,35,0.09)]">
          <section className="scroll-mt-28 border-b border-[#e2e4eb] p-6 sm:p-10" id="course-information">
            <h1 className="mt-2 text-3xl tracking-[-0.04em] text-[#202a38]">{t("Course information")}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#687486]">{t("Enter the title and description that students will see in the course catalog.")}</p>
            <div className="mt-7 grid max-w-3xl gap-5">
              <label className="grid gap-2 text-sm font-semibold text-[#292b3a]">{t("Course title")}<input className="min-h-12 border border-[#cfd2df] px-4 font-normal outline-none transition focus:border-[#063777] focus:ring-2 focus:ring-[#063777]/15" name="title" required maxLength={255} placeholder={t("e.g. Network Fundamentals")} />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[#292b3a]">{t("Description")}<textarea className="min-h-36 resize-y border border-[#cfd2df] px-4 py-3 font-normal outline-none transition focus:border-[#063777] focus:ring-2 focus:ring-[#063777]/15" name="description" rows={5} maxLength={10000} placeholder={t("What will students learn in this course?")} />
              </label>
            </div>
          </section>

          <section className="scroll-mt-28 border-b border-[#e2e4eb] p-6 sm:p-10" id="discovery">
            <h2 className="mt-2 text-2xl text-[#202a38]">{t("Categories")}</h2>
            <p className="mt-2 text-sm text-[#687486]">{t("Choose at least one category so students can find the course.")}</p>
            <fieldset className="mt-6">
              <legend className="sr-only">{t("Categories")}</legend>
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
            <h2 className="mt-2 text-2xl text-[#202a38]">{t("Student eligibility")}</h2>
            <p className="mt-2 text-sm text-[#687486]">{t("Choose whether every active student or only selected majors can access this course.")}</p>
            <fieldset className="mt-6">
              <legend className="sr-only">{t("Course access")}</legend>
              <div className="grid grid-cols-2 border border-[#d7dce5] max-[600px]:grid-cols-1">
                {(['OPEN', 'LIMITED'] as const).map((mode) => (
                  <label className={`grid min-h-24 cursor-pointer grid-cols-[20px_1fr] items-center gap-3 px-5 py-4 transition-colors ${eligibilityMode === mode ? 'bg-[#edf3fa] text-[#052b5b]' : 'bg-white hover:bg-[#f7f7f9]'}`} key={t(mode)}>
                    <input className="size-[17px] accent-[#063777]" type="radio" name="eligibilityMode" value={t(mode)} checked={eligibilityMode === mode} onChange={() => { setEligibilityMode(mode); setError(null); }} />
                    <span>
                      <strong className="block text-sm">{t(mode)}</strong>
                      <small className="mt-1 block font-normal leading-5 text-[#667182]">{mode === 'OPEN' ? t("All active students can enter; no major selection required.") : t("Only students from selected majors can enter.")}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            {eligibilityMode === 'LIMITED' ? (
              <fieldset className="mt-7">
                <legend className="mb-3 text-sm font-semibold text-[#292b3a]">{t("Eligible majors")}</legend>
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
              <p className="mt-5 text-sm text-[#667182]">{t("No major selection is needed for an OPEN course.")}</p>
            )}
            {error ? <p className="mt-6 border-l-4 border-[#b42318] bg-[#fff3f2] p-4 text-sm text-[#8f1d14]" role="alert">{t(error)}</p> : null}
            <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-[#e2e4eb] pt-6">
              <button className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded bg-[#073d78] hover:bg-[#052e5b] px-7 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:bg-[#aebdce] shadow-sm" type="submit" disabled={saving}>
                {saving ? t("Creating…") : t("Create Draft & Continue")}
              </button>
              <span className="text-sm text-[#687486]">{t("You will add the cover, curriculum and assessments on the next page.")}</span>
            </div>
          </section>
        </div>
      </form>
    </main>
  );
}
