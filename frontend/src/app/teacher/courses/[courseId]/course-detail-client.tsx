"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import {
  backendApi,
  type CategoryDto,
  type CreatedQuestionDto,
  type InitializedUploadDto,
  type TeacherCourseDetailDto,
} from "../../../../lib/backend-api";
import { useBackendQuery } from "../../../../lib/use-backend-query";
import ApiState from "../../../api-state";
import CourseCoverImage from "../../../course-cover-image";
import QuestionImage from "../../../question-image";
import StatusBadge from "../../status-badge";
import { useAppLanguage } from "../../../../lib/language";
import {
  translateCategory,
  translateMajor,
} from "../../../../lib/reference-translations";
import {
  COURSE_LANGUAGES,
  courseLanguageLabel,
} from "../../../../lib/course-language";

const fieldClass =
  "min-h-11 w-full border border-[#cfd5df] bg-white px-3 py-2.5 text-sm text-[#202a38] outline-none transition focus:border-[#073d78] focus:ring-2 focus:ring-[#073d78]/15";
const primaryButton =
  "inline-flex min-h-11 cursor-pointer items-center justify-center bg-[#073d78] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#052e5b] disabled:cursor-not-allowed disabled:bg-[#aeb5c0]";
const secondaryButton =
  "inline-flex min-h-11 cursor-pointer items-center justify-center border border-[#073d78] bg-white px-5 py-2.5 text-sm font-semibold text-[#073d78] transition hover:bg-[#edf3f8] disabled:cursor-not-allowed disabled:border-[#c8ccd3] disabled:text-[#949aa4]";
const panelClass =
  "scroll-mt-28 border-b border-[#e2e4eb] bg-white p-6 last:border-b-0 sm:p-10";
