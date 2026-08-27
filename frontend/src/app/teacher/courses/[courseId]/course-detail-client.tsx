"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import {
  backendApi,
  type InitializedUploadDto,
  type TeacherCourseDetailDto,
} from "../../../../lib/backend-api";
import { useBackendQuery } from "../../../../lib/use-backend-query";
import ApiState from "../../../api-state";
import CourseCoverImage from "../../../course-cover-image";
import StatusBadge from "../../status-badge";
import { useAppLanguage } from "../../../../lib/language";
import {
  translateCategory,
  translateMajor,
} from "../../../../lib/reference-translations";

const fieldClass =
  "min-h-11 w-full border border-[#cfd5df] bg-white px-3 py-2.5 text-sm text-[#202a38] outline-none transition focus:border-[#073d78] focus:ring-2 focus:ring-[#073d78]/15";
const primaryButton =
  "inline-flex min-h-11 cursor-pointer items-center justify-center bg-[#073d78] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#052e5b] disabled:cursor-not-allowed disabled:bg-[#aeb5c0]";
const secondaryButton =
  "inline-flex min-h-11 cursor-pointer items-center justify-center border border-[#073d78] bg-white px-5 py-2.5 text-sm font-semibold text-[#073d78] transition hover:bg-[#edf3f8] disabled:cursor-not-allowed disabled:border-[#c8ccd3] disabled:text-[#949aa4]";
const panelClass = "scroll-mt-28 border border-[#d8dde5] bg-white p-6 sm:p-8";

async function putSignedFile(uploadUrl: string, file: File): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "content-type": file.type },
    body: file,
  });
  if (!response.ok) throw new Error(`File upload failed (${response.status}).`);
}

type VersionDto = TeacherCourseDetailDto["versions"][number];
type QuizDto = VersionDto["quizzes"][number];

