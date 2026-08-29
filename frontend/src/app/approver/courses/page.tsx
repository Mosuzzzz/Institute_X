"use client";

import { useState } from "react";
import {
  backendApi,
  type ApproverCourseDto,
} from "../../../lib/backend-api";
import { useAppLanguage } from "../../../lib/language";
import { translateCategory } from "../../../lib/reference-translations";
import { courseLanguageLabel } from "../../../lib/course-language";
import { useBackendQuery } from "../../../lib/use-backend-query";
import ApiState from "../../api-state";
import CourseCoverImage from "../../course-cover-image";
import { staffUi } from "../../ui-styles";

export default function ApproverCoursesPage() {
  const [language] = useAppLanguage();
  const { data, error, loading, refresh } =
    useBackendQuery<ApproverCourseDto[]>("courses/approver/catalog");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function deleteCourse(course: ApproverCourseDto) {
    if (!window.confirm(`Delete “${course.title}”? It will disappear from every active catalog.`)) {
      return;
    }
    setDeletingId(course.courseId);
    setActionError(null);
    try {
      await backendApi(`courses/${course.courseId}`, { method: "DELETE" });
      await refresh();
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete this Course.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (!data) {
    return (
      <main className={staffUi.page}>
        <ApiState loading={loading} error={error} />
      </main>
    );
  }

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
            Browse every published Course across all Majors. Approvers may archive a Course when it must be removed from the active catalog.
          </p>
        </div>
        <div className="border-l-4 border-[#8ccbd0] pl-4">
          <strong className="block text-3xl text-[#073d78]">{data.length}</strong>
          <span className="text-xs tracking-[0.1em] text-[#747d8c] uppercase">Published courses</span>
        </div>
      </header>

      {actionError ? (
        <p className="mt-6 border-l-4 border-[#b42318] bg-[#fff3f2] p-4 text-sm text-[#8f1d14]">
          {actionError}
        </p>
      ) : null}

      {data.length ? (
        <section className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" aria-label="All published courses">
          {data.map((course) => (
            <article className="group grid content-start" key={course.courseId}>
              <div className="relative aspect-video overflow-hidden bg-[#27303b]">
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
              <div className="pt-4">
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
                <h2 className="mt-3 text-xl leading-tight font-semibold text-[#202a38]">{course.title}</h2>
                <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-[#687486]">
                  {course.description || "No Course description."}
                </p>
                <div className="mt-4 border-t border-[#d8dde5] pt-4 text-xs text-[#687486]">
                  <strong className="block text-sm text-[#202a38]">{course.teacher.fullName}</strong>
                  <span>{course.enrollments} learner(s)</span>
                </div>
                <button
                  className="mt-5 inline-flex min-h-10 w-full cursor-pointer items-center justify-center border border-[#b42318] bg-white px-4 py-2 text-sm font-semibold text-[#b42318] transition hover:bg-[#fff3f2] disabled:cursor-not-allowed disabled:border-[#d5a5a1] disabled:text-[#a8736f]"
                  disabled={deletingId !== null}
                  onClick={() => void deleteCourse(course)}
                  type="button"
                >
                  {deletingId === course.courseId ? "Deleting…" : "Delete Course"}
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <p className="mt-10 text-sm text-[#687486]">No published courses are available.</p>
      )}
    </main>
  );
}