const checklistLabels: Record<keyof TeacherCourseDetailDto["checks"], string> = {
  details: "Title and language",
  categories: "Category",
  eligibility: "Student eligibility",
  content: "Learning content",
  media: "Media ready",
  preTest: "Pre-Test",
  postTest: "Post-Test",
  assessments: "Valid assessment questions",
};
const checklistTargets: Record<keyof TeacherCourseDetailDto["checks"], string> = {
  details: "details",
  categories: "details",
  eligibility: "details",
  content: "content",
  media: "content",
  preTest: "preTest",
  postTest: "preTest",
  assessments: "preTest",
};

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

  async function storeQuestionImage(questionId: string, file: File) {
    try {
      const upload = await backendApi<InitializedUploadDto>(
        `questions/${questionId}/image/uploads`,
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
      await backendApi(`question-images/${upload.assetId}/complete`, {
        method: "POST",
      });
    } catch (error: unknown) {
      await onChanged();
      throw error;
    }
  }

  async function addQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const image = (form.elements.namedItem("questionImage") as HTMLInputElement)
      .files?.[0];
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
        const question = await backendApi<CreatedQuestionDto>(
          `quizzes/${quiz.id}/questions`,
          {
          method: "POST",
          body: JSON.stringify({
            questionText: String(values.get("questionText") ?? ""),
            points: Number(values.get("points") ?? 1),
            position: Math.max(0, ...quiz.questions.map((question) => question.position)) + 1,
            options: options.map((option, index) => ({
              optionText: option.text,
              isCorrect: option.index === correct,
              position: index + 1,
            })),
          }),
          },
        );
        if (image) await storeQuestionImage(question.id, image);
        form.reset();
        setCorrectOption("0");
        await onChanged();
      },
      `Question added to ${quiz.quizType === "PRE_TEST" ? "Pre-test" : "Post-test"}.`,
    );
  }

  async function updateQuizDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const minutes = Number(values.get("minutes") ?? 0);
    await run(async () => {
      await backendApi(`quizzes/${quiz.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: String(values.get("title") ?? ""),
          durationSeconds: minutes > 0 ? minutes * 60 : null,
        }),
      });
      await onChanged();
    }, `${quiz.quizType === "PRE_TEST" ? "Pre-test" : "Post-test"} updated.`);
  }

  async function updateQuestion(
    event: FormEvent<HTMLFormElement>,
    question: QuizDto["questions"][number],
  ) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const correctIndex = Number(values.get("correctOption"));
    const optionCount = Math.max(4, question.options.length);
    const options = Array.from({ length: optionCount }, (_, index) => ({
      text: String(values.get(`option${index}`) ?? "").trim(),
      index,
    })).filter((option) => option.text);
    await run(async () => {
      if (options.length < 2) throw new Error("Add at least two answer choices.");
      if (!options.some((option) => option.index === correctIndex)) {
        throw new Error("The correct answer cannot be empty.");
      }
      await backendApi(`questions/${question.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          questionText: String(values.get("questionText") ?? ""),
          points: Number(values.get("points") ?? 1),
          position: question.position,
          options: options.map((option, index) => ({
            optionText: option.text,
            isCorrect: option.index === correctIndex,
            position: index + 1,
          })),
        }),
      });
      await onChanged();
    }, "Question updated.");
  }

  async function clearAllQuestions() {
    if (!window.confirm(`Clear every question from “${quiz.title}”? This cannot be undone.`)) {
      return;
    }
    await run(async () => {
      await backendApi(`quizzes/${quiz.id}/questions`, { method: "DELETE" });
      await onChanged();
    }, `${quiz.quizType === "PRE_TEST" ? "Pre-test" : "Post-test"} questions cleared.`);
  }

  async function removeQuestion(
    question: QuizDto["questions"][number],
  ) {
    if (!window.confirm(`Remove “${question.questionText}”? This cannot be undone.`)) {
      return;
    }
    await run(async () => {
      await backendApi(`questions/${question.id}`, { method: "DELETE" });
      await onChanged();
    }, "Question removed.");
  }

  async function removeTest() {
    if (!window.confirm(`Remove “${quiz.title}” and all of its questions? This cannot be undone.`)) {
      return;
    }
    await run(async () => {
      await backendApi(`quizzes/${quiz.id}`, { method: "DELETE" });
      await onChanged();
    }, `${quiz.quizType === "PRE_TEST" ? "Pre-test" : "Post-test"} removed.`);
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
      {!disabled ? (
        <form
          className="mt-5 grid gap-3 border-l-4 border-[#073d78] bg-[#f6f8fa] p-4 sm:grid-cols-[minmax(0,1fr)_150px_auto] sm:items-end"
          onSubmit={(event) => void updateQuizDetails(event)}
        >
          <label className="grid gap-1.5 text-xs font-semibold text-[#435166]">
            Test title
            <input className={fieldClass} defaultValue={quiz.title} name="title" required />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-[#435166]">
            Duration (minutes)
            <input
              className={fieldClass}
              defaultValue={quiz.durationSeconds ? Math.ceil(quiz.durationSeconds / 60) : ""}
              min="1"
              name="minutes"
              placeholder="Untimed"
              type="number"
            />
          </label>
          <button className={secondaryButton} type="submit">
            Save test
          </button>
        </form>
      ) : null}
      {!disabled ? (
        <div className="mt-3 flex flex-wrap justify-end gap-4">
          {quiz.questions.length ? (
            <button
              className="cursor-pointer text-xs font-semibold text-[#b54708] hover:underline"
              onClick={() => void clearAllQuestions()}
              type="button"
            >
              Clear questions
            </button>
          ) : null}
          <button
            className="cursor-pointer text-xs font-semibold text-[#8f1d14] hover:underline"
            onClick={() => void removeTest()}
            type="button"
          >
            Remove test
          </button>
        </div>
      ) : null}
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
                {!disabled ? (
                  <form
                    className="grid gap-3"
                    onSubmit={(event) => void updateQuestion(event, question)}
                  >
                    <label className="grid gap-1.5 text-xs font-semibold text-[#435166]">
                      Question
                      <input
                        className={fieldClass}
                        defaultValue={question.questionText}
                        name="questionText"
                        required
                      />
                    </label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {Array.from(
                        { length: Math.max(4, question.options.length) },
                        (_, optionIndex) => {
                          const option = question.options[optionIndex];
                          return (
                            <label
                              className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2"
                              key={option?.id ?? optionIndex}
                            >
                              <input
                                defaultChecked={option?.isCorrect ?? false}
                                name="correctOption"
                                required
                                type="radio"
                                value={optionIndex}
                              />
                              <input
                                className={fieldClass}
                                defaultValue={option?.optionText ?? ""}
                                name={`option${optionIndex}`}
                                placeholder={`Choice ${optionIndex + 1}${optionIndex > 1 ? " (optional)" : ""}`}
                                required={optionIndex < 2}
                              />
                            </label>
                          );
                        },
                      )}
                    </div>
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <label className="grid w-28 gap-1.5 text-xs font-semibold text-[#435166]">
                        Points
                        <input
                          className={fieldClass}
                          defaultValue={Number(question.points)}
                          min="0.01"
                          name="points"
                          required
                          step="0.01"
                          type="number"
                        />
                      </label>
                      <div className="flex flex-wrap items-center gap-4">
                        <button
                          className="cursor-pointer text-xs font-semibold text-[#8f1d14] hover:underline"
                          onClick={() => void removeQuestion(question)}
                          type="button"
                        >
                          Remove question
                        </button>
                        <button className={secondaryButton} type="submit">
                          Save question
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <p className="text-sm font-medium text-[#202a38]">
                    {question.questionText}
                  </p>
                )}
                {question.imageAsset ? (
                  <div className="mt-3 grid max-w-md gap-2">
                    <QuestionImage
                      assetId={
                        question.imageAsset.status === "READY"
                          ? question.imageAsset.id
                          : null
                      }
                      alt={`${question.questionText} illustration`}
                      className="max-h-56 w-full border border-[#d8dde5] bg-white object-contain"
                      fallback={
                        <span className="text-xs font-semibold text-[#b54708]">
                          Image {question.imageAsset.status}
                        </span>
                      }
                    />
                    {!disabled ? (
                      <button
                        className="w-fit cursor-pointer text-xs font-semibold text-[#8f1d14] hover:underline"
                        onClick={() =>
                          void run(async () => {
                            await backendApi(
                              `question-images/${question.imageAsset!.id}`,
                              { method: "DELETE" },
                            );
                            await onChanged();
                          }, "Question image removed.")
                        }
                        type="button"
                      >
                        Remove image
                      </button>
                    ) : null}
                  </div>
                ) : !disabled ? (
                  <form
                    className="mt-3 flex flex-wrap items-center gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const uploadForm = event.currentTarget;
                      const file = (
                        uploadForm.elements.namedItem(
                          "existingQuestionImage",
                        ) as HTMLInputElement
                      ).files?.[0];
                      if (!file) return;
                      void run(async () => {
                        await storeQuestionImage(question.id, file);
                        uploadForm.reset();
                        await onChanged();
                      }, "Question image uploaded.");
                    }}
                  >
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      className="max-w-xs text-xs"
                      name="existingQuestionImage"
                      required
                      type="file"
                    />
                    <button
                      className="cursor-pointer text-xs font-semibold text-[#073d78] hover:underline"
                      type="submit"
                    >
                      Add image
                    </button>
                  </form>
                ) : null}
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
          <label className="grid gap-1.5 text-xs font-semibold text-[#435166]">
            Question image (optional)
            <input
              accept="image/jpeg,image/png,image/webp"
              className={fieldClass}
              name="questionImage"
              type="file"
            />
            <span className="font-normal text-[#747d8c]">
              JPEG, PNG, or WebP · maximum 10 MB
            </span>
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
  const router = useRouter();
  const [language] = useAppLanguage();
  const { data, error, loading, refresh } =
    useBackendQuery<TeacherCourseDetailDto>(`courses/${courseId}`);
  const categoryOptions = useBackendQuery<CategoryDto[]>('categories');
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
      <main className="mx-auto w-[min(calc(100%-48px),1500px)] py-[clamp(48px,6vw,84px)] max-[640px]:w-[min(calc(100%-28px),760px)]">
        <ApiState loading={loading} error={error} />
      </main>
    );
  const version = data.versions[0];
  if (!version)
    return (
      <main className="mx-auto w-[min(calc(100%-48px),1500px)] py-[clamp(48px,6vw,84px)] max-[640px]:w-[min(calc(100%-28px),760px)]">
        <ApiState loading={false} error="Course Version was not found." />
      </main>
    );
  const isDraft = version.status === "DRAFT";
  const status = version.status === "SUPERSEDED" ? "PUBLISHED" : version.status;
  const checks = Object.entries(data.checks);
  const nextContentPosition =
    Math.max(0, ...version.contentItems.map((item) => item.position)) + 1;
  const nextSectionPosition =
    Math.max(0, ...version.sections.map((section) => section.position)) + 1;
  const publishedVersion = data.versions.find(
    (courseVersion) => courseVersion.status === "PUBLISHED",
  );
  const unpublishedVersion = data.versions.find(
    (courseVersion) => courseVersion.status === "UNPUBLISHED",
  );
  const publishableVersion = !publishedVersion ? unpublishedVersion : undefined;
  const canCreateRevision =
    version.status === "PUBLISHED" ||
    version.status === "UNPUBLISHED";
  const videoLessonCount = version.contentItems.filter(
    (item) => item.contentType === "VIDEO",
  ).length;

  async function uploadCover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = (form.elements.namedItem("cover") as HTMLInputElement)
      .files?.[0];
    if (!file) return;
    await run(async () => {
      try {
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
      } catch (error: unknown) {
        await refresh();
        throw error;
      }
    }, "Course cover uploaded.");
  }

  async function updateCourseDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    await run(async () => {
      await backendApi(`course-versions/${version.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: String(values.get("title") ?? ""),
          description: String(values.get("description") ?? ""),
          languageCode: String(values.get("languageCode") ?? "th"),
        }),
      });
      await refresh();
    }, "Course details updated.");
  }

  async function updateCategories(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    await run(async () => {
      await backendApi(`courses/${courseId}/categories`, {
        method: 'PUT',
        body: JSON.stringify({ categoryIds: values.getAll('category') }),
      });
      await refresh();
    }, 'Course categories updated.');
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
          sectionId: String(values.get("sectionId") ?? "") || undefined,
          position: nextContentPosition,
        }),
      });
      form.reset();
      await refresh();
    }, "Text lesson added.");
  }

  async function createSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    await run(async () => {
      await backendApi(`course-versions/${version.id}/sections`, {
        method: "POST",
        body: JSON.stringify({
          title: String(values.get("title") ?? ""),
          position: nextSectionPosition,
        }),
      });
      form.reset();
      await refresh();
    }, "Section added.");
  }

  async function updateTextContent(
    event: FormEvent<HTMLFormElement>,
    contentId: string,
  ) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    await run(async () => {
      await backendApi(`content/${contentId}/text`, {
        method: "PATCH",
        body: JSON.stringify({
          title: String(values.get("title") ?? ""),
          textBody: String(values.get("textBody") ?? ""),
        }),
      });
      await refresh();
    }, "Text lesson updated.");
  }

  async function moveContentToSection(
    event: FormEvent<HTMLFormElement>,
    contentId: string,
  ) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    await run(async () => {
      await backendApi(`content/${contentId}/section`, {
        method: "PATCH",
        body: JSON.stringify({
          sectionId: String(values.get("sectionId") ?? "") || null,
        }),
      });
      await refresh();
    }, "Lecture section updated.");
  }

  async function addMedia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const file = (form.elements.namedItem("media") as HTMLInputElement)
      .files?.[0];
    if (!file) return;
    await run(async () => {
      try {
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
              sectionId: String(values.get("sectionId") ?? "") || undefined,
            }),
          },
        );
        await putSignedFile(upload.uploadUrl, file);
        await backendApi(`media/${upload.assetId}/complete`, { method: "POST" });
        form.reset();
        await refresh();
      } catch (error: unknown) {
        await refresh();
        throw error;
      }
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

  async function startRevision() {
    await run(async () => {
      await backendApi(`courses/${courseId}/versions`, { method: "POST" });
      await refresh();
    }, "Draft revision created. You can now update the Course.");
  }

  async function cancelRevision() {
    if (!window.confirm("Discard this Draft? Its unsent changes and uploaded files will be deleted.")) {
      return;
    }
    await run(async () => {
      await backendApi(`course-versions/${version.id}`, { method: "DELETE" });
      if (version.versionNumber === 1) {
        router.replace("/teacher/courses");
      } else {
        await refresh();
      }
    }, "Draft discarded. The published Version remains active.");
  }

  async function unpublishCourse(versionId: string) {
    if (!window.confirm("Unpublish this Course? Students will no longer find or open it.")) {
      return;
    }
    await run(async () => {
      await backendApi(`course-versions/${versionId}/unpublish`, {
        method: "POST",
      });
      await refresh();
    }, "Course unpublished.");
  }

  async function publishCourse(versionId: string) {
    if (!window.confirm("Republish this Course? Students will be able to find and open it.")) {
      return;
    }
    await run(async () => {
      await backendApi(`course-versions/${versionId}/publish`, {
        method: "POST",
      });
      await refresh();
    }, "Course published again.");
  }

  return (
    <main className="min-h-full bg-[#f7f7f9] pb-16">
      <header className="sticky top-0 z-20 flex min-h-[72px] flex-wrap items-center gap-x-5 gap-y-2 bg-[#17171f] px-[clamp(20px,4vw,56px)] py-4 text-white shadow-[0_12px_28px_rgba(23,23,31,0.14)]">
        <Link
          className="text-sm text-white/80 no-underline transition hover:text-white"
          href="/teacher/courses"
        >
          ← Back to courses
        </Link>
        <strong className="max-w-[36rem] truncate text-sm font-semibold">
          {version.title || "Untitled Course"}
        </strong>
        <StatusBadge status={status} />
        <span className="text-sm text-white/70">
          {videoLessonCount} video {videoLessonCount === 1 ? "lesson" : "lessons"} uploaded
        </span>
        <Link
          className="ml-auto border border-white/40 px-3 py-1.5 text-xs font-semibold text-white no-underline hover:bg-white/10"
          href={`/teacher/courses/${courseId}/analytics`}
        >
          Analytics
        </Link>
        <span className="text-sm font-medium text-white/80">
          {data.readiness}% ready
        </span>
      </header>
      {actionError || notice ? (
        <div
          className={`mx-auto mt-6 w-[min(calc(100%-48px),1420px)] border-l-4 p-4 text-sm ${actionError ? "border-[#b42318] bg-[#fff3f2] text-[#8f1d14]" : "border-[#0b6a73] bg-[#effafa] text-[#07545b]"}`}
        >
          {actionError ?? notice}
        </div>
      ) : null}
      <div className="mx-auto grid w-[min(calc(100%-48px),1420px)] grid-cols-[280px_minmax(0,1fr)] py-10 max-[900px]:w-full max-[900px]:grid-cols-1 max-[900px]:py-0">
        <nav
          className="sticky top-[104px] grid h-fit content-start gap-8 px-7 py-8 max-[900px]:static max-[900px]:grid-cols-3 max-[900px]:gap-5 max-[900px]:overflow-x-auto max-[900px]:bg-white max-[640px]:grid-cols-1"
          aria-label="Course authoring sections"
        >
          <div>
            <h2 className="text-sm font-semibold text-[#292b3a]">Plan your course</h2>
            <div className="mt-3 grid">
              {[
                ["details", "Course details", data.checks.details && data.checks.categories && data.checks.eligibility],
                ["cover", "Course cover", Boolean(version.coverAsset)],
              ].map(([target, label, ready]) => (
                <a className="group flex min-w-52 items-center gap-3 border-l-[3px] border-transparent px-4 py-2.5 text-sm text-[#4c4d5e] no-underline transition hover:border-[#6d28d9] hover:bg-white hover:text-[#292b3a]" href={`#${target}`} key={String(target)}>
                  <span className={`size-5 rounded-full border ${ready ? "border-[#6d28d9] bg-[#6d28d9] shadow-[inset_0_0_0_4px_white]" : "border-[#77798a]"}`} />
                  {String(label)}
                </a>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#292b3a]">Create your content</h2>
            <div className="mt-3 grid">
              {[
                ["content", "Curriculum", data.checks.content && data.checks.media],
                ["preTest", "Pre-test", data.checks.preTest],
                ["preTest", "Post-test", data.checks.postTest],
              ].map(([target, label, ready]) => (
                <a className="group flex min-w-52 items-center gap-3 border-l-[3px] border-transparent px-4 py-2.5 text-sm text-[#4c4d5e] no-underline transition hover:border-[#6d28d9] hover:bg-white hover:text-[#292b3a]" href={`#${target}`} key={String(label)}>
                  <span className={`size-5 rounded-full border ${ready ? "border-[#6d28d9] bg-[#6d28d9] shadow-[inset_0_0_0_4px_white]" : "border-[#77798a]"}`} />
                  {String(label)}
                </a>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#292b3a]">Publish your course</h2>
            <a className="group mt-3 flex min-w-52 items-center gap-3 border-l-[3px] border-transparent px-4 py-2.5 text-sm text-[#4c4d5e] no-underline transition hover:border-[#6d28d9] hover:bg-white hover:text-[#292b3a]" href="#submission-checklist">
              <span className={`size-5 rounded-full border ${data.readiness === 100 ? "border-[#6d28d9] bg-[#6d28d9] shadow-[inset_0_0_0_4px_white]" : "border-[#77798a]"}`} />
              Submission checklist
            </a>
            {isDraft ? (
              <button
                className="mt-6 inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-sm bg-[#6d28d9] px-5 text-sm font-semibold text-white transition hover:bg-[#5b21b6] disabled:cursor-not-allowed disabled:bg-[#b7afc9]"
                disabled={busy || data.readiness < 100}
                onClick={() => void submitDraft()}
                type="button"
              >
                {busy ? "Submitting…" : "Submit for Review"}
              </button>
            ) : null}
            <div className="mt-4 grid gap-2">
              {version.status === "REJECTED" ? (
                <button className={secondaryButton} disabled={busy} onClick={() => void reopenRejectedDraft()} type="button">
                  {busy ? "Reopening…" : "Reopen Draft"}
                </button>
              ) : null}
              {canCreateRevision ? (
                <button className={secondaryButton} disabled={busy} onClick={() => void startRevision()} type="button">
                  {busy ? "Creating Draft…" : "Edit Course"}
                </button>
              ) : null}
              {!isDraft && publishedVersion ? (
                <button className={secondaryButton} disabled={busy} onClick={() => void unpublishCourse(publishedVersion.id)} type="button">
                  {busy ? "Working…" : "Unpublish Course"}
                </button>
              ) : null}
              {!isDraft && publishableVersion ? (
                <button className={primaryButton} disabled={busy} onClick={() => void publishCourse(publishableVersion.id)} type="button">
                  {busy ? "Republishing…" : "Republish Course"}
                </button>
              ) : null}
              {isDraft ? (
                <button className="min-h-10 cursor-pointer text-sm font-medium text-[#8f1d14] hover:underline disabled:cursor-not-allowed disabled:text-[#a8736f]" disabled={busy} onClick={() => void cancelRevision()} type="button">
                  Discard Draft
                </button>
              ) : null}
            </div>
            {!isDraft ? (
              <p className="mt-4 text-xs leading-5 text-[#747d8c]">
                {version.status === "SUBMITTED"
                  ? "Waiting for Approver review."
                  : version.status === "UNPUBLISHED"
                    ? "This course is hidden from students."
                    : "This version is published."}
              </p>
            ) : null}
          </div>
        </nav>
        <div className="min-w-0 overflow-hidden bg-white shadow-[0_8px_30px_rgba(24,24,35,0.09)]">
          <section className={panelClass} id="details">
            <p className="text-xs font-bold tracking-[0.12em] text-[#0b6a73] uppercase">
              Course readiness
            </p>
            <h2 className="mt-2 text-3xl tracking-[-0.04em] text-[#202a38]">
              Structure overview
            </h2>
            {isDraft ? (
              <form
                className="mt-6 grid max-w-3xl gap-4"
                id="course-details-form"
                onSubmit={(event) => void updateCourseDetails(event)}
              >
                <label className="grid gap-1.5 text-xs font-semibold text-[#435166]">
                  Course title
                  <input
                    className={fieldClass}
                    defaultValue={version.title}
                    name="title"
                    required
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-[#435166]">
                  Course description
                  <textarea
                    className={`${fieldClass} min-h-32 resize-y`}
                    defaultValue={version.description ?? ""}
                    name="description"
                    required
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-[#435166]">
                  Course language
                  <select
                    className={fieldClass}
                    defaultValue={version.languageCode}
                    name="languageCode"
                  >
                    {COURSE_LANGUAGES.map((option) => (
                      <option key={option.code} value={option.code}>
                        {courseLanguageLabel(option.code, language)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button className={primaryButton} disabled={busy} type="submit">
                    {busy ? "Saving…" : "Save Draft"}
                  </button>
                  <span className="text-xs text-[#747d8c]">
                    Typed changes are saved only when you press Save Draft.
                  </span>
                </div>
              </form>
            ) : (
              <p className="mt-3 max-w-2xl leading-7 text-[#687486]">
                {version.description ?? "No Course description."}
              </p>
            )}
            <dl className="mt-7 grid grid-cols-3 border-t border-l border-[#d8dde5] max-[800px]:grid-cols-1">
              <div className="border-r border-b border-[#d8dde5] p-5">
                <dt className="text-xs tracking-[0.1em] text-[#747d8c] uppercase">
                  Course language
                </dt>
                <dd className="mt-2 text-sm font-semibold text-[#202a38]">
                  {courseLanguageLabel(version.languageCode, language)}
                </dd>
              </div>
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
            {isDraft && categoryOptions.data ? (
              <form className="mt-6 border border-[#d8dde5] bg-[#fafbfc] p-5" onSubmit={(event) => void updateCategories(event)}>
                <h3 className="text-sm font-semibold text-[#202a38]">Edit categories</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {categoryOptions.data.map((category) => (
                    <label className="flex items-center gap-2 text-sm text-[#4d5868]" key={category.id}>
                      <input defaultChecked={data.categories.some(({ category: assigned }) => assigned.id === category.id)} name="category" type="checkbox" value={category.id} />
                      {translateCategory(category, language)}
                    </label>
                  ))}
                </div>
                <button className={`${secondaryButton} mt-4`} disabled={busy} type="submit">Save categories</button>
              </form>
            ) : null}
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
                    <span className="text-[0.7rem] font-semibold tracking-[0.06em] text-[#0b6a73] uppercase">
                      {version.sections.find((section) => section.id === item.sectionId)?.title ?? "General"}
                    </span>
                    {isDraft && item.contentType === "TEXT" ? (
                      <form
                        className="grid gap-3"
                        onSubmit={(event) =>
                          void updateTextContent(event, item.id)
                        }
                      >
                        <input
                          className={fieldClass}
                          defaultValue={item.title ?? ""}
                          name="title"
                          placeholder="Lesson title"
                          required
                        />
                        <textarea
                          className={`${fieldClass} min-h-28 resize-y`}
                          defaultValue={item.textBody ?? ""}
                          name="textBody"
                          required
                        />
                        <div className="flex flex-wrap gap-3">
                          <button className={secondaryButton} disabled={busy} type="submit">
                            Save lesson
                          </button>
                          <button
                            className="cursor-pointer text-xs font-semibold text-[#8f1d14] hover:underline"
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                await backendApi(`content/${item.id}/text`, {
                                  method: "DELETE",
                                });
                                await refresh();
                              }, "Text lesson removed.")
                            }
                            type="button"
                          >
                            Remove lesson
                          </button>
                        </div>
                      </form>
                    ) : (
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
                    )}
                    <div className="grid justify-items-end gap-2">
                      {isDraft && version.sections.length > 0 ? (
                        <form
                          className="grid min-w-44 gap-2"
                          onSubmit={(event) =>
                            void moveContentToSection(event, item.id)
                          }
                        >
                          <select
                            className={fieldClass}
                            defaultValue={item.sectionId ?? ""}
                            name="sectionId"
                          >
                            <option value="">General</option>
                            {version.sections.map((section) => (
                              <option key={section.id} value={section.id}>
                                {section.position}. {section.title}
                              </option>
                            ))}
                          </select>
                          <button
                            className={secondaryButton}
                            disabled={busy}
                            type="submit"
                          >
                            Save section
                          </button>
                        </form>
                      ) : null}
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
              <div className="mt-7 grid gap-5">
                <form
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 border-t-4 border-[#0b6a73] bg-[#f1f8f8] p-5 max-[560px]:grid-cols-1"
                  onSubmit={(event) => void createSection(event)}
                >
                  <label className="grid gap-1.5 text-xs font-semibold text-[#435166]">
                    New section title
                    <input className={fieldClass} name="title" placeholder={`Section ${nextSectionPosition}`} required />
                  </label>
                  <button className={primaryButton} disabled={busy} type="submit">Add section</button>
                </form>
                <div className="grid gap-5 xl:grid-cols-2">
                <form
                  className="grid content-start gap-4 border-t-4 border-[#073d78] bg-[#f8fafc] p-5"
                  onSubmit={(event) => void addText(event)}
                >
                  <h3 className="text-lg text-[#202a38]">Add text lesson</h3>
                  <select className={fieldClass} name="sectionId" required={version.sections.length > 0}>
                    <option value="">{version.sections.length ? "Choose section" : "General (no section)"}</option>
                    {version.sections.map((section) => <option key={section.id} value={section.id}>{section.position}. {section.title}</option>)}
                  </select>
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
                  <select className={fieldClass} name="sectionId" required={version.sections.length > 0}>
                    <option value="">{version.sections.length ? "Choose section" : "General (no section)"}</option>
                    {version.sections.map((section) => <option key={section.id} value={section.id}>{section.position}. {section.title}</option>)}
                  </select>
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
                  No assessments yet. Create both the mandatory Pre-test and Post-test.
                </p>
              )}
            </div>
          </section>
          <section className={panelClass} id="submission-checklist">
            <p className="text-xs font-bold tracking-[0.12em] text-[#6d28d9] uppercase">
              Final review
            </p>
            <h2 className="mt-2 text-2xl text-[#202a38]">
              Submission checklist
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#687486]">
              Every required item must be ready before this version can be sent to an Approver.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {checks.map(([key, ready]) => (
                <li
                  className={`flex items-center gap-3 border p-4 text-sm ${ready ? "border-[#d8d0ef] bg-[#faf8ff] text-[#292b3a]" : "border-[#ead8d5] bg-[#fff8f7] text-[#7a342d]"}`}
                  key={key}
                >
                  <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${ready ? "bg-[#6d28d9] text-white" : "border border-[#c58d86]"}`}>
                    {ready ? "✓" : "!"}
                  </span>
                  <a
                    className="font-medium text-inherit no-underline hover:underline"
                    href={`#${checklistTargets[key as keyof TeacherCourseDetailDto["checks"]]}`}
                  >
                    {checklistLabels[key as keyof TeacherCourseDetailDto["checks"]]}
                  </a>
                  <small className="ml-auto text-xs opacity-70">
                    {ready ? "Ready" : "Needs work"}
                  </small>
                </li>
              ))}
            </ul>
            {isDraft ? (
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <button
                  className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-sm bg-[#6d28d9] px-7 text-sm font-semibold text-white transition hover:bg-[#5b21b6] disabled:cursor-not-allowed disabled:bg-[#b7afc9]"
                  disabled={busy || data.readiness < 100}
                  onClick={() => void submitDraft()}
                  type="button"
                >
                  {busy ? "Submitting…" : "Submit for Review"}
                </button>
                <span className="text-sm text-[#687486]">
                  {data.readiness === 100
                    ? "Ready to submit. Approval publishes the course automatically."
                    : `${checks.filter(([, ready]) => !ready).length} required item(s) remaining.`}
                </span>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