function QuizEditor({
  quiz,
  disabled,
  onChanged,
  run,
}: {
  quiz: QuizDto;
  disabled: boolean;
  onChanged: () => Promise<void>;
  run: (task: () => Promise<void>, message: string) => Promise<void>;
}) {
  const [correctOption, setCorrectOption] = useState("0");

  async function addQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const options = ["option0", "option1", "option2", "option3"]
      .map((name, index) => ({
        text: String(values.get(name) ?? "").trim(),
        index,
      }))
      .filter((option) => option.text);
    const correct = Number(correctOption);
    await run(
      async () => {
        if (options.length < 2)
          throw new Error("Add at least two answer choices.");
        if (!options.some((option) => option.index === correct))
          throw new Error("The correct answer cannot be empty.");
        await backendApi(`quizzes/${quiz.id}/questions`, {
          method: "POST",
          body: JSON.stringify({
            questionText: String(values.get("questionText") ?? ""),
            points: Number(values.get("points") ?? 1),
            position: quiz.questions.length + 1,
            options: options.map((option, index) => ({
              optionText: option.text,
              isCorrect: option.index === correct,
              position: index + 1,
            })),
          }),
        });
        form.reset();
        setCorrectOption("0");
        await onChanged();
      },
      `Question added to ${quiz.quizType === "PRE_TEST" ? "Pre-test" : "Post-test"}.`,
    );
  }

  return (
    <article className="border-t border-[#d8dde5] pt-6 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.12em] text-[#0b6a73] uppercase">
            {quiz.quizType === "PRE_TEST" ? "Pre-test" : "Post-test"}
          </p>
          <h4 className="mt-1 text-lg font-semibold text-[#202a38]">
            {quiz.title}
          </h4>
        </div>
        <span className="bg-[#edf3f8] px-3 py-1.5 text-xs text-[#435166]">
          {quiz.questions.length} questions ·{" "}
          {quiz.durationSeconds
            ? `${Math.ceil(quiz.durationSeconds / 60)} min`
            : "Untimed"}
        </span>
      </div>
      {quiz.questions.length ? (
        <ol className="mt-5 grid gap-3">
          {quiz.questions.map((question, index) => (
            <li
              className="grid grid-cols-[34px_minmax(0,1fr)] gap-3 bg-[#f6f8fa] p-4"
              key={question.id}
            >
              <span className="text-xs font-bold text-[#073d78]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="text-sm font-medium text-[#202a38]">
                  {question.questionText}
                </p>
                <p className="mt-1 text-xs text-[#747d8c]">
                  {question.options.length} choices · {Number(question.points)}{" "}
                  point(s)
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
      {!disabled ? (
        <form
          className="mt-6 grid gap-4 border-l-4 border-[#8ccbd0] bg-[#f8fbfc] p-5"
          onSubmit={(event) => void addQuestion(event)}
        >
          <label className="grid gap-1.5 text-xs font-semibold text-[#435166]">
            Question
            <input
              className={fieldClass}
              name="questionText"
              placeholder="What should the learner understand?"
              required
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((index) => (
              <label
                className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2"
                key={index}
              >
                <input
                  checked={correctOption === String(index)}
                  name={`correct-${quiz.id}`}
                  onChange={() => setCorrectOption(String(index))}
                  type="radio"
                />
                <input
                  className={fieldClass}
                  name={`option${index}`}
                  placeholder={`Choice ${index + 1}${index > 1 ? " (optional)" : ""}`}
                  required={index < 2}
                />
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <label className="grid w-28 gap-1.5 text-xs font-semibold text-[#435166]">
              Points
              <input
                className={fieldClass}
                defaultValue="1"
                min="0.01"
                name="points"
                step="0.01"
                type="number"
              />
            </label>
            <button className={secondaryButton} type="submit">
              Add question
            </button>
          </div>
          <p className="text-xs text-[#747d8c]">
            Select the radio button beside the correct answer.
          </p>
        </form>
      ) : null}
    </article>
  );
}

export default function CourseDetailClient({ courseId }: { courseId: string }) {
  const [language] = useAppLanguage();
  const { data, error, loading, refresh } =
    useBackendQuery<TeacherCourseDetailDto>(`courses/${courseId}`);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(task: () => Promise<void>, message: string) {
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      await task();
      setNotice(message);
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save this change.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!data)
    return (
      <main className="teacher-main course-authoring-page">
        <ApiState loading={loading} error={error} />
      </main>
    );
  const version = data.versions[0];
  if (!version)
    return (
      <main className="teacher-main">
        <ApiState loading={false} error="Course Version was not found." />
      </main>
    );
  const isDraft = version.status === "DRAFT";
  const status = version.status === "SUPERSEDED" ? "PUBLISHED" : version.status;
  const checks = Object.entries(data.checks);
  const nextContentPosition =
    Math.max(0, ...version.contentItems.map((item) => item.position)) + 1;

  async function uploadCover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = (form.elements.namedItem("cover") as HTMLInputElement)
      .files?.[0];
    if (!file) return;
    await run(async () => {
      const upload = await backendApi<InitializedUploadDto>(
        `course-versions/${version.id}/cover/uploads`,
        {
          method: "POST",
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
          }),
        },
      );
      await putSignedFile(upload.uploadUrl, file);
      await backendApi(`course-covers/${upload.assetId}/complete`, {
        method: "POST",
      });
      form.reset();
      await refresh();
    }, "Course cover uploaded.");
  }

  async function addText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    await run(async () => {
      await backendApi(`course-versions/${version.id}/content/text`, {
        method: "POST",
        body: JSON.stringify({
          title: String(values.get("title") ?? ""),
          textBody: String(values.get("textBody") ?? ""),
          position: nextContentPosition,
        }),
      });
      form.reset();
      await refresh();
    }, "Text lesson added.");
  }

  async function addMedia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const file = (form.elements.namedItem("media") as HTMLInputElement)
      .files?.[0];
    if (!file) return;
    await run(async () => {
      const upload = await backendApi<InitializedUploadDto>(
        `course-versions/${version.id}/media/uploads`,
        {
          method: "POST",
          body: JSON.stringify({
            contentType: String(values.get("contentType")),
            title: String(values.get("title") ?? ""),
            fileName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            position: nextContentPosition,
          }),
        },
      );
      await putSignedFile(upload.uploadUrl, file);
      await backendApi(`media/${upload.assetId}/complete`, { method: "POST" });
      form.reset();
      await refresh();
    }, "Media lesson uploaded.");
  }

  async function createQuiz(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const minutes = Number(values.get("minutes") ?? 0);
    await run(async () => {
      await backendApi(`course-versions/${version.id}/quizzes`, {
        method: "POST",
        body: JSON.stringify({
          quizType: String(values.get("quizType")),
          title: String(values.get("title") ?? ""),
          ...(minutes > 0 ? { durationSeconds: minutes * 60 } : {}),
        }),
      });
      form.reset();
      await refresh();
    }, "Assessment created. Add its first question below.");
  }

  async function submitDraft() {
    await run(async () => {
      await backendApi(`course-versions/${version.id}/submit`, {
        method: "POST",
      });
      await refresh();
    }, "Draft submitted for approval.");
  }

  async function reopenRejectedDraft() {
    await run(async () => {
      await backendApi(`course-versions/${version.id}/reopen`, {
        method: "POST",
      });
      await refresh();
    }, "Rejected Version reopened as a Draft.");
  }

  return (
    <main className="mx-auto w-[min(calc(100%-48px),1500px)] py-[clamp(48px,6vw,84px)] max-[640px]:w-[min(calc(100%-28px),760px)]">
      <header className="flex items-end justify-between gap-8 border-b border-[#d8dde5] pb-8 max-[760px]:items-start max-[760px]:flex-col">
        <div>
          <Link
            className="text-sm font-semibold text-[#073d78] no-underline hover:underline"
            href="/teacher/courses"
          >
            ← My courses
          </Link>
          <p className="mt-6 text-xs tracking-[0.12em] text-[#747d8c] uppercase">
            Version {version.versionNumber} · Course workspace
          </p>
          <h1 className="mt-2 max-w-4xl text-[clamp(2.1rem,4vw,4rem)] leading-[1.02] tracking-[-0.05em] text-[#202a38]">
            {version.title || "Untitled Course"}
          </h1>
          <div className="mt-5 flex items-center gap-4">
            <StatusBadge status={status} />
            <span className="text-sm text-[#747d8c]">
              {data.readiness}% ready
            </span>
          </div>
        </div>
        <div className="grid max-w-sm gap-4 border-l-4 border-[#8ccbd0] pl-5">
          <p className="text-xs font-bold tracking-[0.12em] text-[#0b6a73] uppercase">
            Build order
          </p>
          <p className="text-sm leading-6 text-[#566274]">
            Cover → learning content → Pre-test → Post-test. Drafts remain
            private until approval.
          </p>
          {isDraft ? (
            <div>
              <button
                className={primaryButton}
                disabled={busy}
                onClick={() => void submitDraft()}
                type="button"
              >
                {busy ? "Submitting…" : "Submit Draft for approval"}
              </button>
              {data.readiness < 100 ? (
                <p className="mt-2 text-xs leading-5 text-[#747d8c]">
                  Complete the sections marked “Needs work”. If something is
                  required, the submission message will identify it.
                </p>
              ) : null}
            </div>
          ) : version.status === "REJECTED" ? (
            <button
              className={secondaryButton}
              disabled={busy}
              onClick={() => void reopenRejectedDraft()}
              type="button"
            >
              {busy ? "Reopening…" : "Reopen Draft to edit"}
            </button>
          ) : (
            <p className="text-sm font-semibold text-[#073d78]">
              {version.status === "SUBMITTED"
                ? "Waiting for Approver review"
                : "This Version has been published"}
            </p>
          )}
        </div>
      </header>
      {actionError || notice ? (
        <div
          className={`mt-6 border-l-4 p-4 text-sm ${actionError ? "border-[#b42318] bg-[#fff3f2] text-[#8f1d14]" : "border-[#0b6a73] bg-[#effafa] text-[#07545b]"}`}
        >
          {actionError ?? notice}
        </div>
      ) : null}
      <div className="mt-10 grid grid-cols-[260px_minmax(0,1fr)] gap-[clamp(28px,4vw,64px)] max-[900px]:grid-cols-1">
        <nav
          className="grid content-start max-[900px]:grid-cols-4 max-[900px]:overflow-x-auto"
          aria-label="Course authoring sections"
        >
          {checks.map(([key, ready], index) => (
            <a
              className={`grid min-w-40 grid-cols-[32px_1fr] gap-2 border-l-2 px-3 py-4 text-sm no-underline max-[900px]:border-t-2 max-[900px]:border-l-0 ${ready ? "border-[#073d78] bg-white text-[#073d78]" : "border-[#d8dde5] text-[#747d8c]"}`}
              href={`#${key}`}
              key={key}
            >
              <span className="text-xs font-bold">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>
                <strong className="block text-[#202a38]">
                  {key.replace(/([A-Z])/g, " $1")}
                </strong>
                <small>{ready ? "Ready" : "Needs work"}</small>
              </span>
            </a>
          ))}
        </nav>
        <div className="min-w-0 space-y-7">
          <section className={panelClass} id="details">
            <p className="text-xs font-bold tracking-[0.12em] text-[#0b6a73] uppercase">
              Course readiness
            </p>
            <h2 className="mt-2 text-3xl tracking-[-0.04em] text-[#202a38]">
              Structure overview
            </h2>
            <p className="mt-3 max-w-2xl leading-7 text-[#687486]">
              {version.description ??
                "Add a description to complete Course details."}
            </p>
            <dl className="mt-7 grid grid-cols-2 border-t border-l border-[#d8dde5] max-[640px]:grid-cols-1">
              <div className="border-r border-b border-[#d8dde5] p-5">
                <dt className="text-xs tracking-[0.1em] text-[#747d8c] uppercase">
                  Eligible majors
                </dt>
                <dd className="mt-2 text-sm font-semibold text-[#202a38]">
                  {data.allowedMajors
                    .map(({ major }) => translateMajor(major, language))
                    .join(", ") || "Open to all majors"}
                </dd>
              </div>
              <div className="border-r border-b border-[#d8dde5] p-5">
                <dt className="text-xs tracking-[0.1em] text-[#747d8c] uppercase">
                  Categories
                </dt>
                <dd className="mt-2 text-sm font-semibold text-[#202a38]">
                  {data.categories
                    .map(({ category }) =>
                      translateCategory(category, language),
                    )
                    .join(", ") || "None"}
                </dd>
              </div>
            </dl>
          </section>
          <section className={panelClass} id="cover">
            <div className="flex items-start justify-between gap-5 max-[640px]:flex-col">
              <div>
                <p className="text-xs font-bold tracking-[0.12em] text-[#0b6a73] uppercase">
                  Visual identity
                </p>
                <h2 className="mt-2 text-2xl text-[#202a38]">Course cover</h2>
                <p className="mt-2 text-sm text-[#687486]">
                  JPEG, PNG, or WebP · maximum 10 MB · landscape works best.
                </p>
              </div>
              {version.coverAsset && isDraft ? (
                <button
                  className={secondaryButton}
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await backendApi(
                        `course-covers/${version.coverAsset!.id}`,
                        { method: "DELETE" },
                      );
                      await refresh();
                    }, "Course cover removed.")
                  }
                  type="button"
                >
                  Remove cover
                </button>
              ) : null}
            </div>
            <div className="mt-6 grid grid-cols-[minmax(240px,420px)_minmax(0,1fr)] gap-6 max-[700px]:grid-cols-1">
              <div className="relative aspect-video overflow-hidden bg-[#27303b]">
                <CourseCoverImage
                  assetId={
                    version.coverAsset?.status === "READY"
                      ? version.coverAsset.id
                      : null
                  }
                  alt={`${version.title} cover`}
                  className="h-full w-full object-cover"
                  fallback={
                    <div className="grid h-full place-content-center text-center text-white">
                      <span className="text-4xl font-bold">IX</span>
                      <small className="mt-2 text-[#cbd3dc]">
                        No cover yet
                      </small>
                    </div>
                  }
                />
              </div>
              {isDraft && !version.coverAsset ? (
                <form
                  className="grid content-start gap-4"
                  onSubmit={(event) => void uploadCover(event)}
                >
                  <label className="grid gap-2 text-sm font-semibold text-[#435166]">
                    Choose cover image
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      className={fieldClass}
                      name="cover"
                      required
                      type="file"
                    />
                  </label>
                  <button
                    className={primaryButton}
                    disabled={busy}
                    type="submit"
                  >
                    {busy ? "Uploading…" : "Upload cover"}
                  </button>
                </form>
              ) : (
                <div className="grid content-center">
                  <p className="text-sm font-semibold text-[#202a38]">
                    {version.coverAsset?.fileName ??
                      "Cover can only be changed while this Version is a Draft."}
                  </p>
                  <p className="mt-1 text-xs text-[#747d8c]">
                    {version.coverAsset?.status ?? version.status}
                  </p>
                </div>
              )}
            </div>
          </section>
          <section className={panelClass} id="content">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-[0.12em] text-[#0b6a73] uppercase">
                  Learning sequence
                </p>
                <h2 className="mt-2 text-2xl text-[#202a38]">Course content</h2>
              </div>
              <span className="text-sm text-[#747d8c]">
                {version.contentItems.length} item(s)
              </span>
            </div>
            {version.contentItems.length ? (
              <ol className="mt-6 grid gap-3">
                {version.contentItems.map((item, index) => (
                  <li
                    className="grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 bg-[#f6f8fa] p-4"
                    key={item.id}
                  >
                    <span className="text-xs font-bold text-[#073d78]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <strong className="block text-sm text-[#202a38]">
                        {item.title ?? item.contentType}
                      </strong>
                      <small className="text-[#747d8c]">
                        {item.contentType}
                        {item.mediaAsset
                          ? ` · ${item.mediaAsset.fileName}`
                          : ""}
                      </small>
                    </span>
                    <div className="grid justify-items-end gap-2">
                      <small
                        className={
                          item.mediaAsset?.status === "READY"
                            ? "font-semibold text-[#0b6a73]"
                            : "font-semibold text-[#b54708]"
                        }
                      >
                        {item.mediaAsset?.status ?? `#${item.position}`}
                      </small>
                      {isDraft && item.mediaAsset ? (
                        <button
                          className="cursor-pointer text-xs font-semibold text-[#8f1d14] underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-[#949aa4]"
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              await backendApi(`media/${item.mediaAsset!.id}`, {
                                method: "DELETE",
                              });
                              await refresh();
                            }, "Media lesson removed.")
                          }
                          type="button"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-6 bg-[#f6f8fa] p-6 text-sm text-[#687486]">
                No learning content yet. Add a text lesson or upload media
                below.
              </p>
            )}
            {isDraft ? (
              <div className="mt-7 grid gap-5 xl:grid-cols-2">
                <form
                  className="grid content-start gap-4 border-t-4 border-[#073d78] bg-[#f8fafc] p-5"
                  onSubmit={(event) => void addText(event)}
                >
                  <h3 className="text-lg text-[#202a38]">Add text lesson</h3>
                  <input
                    className={fieldClass}
                    name="title"
                    placeholder="Lesson title"
                    required
                  />
                  <textarea
                    className={`${fieldClass} min-h-32 resize-y`}
                    name="textBody"
                    placeholder="Lesson content"
                    required
                  />
                  <button
                    className={primaryButton}
                    disabled={busy}
                    type="submit"
                  >
                    Add text lesson
                  </button>
                </form>
                <form
                  className="grid content-start gap-4 border-t-4 border-[#8ccbd0] bg-[#f8fafc] p-5"
                  onSubmit={(event) => void addMedia(event)}
                >
                  <h3 className="text-lg text-[#202a38]">
                    Upload media lesson
                  </h3>
                  <select
                    className={fieldClass}
                    defaultValue="VIDEO"
                    name="contentType"
                  >
                    <option value="VIDEO">Video</option>
                    <option value="AUDIO">Audio</option>
                    <option value="IMAGE">Image</option>
                    <option value="DOCUMENT">Document</option>
                  </select>
                  <input
                    className={fieldClass}
                    name="title"
                    placeholder="Lesson title"
                    required
                  />
                  <input
                    className={fieldClass}
                    name="media"
                    required
                    type="file"
                  />
                  <button
                    className={primaryButton}
                    disabled={busy}
                    type="submit"
                  >
                    Upload media
                  </button>
                </form>
              </div>
            ) : null}
          </section>
          <section className={panelClass} id="preTest">
            <div>
              <p className="text-xs font-bold tracking-[0.12em] text-[#0b6a73] uppercase">
                Assessment design
              </p>
              <h2 className="mt-2 text-2xl text-[#202a38]">
                Pre-test & Post-test
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#687486]">
                Create one of each assessment, then add multiple-choice
                questions and mark the correct answer.
              </p>
            </div>
            {isDraft && version.quizzes.length < 2 ? (
              <form
                className="mt-6 grid grid-cols-[160px_minmax(0,1fr)_120px_auto] items-end gap-3 bg-[#f6f8fa] p-5 max-[760px]:grid-cols-1"
                onSubmit={(event) => void createQuiz(event)}
              >
                <label className="grid gap-1.5 text-xs font-semibold text-[#435166]">
                  Type
                  <select className={fieldClass} name="quizType">
                    {!version.quizzes.some(
                      (quiz) => quiz.quizType === "PRE_TEST",
                    ) ? (
                      <option value="PRE_TEST">Pre-test</option>
                    ) : null}
                    {!version.quizzes.some(
                      (quiz) => quiz.quizType === "POST_TEST",
                    ) ? (
                      <option value="POST_TEST">Post-test</option>
                    ) : null}
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-[#435166]">
                  Title
                  <input
                    className={fieldClass}
                    name="title"
                    placeholder="Assessment title"
                    required
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-[#435166]">
                  Minutes
                  <input
                    className={fieldClass}
                    min="1"
                    name="minutes"
                    placeholder="Untimed"
                    type="number"
                  />
                </label>
                <button className={primaryButton} disabled={busy} type="submit">
                  Create
                </button>
              </form>
            ) : null}
            <div className="mt-7 grid gap-8">
              {version.quizzes.length ? (
                version.quizzes.map((quiz) => (
                  <QuizEditor
                    disabled={!isDraft || busy}
                    key={quiz.id}
                    onChanged={refresh}
                    quiz={quiz}
                    run={run}
                  />
                ))
              ) : (
                <p className="bg-[#f6f8fa] p-6 text-sm text-[#687486]">
                  No assessments yet. Start with the Pre-test.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
