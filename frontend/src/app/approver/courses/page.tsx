"use client";

import { useState } from "react";
import type { ApproverCourseDto } from "../../../lib/backend-api";
import { useAppLanguage } from "../../../lib/language";
import { translateCategory } from "../../../lib/reference-translations";
import { courseLanguageLabel } from "../../../lib/course-language";
import { useBackendQuery } from "../../../lib/use-backend-query";
import ApiState from "../../api-state";
import CourseCoverImage from "../../course-cover-image";
import { staffUi } from "../../ui-styles";

export default function ApproverCoursesPage() {
  const [language] = useAppLanguage();
  const { data, error, loading } =
    useBackendQuery<ApproverCourseDto[]>("courses/approver/catalog");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [activeCourse, setActiveCourse] = useState<ApproverCourseDto | null>(null);

  if (!data) {
    return (
      <main className={staffUi.page}>
        <ApiState loading={loading} error={error} />
      </main>
    );
  }

  // Extract unique categories for filter
  const allCategories = Array.from(
    new Map(
      data.flatMap((c) => c.categories.map((cat) => [cat.id, cat]))
    ).values()
  );

  const filtered = data.filter((course) => {
    const matchesSearch =
      search.trim() === "" ||
      course.title.toLowerCase().includes(search.toLowerCase()) ||
      course.teacher.fullName.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === "ALL" ||
      course.categories.some((cat) => cat.id === selectedCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <main className="mx-auto w-[min(calc(100%-48px),1500px)] py-[clamp(48px,6vw,84px)] max-[640px]:w-[min(calc(100%-28px),760px)]">
      <header className="flex items-end justify-between gap-8 border-b border-[#d8dde5] pb-8 max-[700px]:items-start max-[700px]:flex-col">
        <div>
          <p className="text-xs font-bold tracking-[0.12em] text-[#0b6a73] uppercase">
            Published catalog
          </p>
          <h1 className="mt-2 text-[clamp(2.2rem,4vw,4rem)] leading-none tracking-[-0.05em] text-[#202a38]">
            All courses
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#687486]">
            Browse every published Course across all Majors in read-only mode. Course moderation belongs to the Executive workspace.
          </p>
        </div>
        <div className="border-l-4 border-[#8ccbd0] pl-4">
          <strong className="block text-3xl text-[#073d78]">{data.length}</strong>
          <span className="text-xs tracking-[0.1em] text-[#747d8c] uppercase">Published courses</span>
        </div>
      </header>

      {/* Filter and search bar */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-1 min-w-[280px] max-w-md items-center rounded border border-[#d8dde5] bg-white px-3 py-2">
          <input
            type="text"
            placeholder="Search by course title or instructor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-[#202a38] outline-none placeholder:text-[#94a3b8]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-xs font-semibold text-[#687486] hover:text-[#202a38]"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="approver-cat-filter" className="text-xs font-semibold text-[#687486]">
            Category:
          </label>
          <select
            id="approver-cat-filter"
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

      {filtered.length ? (
        <section className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" aria-label="All published courses">
          {filtered.map((course) => (
            <article
              className="group grid content-start cursor-pointer rounded transition hover:shadow-md"
              key={course.courseId}
              onClick={() => setActiveCourse(course)}
            >
              <div className="relative aspect-video overflow-hidden rounded-t bg-[#27303b]">
                <CourseCoverImage
                  assetId={course.coverAssetId}
                  alt={`${course.title} cover`}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  fallback={
                    <div className="grid h-full place-content-center text-center text-white">
                      <span className="text-4xl font-bold">IX</span>
                      <small className="mt-2 text-[#cbd3dc]">Course</small>
                    </div>
                  }
                />
                <span className="absolute top-3 left-3 bg-[#073d78] px-3 py-1 text-[0.68rem] font-bold tracking-[0.08em] text-white uppercase">
                  {course.eligibilityMode}
                </span>
              </div>
              <div className="rounded-b border border-t-0 border-[#d8dde5] bg-white p-4">
                <div className="flex min-h-6 flex-wrap gap-2">
                  <span className="bg-[#eef1f5] px-2.5 py-1 text-[0.68rem] font-semibold text-[#435166]">
                    {courseLanguageLabel(course.languageCode, language)}
                  </span>
                  {course.categories.map((category) => (
                    <span className="bg-[#d9f2f2] px-2.5 py-1 text-[0.68rem] font-semibold text-[#07545b]" key={category.id}>
                      {translateCategory(category, language)}
                    </span>
                  ))}
                </div>
                <h2 className="mt-3 text-lg leading-tight font-semibold text-[#202a38] group-hover:text-[#073d78]">{course.title}</h2>
                <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-[#687486]">
                  {course.description || "No Course description."}
                </p>
                <div className="mt-4 border-t border-[#d8dde5] pt-3 text-xs text-[#687486] flex items-center justify-between">
                  <strong className="text-sm text-[#202a38]">{course.teacher.fullName}</strong>
                  <span>{course.enrollments} learner(s)</span>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <p className="mt-10 text-sm text-[#687486]">
          {data.length ? "No courses matched your search/filter criteria." : "No published courses are available."}
        </p>
      )}

      {/* Course Detail Modal */}
      {activeCourse && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setActiveCourse(null)}
        >
          <div
            className="w-full max-w-xl rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#d8dde5] pb-4">
              <div>
                <span className="rounded bg-[#073d78] px-2.5 py-0.5 text-xs font-bold text-white">
                  {activeCourse.eligibilityMode}
                </span>
                <h2 className="mt-2 text-xl font-bold text-[#202a38]">{activeCourse.title}</h2>
              </div>
              <button
                type="button"
                className="text-lg font-bold text-[#687486] hover:text-[#202a38]"
                onClick={() => setActiveCourse(null)}
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-[#435166]">
              <div>
                <strong className="block text-xs font-semibold text-[#687486] uppercase">Instructor</strong>
                <p>{activeCourse.teacher.fullName} ({activeCourse.teacher.universityEmail})</p>
              </div>
              <div>
                <strong className="block text-xs font-semibold text-[#687486] uppercase">Categories</strong>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {activeCourse.categories.map((c) => (
                    <span key={c.id} className="rounded bg-[#d9f2f2] px-2 py-0.5 text-xs text-[#07545b]">
                      {translateCategory(c, language)}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <strong className="block text-xs font-semibold text-[#687486] uppercase">Language & Stats</strong>
                <p>{courseLanguageLabel(activeCourse.languageCode, language)} · {activeCourse.enrollments} Enrolled Students</p>
              </div>
              <div>
                <strong className="block text-xs font-semibold text-[#687486] uppercase">Description</strong>
                <p className="mt-1 leading-6">{activeCourse.description || "No description provided."}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-[#d8dde5] pt-4">
              <button
                type="button"
                className="rounded bg-[#073d78] px-4 py-2 text-sm font-semibold text-white hover:bg-[#052e5b]"
                onClick={() => setActiveCourse(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
