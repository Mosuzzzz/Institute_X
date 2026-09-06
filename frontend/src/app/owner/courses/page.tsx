'use client';

import Link from 'next/link';
import { useState } from 'react';
import { backendApi, type ApproverCourseDto } from '../../../lib/backend-api';
import { useBackendQuery } from '../../../lib/use-backend-query';
import { useAppLanguage } from '../../../lib/language';
import { translateCategory } from '../../../lib/reference-translations';
import { courseLanguageLabel } from '../../../lib/course-language';
import ApiState from '../../api-state';
import CourseCoverImage from '../../course-cover-image';
import { ownerUi, staffUi } from '../../ui-styles';

export default function OwnerCoursesPage() {
  const [language] = useAppLanguage();
  const { data, error, loading, refresh } =
    useBackendQuery<ApproverCourseDto[]>('courses/owner/catalog');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!data) {
    return (
      <main className={staffUi.page}>
        <ApiState loading={loading} error={error} />
      </main>
    );
  }

  const allCategories = Array.from(
    new Map(
      data.flatMap((c) => c.categories.map((cat) => [cat.id, cat]))
    ).values()
  );

  const filtered = data.filter((course) => {
    const matchesSearch =
      search.trim() === '' ||
      course.title.toLowerCase().includes(search.toLowerCase()) ||
      course.teacher.fullName.toLowerCase().includes(search.toLowerCase()) ||
      course.courseId.toLowerCase().includes(search.toLowerCase());
    const matchesCat =
      selectedCategory === 'ALL' ||
      course.categories.some((c) => c.id === selectedCategory);
    return matchesSearch && matchesCat;
  });

  async function moderate(course: ApproverCourseDto, action: 'unpublish' | 'archive') {
    const verb = action === 'archive' ? 'Archive' : 'Unpublish';
    const warning =
      action === 'archive'
        ? `Permanently archive “${course.title}”? It will be permanently removed from all student and staff catalogs.`
        : `Unpublish “${course.title}”? Students will no longer find or enter this Course until republishing.`;

    if (!window.confirm(warning)) {
      return;
    }

    setWorkingId(course.courseId);
    setActionError(null);
    setActionNotice(null);
    try {
      await backendApi(
        action === 'archive'
          ? `courses/${course.courseId}`
          : `course-versions/${course.versionId}/unpublish`,
        { method: action === 'archive' ? 'DELETE' : 'POST' },
      );
      setActionNotice(
        `Course “${course.title}” was successfully ${action === 'archive' ? 'archived' : 'unpublished'}.`
      );
      await refresh();
    } catch (requestError) {
      setActionError(
        requestError instanceof Error ? requestError.message : `Unable to ${action} this Course.`
      );
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <main className={staffUi.page}>
      <header className={staffUi.heading}>
        <div>
          <p className={staffUi.eyebrow}>Portfolio oversight</p>
          <h1>Course moderation</h1>
          <p>Unpublish or archive a published Course when institutional policy requires it.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link className="border border-[#073d78] bg-white px-4 py-2 text-sm font-semibold text-[#073d78] no-underline" href="/owner/categories">Manage categories</Link>
          <span className={ownerUi.liveLabel}>{data.length} published courses</span>
        </div>
      </header>

      {actionNotice && (
        <div className="mt-6 border-l-4 border-[#07545b] bg-[#effafa] p-4 text-sm text-[#07545b]">
          {actionNotice}
        </div>
      )}

      {actionError && (
        <div className="mt-6 border-l-4 border-[#b42318] bg-[#fff3f2] p-4 text-sm text-[#8f1d14]">
          {actionError}
        </div>
      )}

      {/* Filter and search bar */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-1 min-w-[280px] max-w-md items-center rounded border border-[#d8dde5] bg-white px-3 py-2">
          <input
            type="text"
            placeholder="Search by title, instructor, or course ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-[#202a38] outline-none placeholder:text-[#94a3b8]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-xs font-semibold text-[#687486] hover:text-[#202a38]"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="owner-cat-filter" className="text-xs font-semibold text-[#687486]">
            Category:
          </label>
          <select
            id="owner-cat-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded border border-[#d8dde5] bg-white px-3 py-2 text-xs font-medium text-[#202a38] outline-none"
          >
            <option value="ALL">All Categories</option>
            {allCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {translateCategory(cat, language)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className={`${ownerUi.listSection} mt-8`}>
        <div className={staffUi.sectionHeading}>
          <div>
            <p className={staffUi.eyebrow}>Published catalog</p>
            <h2>Active courses ({filtered.length})</h2>
          </div>
          <span>Owner moderation</span>
        </div>

        {filtered.length ? (
          <div className="grid gap-4">
            {filtered.map((course) => (
              <article
                className="grid grid-cols-[180px_minmax(0,1fr)_auto] items-center gap-5 rounded border border-[#d8dde5] bg-white p-5 max-[760px]:grid-cols-1"
                key={course.courseId}
              >
                <div className="relative aspect-video overflow-hidden rounded bg-[#27303b]">
                  <CourseCoverImage
                    assetId={course.coverAssetId}
                    alt={`${course.title} cover`}
                    className="h-full w-full object-cover"
                    fallback={
                      <div className="grid aspect-video place-items-center font-bold text-white">
                        IX
                      </div>
                    }
                  />
                  <span className="absolute top-2 left-2 rounded bg-[#073d78] px-2 py-0.5 text-[0.65rem] font-bold text-white">
                    {course.eligibilityMode}
                  </span>
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-[#eef1f5] px-2 py-0.5 text-xs font-medium text-[#435166]">
                      {courseLanguageLabel(course.languageCode, language)}
                    </span>
                    {course.categories.map((cat) => (
                      <span
                        key={cat.id}
                        className="rounded bg-[#d9f2f2] px-2 py-0.5 text-xs font-medium text-[#07545b]"
                      >
                        {translateCategory(cat, language)}
                      </span>
                    ))}
                  </div>

                  <h3 className="mt-2 text-lg font-semibold text-[#202a38]">{course.title}</h3>
                  <p className="mt-1 text-sm text-[#687486]">
                    Instructor: <strong>{course.teacher.fullName}</strong> ({course.teacher.universityEmail}) ·{' '}
                    <strong>{course.enrollments}</strong> learner(s)
                  </p>
                  {course.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-[#687486]">{course.description}</p>
                  )}
                  <small className="mt-2 block font-mono text-[0.7rem] text-[#788496]">
                    ID: {course.courseId}
                  </small>
                </div>

                <div className="flex gap-2 max-[760px]:w-full">
                  <button
                    className="min-h-10 cursor-pointer rounded border border-[#946200] px-4 text-sm font-semibold text-[#805500] hover:bg-[#fff7e6] disabled:opacity-50"
                    disabled={workingId !== null}
                    onClick={() => void moderate(course, 'unpublish')}
                    type="button"
                  >
                    Unpublish
                  </button>
                  <button
                    className="min-h-10 cursor-pointer rounded border border-[#b42318] px-4 text-sm font-semibold text-[#b42318] hover:bg-[#fff3f2] disabled:opacity-50"
                    disabled={workingId !== null}
                    onClick={() => void moderate(course, 'archive')}
                    type="button"
                  >
                    {workingId === course.courseId ? 'Working…' : 'Archive'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className={staffUi.empty}>
            {data.length
              ? 'No courses matched your search/filter criteria.'
              : 'No published courses are available.'}
          </p>
        )}
      </section>
    </main>
  );
}
