"use client";

import Link from "next/link";
import BootstrapIcon from "../../../bootstrap-icon";
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
import { learningCopy } from "../../../../lib/learning-copy";
import {
  translateCategory,
  translateMajor,
} from "../../../../lib/reference-translations";
import {
  COURSE_LANGUAGES,
  courseLanguageLabel,
} from "../../../../lib/course-language";
import { useUiTranslation } from "../../../../lib/ui-translations";


const fieldClass =
  "min-h-11 w-full border border-[#cfd5df] bg-white px-3 py-2.5 text-sm text-[#202a38] outline-none transition focus:border-[#073d78] focus:ring-2 focus:ring-[#073d78]/15";
const primaryButton =
  "inline-flex min-h-11 cursor-pointer items-center justify-center bg-[#073d78] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#063777] disabled:cursor-not-allowed disabled:bg-[#aeb5c0]";
const secondaryButton =
  "inline-flex min-h-11 cursor-pointer items-center justify-center border border-[#073d78] bg-white px-5 py-2.5 text-sm font-semibold text-[#073d78] transition hover:bg-[#edf3f8] disabled:cursor-not-allowed disabled:border-[#c8ccd3] disabled:text-[#949aa4]";
const panelClass =
  "scroll-mt-28 border-b border-[#e2e4eb] bg-white p-6 last:border-b-0 sm:p-10";
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
  const t = useUiTranslation();
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
          throw new Error(t("Add at least two answer choices."));
        if (!options.some((option) => option.index === correct))
          throw new Error(t("The correct answer cannot be empty."));
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
      `Question added to ${quiz.quizType === "PRE_TEST" ? t("Pre-test") : t("Post-test")}.`,
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
    }, `${quiz.quizType === "PRE_TEST" ? t("Pre-test") : t("Post-test")} updated.`);
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
      if (options.length < 2) throw new Error(t("Add at least two answer choices."));
      if (!options.some((option) => option.index === correctIndex)) {
        throw new Error(t("The correct answer cannot be empty."));
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
    }, t("Question updated."));
  }

  async function clearAllQuestions() {
    if (!window.confirm(t('Clear every question from “{title}”? This cannot be undone.', { title: quiz.title }))) {
      return;
    }
    await run(async () => {
      await backendApi(`quizzes/${quiz.id}/questions`, { method: "DELETE" });
      await onChanged();
    }, `${quiz.quizType === "PRE_TEST" ? t("Pre-test") : t("Post-test")} questions cleared.`);
  }

  async function removeQuestion(
    question: QuizDto["questions"][number],
  ) {
    if (!window.confirm(t('Remove “{question}”? This cannot be undone.', { question: question.questionText }))) {
      return;
    }
    await run(async () => {
      await backendApi(`questions/${question.id}`, { method: "DELETE" });
      await onChanged();
    }, t("Question removed."));
  }

  async function removeTest() {
    if (!window.confirm(t('Remove “{title}” and all of its questions? This cannot be undone.', { title: quiz.title }))) {
      return;
    }
    await run(async () => {
      await backendApi(`quizzes/${quiz.id}`, { method: "DELETE" });
      await onChanged();
    }, `${quiz.quizType === "PRE_TEST" ? t("Pre-test") : t("Post-test")} removed.`);
  }

  return (
    <article className="border-t border-[#d8dde5] pt-6 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.12em] text-[#0b6a73] uppercase">
            {quiz.quizType === "PRE_TEST" ? t("Pre-test") : t("Post-test")}
          </p>
          <h4 className="mt-1 text-lg font-semibold text-[#202a38]">
            {quiz.title}
          </h4>
        </div>
        <span className="bg-[#edf3f8] px-3 py-1.5 text-xs text-[#435166]">
          {quiz.questions.length}{t(" questions ·")}{" "}
          {quiz.durationSeconds
            ? t('{count} min', { count: Math.ceil(quiz.durationSeconds / 60) })
            : t("Untimed")}
        </span>
      </div>
      {!disabled ? (
        <form
          className="mt-5 grid gap-3 rounded-control border border-line bg-[#f6f8fa] p-4 sm:grid-cols-[minmax(0,1fr)_150px_auto] sm:items-end"
          onSubmit={(event) => void updateQuizDetails(event)}
        >
          <label className="grid gap-1.5 text-xs font-semibold text-[#435166]">{t("Test title")}<input className={fieldClass} defaultValue={quiz.title} name="title" required />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-[#435166]">{t("Duration (minutes)")}<input
              className={fieldClass}
              defaultValue={quiz.durationSeconds ? Math.ceil(quiz.durationSeconds / 60) : ""}
              min="1"
              name="minutes"
              placeholder={t("Untimed")}
              type="number"
            />
          </label>
          <button className={secondaryButton} type="submit">{t("Save test")}</button>
        </form>
      ) : null}
      {!disabled ? (
        <div className="mt-3 flex flex-wrap justify-end gap-4">
          {quiz.questions.length ? (
            <button
              className="cursor-pointer text-xs font-semibold text-[#b54708] hover:underline"
              onClick={() => void clearAllQuestions()}
              type="button"
            >{t("Clear questions")}</button>
          ) : null}
          <button
            className="cursor-pointer text-xs font-semibold text-[#8f1d14] hover:underline"
            onClick={() => void removeTest()}
            type="button"
          >{t("Remove test")}</button>
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
                    <label className="grid gap-1.5 text-xs font-semibold text-[#435166]">{t("Question")}<input
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
                                placeholder={t('Choice {number}', { number: optionIndex + 1 }) + (optionIndex > 1 ? t(' (optional)') : '')}
                                required={optionIndex < 2}
                              />
                            </label>
                          );
                        },
                      )}
                    </div>
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <label className="grid w-28 gap-1.5 text-xs font-semibold text-[#435166]">{t("Points")}<input
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
                        >{t("Remove question")}</button>
                        <button className={secondaryButton} type="submit">{t("Save question")}</button>
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
                      >{t("Remove image")}</button>
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
                    >{t("Add image")}</button>
                  </form>
                ) : null}
                <p className="mt-1 text-xs text-[#58677c]">
                  {question.options.length}{t(" choices · ")}{Number(question.points)}{" "}{t("point(s)")}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
      {!disabled ? (
        <form
          className="mt-6 grid gap-4 rounded-control border border-line bg-[#f8fbfc] p-5"
          onSubmit={(event) => void addQuestion(event)}
        >
          <label className="grid gap-1.5 text-xs font-semibold text-[#435166]">{t("Question")}<input
              className={fieldClass}
              name="questionText"
              placeholder={t("What should the learner understand?")}
              required
            />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-[#435166]">{t("Question image (optional)")}<input
              accept="image/jpeg,image/png,image/webp"
              className={fieldClass}
              name="questionImage"
              type="file"
            />
            <span className="font-normal text-[#58677c]">{t("JPEG, PNG, or WebP · maximum 10 MB")}</span>
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
                  placeholder={t('Choice {number}', { number: index + 1 }) + (index > 1 ? t(' (optional)') : '')}
                  required={index < 2}
                />
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <label className="grid w-28 gap-1.5 text-xs font-semibold text-[#435166]">{t("Points")}<input
                className={fieldClass}
                defaultValue="1"
                min="0.01"
                name="points"
                step="0.01"
                type="number"
              />
            </label>
            <button className={secondaryButton} type="submit">{t("Add question")}</button>
          </div>
          <p className="text-xs text-[#58677c]">{t("Select the radio button beside the correct answer.")}</p>
        </form>
      ) : null}
    </article>
  );
}

export default function CourseDetailClient({ courseId }: { courseId: string }) {
  const t = useUiTranslation();
  const router = useRouter();
  const [language] = useAppLanguage();
  const copy = learningCopy[language];
  const { data, error, loading, refresh } =
    useBackendQuery<TeacherCourseDetailDto>(`courses/${courseId}`);
  const categoryOptions = useBackendQuery<CategoryDto[]>('categories');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Curriculum builder interactive states
  const [activeTab, setActiveTab] = useState<
    "curriculum" | "landing" | "assessments" | "checklist"
  >("curriculum");
  const [openContentId, setOpenContentId] = useState<string | null>(null);
  const [selectedContentType, setSelectedContentType] = useState<
    "VIDEO" | "AUDIO" | "DOCUMENT" | "IMAGE" | "ARTICLE" | null
  >(null);
  const [openDescriptionId, setOpenDescriptionId] = useState<string | null>(null);
  const [addingSection, setAddingSection] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [addingLectureSectionId, setAddingLectureSectionId] = useState<string | null>(null);
  const [editingLectureId, setEditingLectureId] = useState<string | null>(null);

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
          : t("Unable to save this change."),
      );
    } finally {
      setBusy(false);
    }
  }

  if (!data)
    return (
      <main data-ui="editor" className="mx-auto w-[min(calc(100%-48px),1500px)] py-[clamp(48px,6vw,84px)] max-[640px]:w-[min(calc(100%-28px),760px)]">
        <ApiState loading={loading} error={error} />
      </main>
    );
  const version = data.versions[0];
  if (!version)
    return (
      <main data-ui="editor" className="mx-auto w-[min(calc(100%-48px),1500px)] py-[clamp(48px,6vw,84px)] max-[640px]:w-[min(calc(100%-28px),760px)]">
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
  async function createNewSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const title = String(new FormData(form).get("title") ?? "").trim();
    if (!title) return;
    await run(async () => {
      await backendApi(`course-versions/${version.id}/sections`, {
        method: "POST",
        body: JSON.stringify({
          title,
          position: nextSectionPosition,
        }),
      });
      form.reset();
      setAddingSection(false);
      await refresh();
    }, t("Section added."));
  }

  async function saveSectionTitle(event: FormEvent<HTMLFormElement>, sectionId: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const title = String(new FormData(form).get("title") ?? "").trim();
    if (!title) return;
    await run(async () => {
      await backendApi(`sections/${sectionId}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      });
      setEditingSectionId(null);
      await refresh();
    }, t("Section title updated."));
  }

  async function removeSection(sectionId: string, sectionTitle: string) {
    if (!window.confirm(t('Delete "{title}"? Its lessons will be unassigned.', { title: sectionTitle }))) return;
    await run(async () => {
      await backendApi(`sections/${sectionId}`, { method: "DELETE" });
      await refresh();
    }, t("Section deleted."));
  }

  async function addLectureToSection(event: FormEvent<HTMLFormElement>, sectionId: string | null) {
    event.preventDefault();
    const form = event.currentTarget;
    const title = String(new FormData(form).get("title") ?? "").trim();
    if (!title) return;
    await run(async () => {
      await backendApi(`course-versions/${version.id}/content/text`, {
        method: "POST",
        body: JSON.stringify({
          title,
          textBody: t("Lecture content will be added."),
          sectionId: sectionId || undefined,
          position: nextContentPosition,
        }),
      });
      form.reset();
      setAddingLectureSectionId(null);
      await refresh();
    }, t("Lecture added."));
  }

  async function saveLectureTitle(
    event: FormEvent<HTMLFormElement>,
    contentId: string,
    _currentBody?: string | null,
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const title = String(new FormData(form).get("title") ?? "").trim();
    if (!title) return;
    await run(async () => {
      await backendApi(`content/${contentId}/text`, {
        method: "PATCH",
        body: JSON.stringify({
          title,
        }),
      });
      setEditingLectureId(null);
      await refresh();
    }, t("Lecture title updated."));
  }

  async function saveLectureDescription(
    event: FormEvent<HTMLFormElement>,
    contentId: string,
    currentTitle?: string | null,
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const description = String(new FormData(form).get("description") ?? "").trim();
    await run(async () => {
      await backendApi(`content/${contentId}/text`, {
        method: "PATCH",
        body: JSON.stringify({
          title: currentTitle || undefined,
          textBody: description || t("Lecture description"),
        }),
      });
      setOpenDescriptionId(null);
      setSelectedContentType(null);
      await refresh();
    }, t("Lecture description saved."));
  }

  async function uploadLectureMediaFile(
    event: FormEvent<HTMLFormElement>,
    contentType: "VIDEO" | "AUDIO" | "DOCUMENT" | "IMAGE",
    contentId: string,
    sectionId: string | null,
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const file = (form.elements.namedItem("mediaFile") as HTMLInputElement)?.files?.[0];
    const title = String(values.get("title") ?? "").trim();
    if (!file) return;
    await run(async () => {
      try {
        const fallbackMime =
          contentType === "VIDEO"
            ? "video/mp4"
            : contentType === "AUDIO"
            ? "audio/mpeg"
            : contentType === "IMAGE"
            ? "image/png"
            : "application/pdf";
        const upload = await backendApi<InitializedUploadDto>(
          `course-versions/${version.id}/media/uploads`,
          {
            method: "POST",
            body: JSON.stringify({
              contentType,
              title: title || file.name,
              fileName: file.name,
              mimeType: file.type || fallbackMime,
              sizeBytes: file.size,
              position: nextContentPosition,
              sectionId: sectionId || undefined,
            }),
          },
        );
        await putSignedFile(upload.uploadUrl, file);
        await backendApi(`media/${upload.assetId}/complete`, { method: "POST" });
        try {
          await backendApi(`content/${contentId}/text`, { method: "DELETE" });
        } catch {
          // ignore placeholder text cleanup
        }
        form.reset();
        setOpenContentId(null);
        setSelectedContentType(null);
        await refresh();
      } catch (error: unknown) {
        await refresh();
        throw error;
      }
    }, `${contentType === "DOCUMENT" ? t("Document") : contentType.charAt(0) + contentType.slice(1).toLowerCase()} uploaded.`);
  }


  async function removeLectureItem(item: VersionDto["contentItems"][number]) {
    if (!window.confirm(t('Delete "{title}"?', { title: item.title || item.contentType }))) return;
    await run(async () => {
      if (item.mediaAsset) {
        await backendApi(`media/${item.mediaAsset.id}`, { method: "DELETE" });
      } else {
        await backendApi(`content/${item.id}/text`, { method: "DELETE" });
      }
      await refresh();
    }, t("Lecture removed."));
  }

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
    }, t("Course cover uploaded."));
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
          languageCode: String(values.get("languageCode") ?? t("th")),
        }),
      });
      await refresh();
    }, t("Course details updated."));
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
    }, t("Course categories updated."));
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
    }, t("Text lesson added."));
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
    }, t("Section added."));
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
    }, t("Text lesson updated."));
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
    }, t("Lecture section updated."));
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
    }, t("Media lesson uploaded."));
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
    }, t("Assessment created. Add its first question below."));
  }

  async function submitDraft() {
    await run(async () => {
      await backendApi(`course-versions/${version.id}/submit`, {
        method: "POST",
      });
      await refresh();
    }, t("Draft submitted for approval."));
  }

  async function reopenRejectedDraft() {
    await run(async () => {
      await backendApi(`course-versions/${version.id}/reopen`, {
        method: "POST",
      });
      await refresh();
    }, t("Rejected Version reopened as a Draft."));
  }

  async function startRevision() {
    await run(async () => {
      await backendApi(`courses/${courseId}/versions`, { method: "POST" });
      await refresh();
    }, t("Draft revision created. You can now update the Course."));
  }

  async function cancelRevision() {
    if (!window.confirm(t("Discard this Draft? Its unsent changes and uploaded files will be deleted."))) {
      return;
    }
    await run(async () => {
      await backendApi(`course-versions/${version.id}`, { method: "DELETE" });
      if (version.versionNumber === 1) {
        router.replace("/teacher/courses");
      } else {
        await refresh();
      }
    }, t("Draft discarded. The published Version remains active."));
  }

  async function unpublishCourse(versionId: string) {
    if (!window.confirm(t("Unpublish this Course? Students will no longer find or open it."))) {
      return;
    }
    await run(async () => {
      await backendApi(`course-versions/${versionId}/unpublish`, {
        method: "POST",
      });
      await refresh();
    }, t("Course unpublished."));
  }

  async function publishCourse(versionId: string) {
    if (!window.confirm(t("Republish this Course? Students will be able to find and open it."))) {
      return;
    }
    await run(async () => {
      await backendApi(`course-versions/${versionId}/publish`, {
        method: "POST",
      });
      await refresh();
    }, t("Course published again."));
  }

  const allSections =
    version.sections.length > 0
      ? version.sections.slice().sort((a, b) => a.position - b.position)
      : version.contentItems.length > 0
        ? [{ id: "general", title: "Introduction", position: 1 }]
        : [];

  return (
    <main data-ui="editor" className="min-h-full bg-[#f7f7f9] pb-16">
      <header className="sticky top-0 z-20 flex min-h-[72px] flex-wrap items-center gap-x-5 gap-y-2 bg-[#1c1d1f] px-[clamp(20px,4vw,56px)] py-4 text-white shadow-[0_12px_28px_rgba(23,23,31,0.14)]">
        <Link
          className="text-sm font-medium text-white/80 no-underline transition hover:text-white"
          href="/teacher/courses"
        >{t("Back to courses")}</Link>
        <strong className="max-w-[36rem] truncate text-sm font-semibold">
          {version.title || t("Untitled Course")}
        </strong>
        <span className="rounded bg-[#3e4143] px-2.5 py-0.5 text-xs font-bold tracking-wider text-white uppercase">
          {status}
        </span>
        <div className="ml-auto flex items-center gap-3">
          <Link
            className="border border-white/40 px-3 py-1.5 text-xs font-semibold text-white no-underline hover:bg-white/10 rounded"
            href={`/teacher/courses/${courseId}/analytics`}
          >{t("Analytics")}</Link>

        </div>
      </header>

      {actionError || notice ? (
        <div
          className={`mx-auto mt-6 w-[min(calc(100%-48px),1420px)] border-l-4 p-4 text-sm ${actionError ? "border-[#b42318] bg-[#fff3f2] text-[#8f1d14]" : "border-[#0b6a73] bg-[#effafa] text-[#07545b]"}`}
        >
          {t(actionError ?? notice ?? '')}
        </div>
      ) : null}

      <div className="mx-auto grid w-[min(calc(100%-48px),1420px)] grid-cols-[280px_minmax(0,1fr)] gap-8 py-10 max-[900px]:w-full max-[900px]:grid-cols-1 max-[900px]:py-0">
        {/* Left column navigation matching reference image */}
        <nav
          className="sticky top-[104px] grid h-fit content-start gap-7 px-4 py-6 max-[900px]:static max-[900px]:grid-cols-3 max-[900px]:gap-4 max-[900px]:overflow-x-auto max-[900px]:bg-white max-[640px]:grid-cols-1"
          aria-label={t("Course authoring steps")}
        >

          <div>
            <h2 className="text-xs font-bold text-[#1c1d1f] tracking-wide mb-3">{t("Create your content")}</h2>
            <div className="grid gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("curriculum")}
                className={`group flex items-center gap-3 px-3 py-2 text-sm text-left transition rounded cursor-pointer relative ${
                  activeTab === "curriculum"
                    ? "font-bold text-[#1c1d1f] bg-white border-l-[3px] border-[#1c1d1f] shadow-xs"
                    : "text-[#4c4d5e] hover:text-[#1c1d1f] hover:bg-white"
                }`}
              >
                <span
                  className={`size-4.5 rounded-full border flex items-center justify-center shrink-0 ${
                    activeTab === "curriculum"
                      ? "border-[#1c1d1f] bg-[#1c1d1f]"
                      : "border-[#6a6f73]"
                  }`}
                >
                  {activeTab === "curriculum" ? (
                    <span className="size-1.5 rounded-full bg-white" />
                  ) : null}
                </span>
                <span>{t("Curriculum")}</span>
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold text-[#1c1d1f] tracking-wide mb-3">{t("Publish your course")}</h2>
            <div className="grid gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("landing")}
                className={`group flex items-center gap-3 px-3 py-2 text-sm text-left transition rounded cursor-pointer ${
                  activeTab === "landing"
                    ? "font-bold text-[#1c1d1f] bg-white border-l-[3px] border-[#1c1d1f] shadow-xs"
                    : "text-[#4c4d5e] hover:text-[#1c1d1f] hover:bg-white"
                }`}
              >
                <span
                  className={`size-4.5 rounded-full border flex items-center justify-center shrink-0 ${
                    activeTab === "landing"
                      ? "border-[#1c1d1f] bg-[#1c1d1f]"
                      : "border-[#6a6f73]"
                  }`}
                >
                  {activeTab === "landing" ? (
                    <span className="size-1.5 rounded-full bg-white" />
                  ) : null}
                </span>
                <span>{t("Course landing page")}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("assessments")}
                className={`group flex items-center gap-3 px-3 py-2 text-sm text-left transition rounded cursor-pointer ${
                  activeTab === "assessments"
                    ? "font-bold text-[#1c1d1f] bg-white border-l-[3px] border-[#1c1d1f] shadow-xs"
                    : "text-[#4c4d5e] hover:text-[#1c1d1f] hover:bg-white"
                }`}
              >
                <span
                  className={`size-4.5 rounded-full border flex items-center justify-center shrink-0 ${
                    activeTab === "assessments"
                      ? "border-[#1c1d1f] bg-[#1c1d1f]"
                      : "border-[#6a6f73]"
                  }`}
                >
                  {activeTab === "assessments" ? (
                    <span className="size-1.5 rounded-full bg-white" />
                  ) : null}
                </span>
                <span>{t("Assessments & Quizzes")}</span>
              </button>
            </div>

            {isDraft ? (
              <button
                className="mt-6 inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded bg-[#063777] hover:bg-[#044f99] px-5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:bg-[#aebdce] shadow-sm"
                disabled={busy || data.readiness < 100}
                onClick={() => void submitDraft()}
                type="button"
              >
                {busy ? t("Submitting…") : t("Submit for Review")}
              </button>
            ) : null}

            <div className="mt-4 grid gap-2">
              {version.status === "REJECTED" ? (
                <button className={secondaryButton} disabled={busy} onClick={() => void reopenRejectedDraft()} type="button">
                  {busy ? t("Reopening…") : t("Reopen Draft")}
                </button>
              ) : null}
              {canCreateRevision ? (
                <button className="mt-2 inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded bg-[#063777] hover:bg-[#044f99] px-5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:bg-[#aebdce] shadow-sm" disabled={busy} onClick={() => void startRevision()} type="button">
                  {busy ? t("Creating Draft…") : t("Edit Course")}
                </button>
              ) : null}
              {!isDraft && publishedVersion ? (
                <button className="mt-2 inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded bg-[#063777] hover:bg-[#044f99] px-5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:bg-[#aebdce] shadow-sm" disabled={busy} onClick={() => void unpublishCourse(publishedVersion.id)} type="button">
                  {busy ? t("Working…") : t("Unpublish Course")}
                </button>
              ) : null}
              {!isDraft && publishableVersion ? (
                <button className={primaryButton} disabled={busy} onClick={() => void publishCourse(publishableVersion.id)} type="button">
                  {busy ? t("Republishing…") : t("Republish Course")}
                </button>
              ) : null}
              {isDraft ? (
                <button className="min-h-10 cursor-pointer text-sm font-medium text-[#8f1d14] hover:underline disabled:cursor-not-allowed disabled:text-[#a8736f]" disabled={busy} onClick={() => void cancelRevision()} type="button">{t("Discard Draft")}</button>
              ) : null}
            </div>
            {!isDraft ? (
              <p className="mt-4 text-xs leading-5 text-[#58677c]">
                {version.status === "SUBMITTED"
                  ? t("Waiting for Approver review.")
                  : version.status === "UNPUBLISHED"
                    ? t("This course is hidden from students.")
                    : t("This version is published.")}
              </p>
            ) : null}
          </div>
        </nav>

        {/* Right column: Main content card */}
        <div className="min-w-0">
          {activeTab === "curriculum" ? (
            <div className="border border-[#d1d7dc] bg-white p-8 sm:p-10 shadow-xs rounded-xs">
              <h1 className="text-3xl font-bold text-[#1c1d1f] tracking-tight">{t("Course")}</h1>
              <hr className="my-6 border-[#d1d7dc]" />
              <p className="text-sm text-[#2d2f31] leading-relaxed mb-8">{t("Create your course in sections, each focused on a single learning objective. Then add content, practice activities, and assessments.")}</p>

              {allSections.length === 0 ? (
                <div className="border border-dashed border-[#cfd5df] rounded p-8 text-center bg-[#fafafa] mb-6">
                  <p className="text-sm text-[#6a6f73] mb-4">{t("No sections yet. Start organizing your course by adding your first section.")}</p>
                </div>
              ) : (
                allSections.map((section, sectionIndex) => {
                  const unassigned = version.contentItems.filter(
                    (item) => !item.sectionId || !version.sections.some((s) => s.id === item.sectionId),
                  );
                  const sectionLectures = (
                    section.id === "general" || sectionIndex === 0
                      ? [
                          ...version.contentItems.filter((item) => item.sectionId === section.id),
                          ...unassigned.filter((item) => item.sectionId !== section.id),
                        ]
                      : version.contentItems.filter((item) => item.sectionId === section.id)
                  ).sort((a, b) => a.position - b.position);

                  return (
                    <div key={section.id} className="border border-[#d1d7dc] bg-white rounded-xs mb-6 overflow-hidden">
                      {/* Section Header */}
                      <div className="bg-[#f7f9fa] border-b border-[#d1d7dc] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <strong className="text-sm font-bold text-[#1c1d1f] whitespace-nowrap">{t("Section")}{sectionIndex + 1}:
                          </strong>
                          {editingSectionId === section.id ? (
                            <form onSubmit={(e) => void saveSectionTitle(e, section.id)} className="flex items-center gap-2">
                              <input
                                name="title"
                                defaultValue={section.title}
                                className="border border-[#1c1d1f] px-2.5 py-1 text-sm bg-white outline-none"
                                autoFocus
                              />
                              <button type="submit" className="text-xs font-semibold text-[#063777] hover:underline cursor-pointer">{t("Save")}</button>
                              <button type="button" onClick={() => setEditingSectionId(null)} className="text-xs text-[#6a6f73] hover:underline cursor-pointer">{t("Cancel")}</button>
                            </form>
                          ) : (
                            <span className="text-sm text-[#1c1d1f] font-normal truncate">
                              {section.title}
                            </span>
                          )}
                        </div>
                        {isDraft && section.id !== "general" && editingSectionId !== section.id ? (
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setEditingSectionId(section.id)}
                              className="text-xs text-[#6a6f73] hover:text-[#1c1d1f] cursor-pointer"
                            >
                              <BootstrapIcon name="pencil" />{t("Edit")}</button>
                            <button
                              type="button"
                              onClick={() => void removeSection(section.id, section.title)}
                              className="text-xs text-[#b42318] hover:text-[#8f1d14] cursor-pointer"
                            >
                              <BootstrapIcon name="trash" />{t("Delete")}</button>
                          </div>
                        ) : null}
                      </div>

                      {/* Lectures inside Section */}
                      <div className="p-2 sm:p-4">
                        {sectionLectures.map((lecture, lIdx) => {
                          const isContentOpen = openContentId === lecture.id;
                          const isDescOpen = openDescriptionId === lecture.id;

                          return (
                            <div
                              key={lecture.id}
                              className="border border-[#d1d7dc] bg-white mx-3 my-3 p-4 rounded-xs hover:border-[#a1a7b3] transition"
                            >
                              {/* Lecture Title Bar */}
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-sm font-bold text-[#1c1d1f] whitespace-nowrap">{t("Lecture")}{lIdx + 1}:
                                  </span>
                                  {editingLectureId === lecture.id ? (
                                    <form onSubmit={(e) => void saveLectureTitle(e, lecture.id, lecture.textBody)} className="flex items-center gap-2">
                                      <input
                                        name="title"
                                        defaultValue={lecture.title ?? ""}
                                        className="border border-[#1c1d1f] px-2.5 py-1 text-sm bg-white outline-none"
                                        autoFocus
                                      />
                                      <button type="submit" className="text-xs font-semibold text-[#063777] hover:underline cursor-pointer">{t("Save")}</button>
                                      <button type="button" onClick={() => setEditingLectureId(null)} className="text-xs text-[#6a6f73] hover:underline cursor-pointer">{t("Cancel")}</button>
                                    </form>
                                  ) : (
                                    <span className="text-sm text-[#2d2f31] font-normal truncate">
                                      {lecture.title || lecture.contentType}
                                    </span>
                                  )}
                                  {isDraft && editingLectureId !== lecture.id ? (
                                    <div className="flex items-center gap-1.5 ml-2">
                                      <button
                                        type="button"
                                        onClick={() => setEditingLectureId(lecture.id)}
                                        className="text-xs text-[#6a6f73] hover:text-[#1c1d1f] cursor-pointer"
                                        title={t("Edit title")} aria-label={t("Edit lecture title")}
                                      >
                                        <BootstrapIcon name="pencil" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void removeLectureItem(lecture)}
                                        className="text-xs text-[#b42318] hover:text-[#8f1d14] cursor-pointer"
                                        title={t("Delete lecture")} aria-label={t("Delete lecture")}
                                      >
                                        <BootstrapIcon name="trash" />
                                      </button>
                                    </div>
                                  ) : null}
                                </div>

                                {/* Right side Content button */}
                                <div className="flex items-center gap-2 ml-auto">
                                  {lecture.mediaAsset ? (
                                    <span className="text-xs font-semibold text-[#0b6a73] bg-white px-2.5 py-1 rounded flex items-center gap-1.5 border border-[#c3f0f0]">
                                      {lecture.contentType === "VIDEO"
                                        ? t("Video")
                                        : lecture.contentType === "AUDIO"
                                        ? t("Audio")
                                        : lecture.contentType === "DOCUMENT"
                                        ? t("📑 Document")
                                        : lecture.contentType === "IMAGE"
                                        ? t("Image")
                                        : "Media"}{" "}
                                      · <span className="font-normal text-[#1c1d1f] max-w-[140px] truncate">{lecture.mediaAsset.fileName}</span>
                                      <span className="text-[0.65rem] uppercase font-bold text-[#0b6a73] bg-white px-1 rounded border border-[#b2e5e7]">
                                        {t(lecture.mediaAsset.status)}
                                      </span>
                                    </span>
                                  ) : lecture.contentType === "TEXT" && lecture.textBody && lecture.textBody.trim() ? (
                                    <span className="text-xs font-semibold text-[#0b6a73] bg-white px-2.5 py-1 rounded flex items-center gap-1.5 border border-[#c3f0f0]">
                                      <BootstrapIcon name="file-earmark-text" />{t("Article")}
                                      <span className="text-[0.65rem] uppercase font-bold text-[#0b6a73] bg-white px-1 rounded border border-[#b2e5e7]">
                                        {t("READY")}
                                      </span>
                                    </span>
                                  ) : null}

                                  {isDraft ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenContentId(isContentOpen ? null : lecture.id);
                                        setSelectedContentType(null);
                                      }}
                                      className={`font-semibold text-xs px-4 py-1.5 rounded transition cursor-pointer ${
                                        isContentOpen
                                          ? "bg-[#063777] text-white"
                                          : "border border-[#063777] text-[#063777] hover:bg-[#063777]/5"
                                      }`}
                                    >
                                      {isContentOpen ? t("Close Content") : "Content"}
                                    </button>
                                  ) : null}
                                </div>
                              </div>

                              {/* Sub-action button (Description) */}
                              {isDraft ? (
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setOpenDescriptionId(isDescOpen ? null : lecture.id)}
                                    className={`font-medium text-xs px-3 py-1 rounded transition cursor-pointer ${
                                      isDescOpen
                                        ? "bg-[#063777] text-white"
                                        : "border border-[#063777] text-[#063777] hover:bg-[#063777]/5"
                                    }`}
                                  >
                                    {lecture.textBody && lecture.textBody.trim() ? t("Edit Description") : t("+ Description")}
                                  </button>
                                </div>
                              ) : null}

                              {/* Expandable Content Type Panel */}
                              {isContentOpen && isDraft ? (
                                <div className="mt-4 border-t border-[#d1d7dc] pt-4">
                                  <div className="flex items-center justify-between border-b border-[#d1d7dc] pb-2 mb-3">
                                    <span className="text-xs font-bold text-[#1c1d1f] tracking-wide">{t("Select content type")}</span>
                                  </div>
                                  <p className="text-xs text-[#6a6f73] mb-4">{t("Select the main type of content for this lecture (Video, Audio, PDF & Document, Image, or Article).")}</p>
                                  <div className="grid grid-cols-5 gap-3 max-[900px]:grid-cols-3 max-[600px]:grid-cols-2">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedContentType("VIDEO")}
                                      className={`border p-3.5 text-center cursor-pointer transition rounded-xs flex flex-col items-center justify-center gap-2 ${
                                        selectedContentType === "VIDEO"
                                          ? "border-[#063777] bg-[#f0f4fc] shadow-xs"
                                          : "border-[#d1d7dc] bg-[#f7f9fa] hover:border-[#063777]"
                                      }`}
                                    >
                                      <div className="size-10 bg-white border border-[#d1d7dc] rounded-full flex items-center justify-center text-lg shadow-xs">
                                        🎬
                                      </div>
                                      <span className="text-xs font-bold text-[#1c1d1f]">{t("Video")}</span>
                                      <span className="text-[0.7rem] text-[#6a6f73]">MP4, MOV, WebM</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setSelectedContentType("AUDIO")}
                                      className={`border p-3.5 text-center cursor-pointer transition rounded-xs flex flex-col items-center justify-center gap-2 ${
                                        selectedContentType === "AUDIO"
                                          ? "border-[#063777] bg-[#f0f4fc] shadow-xs"
                                          : "border-[#d1d7dc] bg-[#f7f9fa] hover:border-[#063777]"
                                      }`}
                                    >
                                      <div className="size-10 bg-white border border-[#d1d7dc] rounded-full flex items-center justify-center text-lg shadow-xs">
                                        🎙️
                                      </div>
                                      <span className="text-xs font-bold text-[#1c1d1f]">{t("Audio")}</span>
                                      <span className="text-[0.7rem] text-[#6a6f73]">MP3, WAV, M4A</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setSelectedContentType("DOCUMENT")}
                                      className={`border p-3.5 text-center cursor-pointer transition rounded-xs flex flex-col items-center justify-center gap-2 ${
                                        selectedContentType === "DOCUMENT"
                                          ? "border-[#063777] bg-[#f0f4fc] shadow-xs"
                                          : "border-[#d1d7dc] bg-[#f7f9fa] hover:border-[#063777]"
                                      }`}
                                    >
                                      <div className="size-10 bg-white border border-[#d1d7dc] rounded-full flex items-center justify-center text-lg shadow-xs">
                                        📑
                                      </div>
                                      <span className="text-xs font-bold text-[#1c1d1f]">{t("PDF & File")}</span>
                                      <span className="text-[0.7rem] text-[#6a6f73]">PDF, Slides, DOC</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setSelectedContentType("IMAGE")}
                                      className={`border p-3.5 text-center cursor-pointer transition rounded-xs flex flex-col items-center justify-center gap-2 ${
                                        selectedContentType === "IMAGE"
                                          ? "border-[#063777] bg-[#f0f4fc] shadow-xs"
                                          : "border-[#d1d7dc] bg-[#f7f9fa] hover:border-[#063777]"
                                      }`}
                                    >
                                      <div className="size-10 bg-white border border-[#d1d7dc] rounded-full flex items-center justify-center text-lg shadow-xs">
                                        <BootstrapIcon name="image" />
                                      </div>
                                      <span className="text-xs font-bold text-[#1c1d1f]">{t("Image")}</span>
                                      <span className="text-[0.7rem] text-[#6a6f73]">{t("PNG, JPG, Diagrams")}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setSelectedContentType("ARTICLE")}
                                      className={`border p-3.5 text-center cursor-pointer transition rounded-xs flex flex-col items-center justify-center gap-2 ${
                                        selectedContentType === "ARTICLE"
                                          ? "border-[#063777] bg-[#f0f4fc] shadow-xs"
                                          : "border-[#d1d7dc] bg-[#f7f9fa] hover:border-[#063777]"
                                      }`}
                                    >
                                      <div className="size-10 bg-white border border-[#d1d7dc] rounded-full flex items-center justify-center text-lg shadow-xs">
                                        <BootstrapIcon name="file-earmark-text" />
                                      </div>
                                      <span className="text-xs font-bold text-[#1c1d1f]">{t("Article")}</span>
                                      <span className="text-[0.7rem] text-[#6a6f73]">{t("Text & Notes")}</span>
                                    </button>
                                  </div>

                                  {/* Form for Media Upload (VIDEO, AUDIO, DOCUMENT, IMAGE) */}
                                  {selectedContentType && selectedContentType !== "ARTICLE" ? (
                                    <form
                                      onSubmit={(e) => void uploadLectureMediaFile(e, selectedContentType, lecture.id, lecture.sectionId)}
                                      className="mt-4 border border-[#d1d7dc] bg-[#fafbfc] p-4 rounded-xs grid gap-3"
                                    >
                                      <h4 className="text-xs font-bold text-[#1c1d1f] uppercase tracking-wider flex items-center gap-1.5">
                                        {selectedContentType === "VIDEO"
                                          ? t("Upload Video Lecture")
                                          : selectedContentType === "AUDIO"
                                          ? t("Upload Audio Lesson")
                                          : selectedContentType === "DOCUMENT"
                                          ? t("📑 Upload PDF or Document")
                                          : t("Upload Image or Diagram")}
                                      </h4>
                                      <p className="text-xs text-[#6a6f73]">
                                        {selectedContentType === "VIDEO"
                                          ? t("Select an MP4, MOV, or WebM video file (up to 1GB).")
                                          : selectedContentType === "AUDIO"
                                          ? t("Select an MP3, WAV, M4A, or AAC audio file (up to 1GB).")
                                          : selectedContentType === "DOCUMENT"
                                          ? t("Select a PDF, Word document, PowerPoint presentation, or worksheet.")
                                          : t("Select a high-resolution PNG, JPG, or SVG infographic or diagram.")}
                                      </p>
                                      <input
                                        className={fieldClass}
                                        name="title"
                                        defaultValue={lecture.title ?? ""}
                                        placeholder={t("Content title (optional, defaults to file name)")}
                                      />
                                      <input
                                        className={fieldClass}
                                        name="mediaFile"
                                        type="file"
                                        accept={
                                          selectedContentType === "VIDEO"
                                            ? "video/*"
                                            : selectedContentType === "AUDIO"
                                            ? "audio/*"
                                            : selectedContentType === "IMAGE"
                                            ? "image/*"
                                            : ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,application/pdf"
                                        }
                                        required
                                      />
                                      <div className="flex items-center gap-3 pt-1">
                                        <button
                                          type="submit"
                                          disabled={busy}
                                          className="bg-[#063777] hover:bg-[#044f99] text-white text-xs font-semibold px-4 py-2 rounded cursor-pointer disabled:opacity-50"
                                        >
                                          {busy ? t("Uploading…") : t('Upload {type}', { type: t(selectedContentType === 'DOCUMENT' ? t("Document") : selectedContentType.charAt(0) + selectedContentType.slice(1).toLowerCase()) })}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setSelectedContentType(null)}
                                          className="text-xs text-[#6a6f73] hover:underline cursor-pointer"
                                        >{t("Cancel")}</button>
                                      </div>
                                    </form>
                                  ) : null}

                                  {/* Form for Article */}
                                  {selectedContentType === "ARTICLE" ? (
                                    <form
                                      onSubmit={(e) => void saveLectureDescription(e, lecture.id, lecture.title)}
                                      className="mt-4 border border-[#d1d7dc] bg-[#fafbfc] p-4 rounded-xs grid gap-3"
                                    >
                                      <h4 className="text-xs font-bold text-[#1c1d1f] uppercase tracking-wider flex items-center gap-1.5">
                                        <BootstrapIcon name="file-earmark-text" />{t("Write Article / Reading Lesson")}</h4>
                                      <textarea
                                        className={`${fieldClass} min-h-36 resize-y`}
                                        name="description"
                                        defaultValue={lecture.textBody ?? ""}
                                        placeholder={t("Write lecture article content here…")}
                                        required
                                      />
                                      <div className="flex items-center gap-3 pt-1">
                                        <button
                                          type="submit"
                                          disabled={busy}
                                          className="bg-[#063777] hover:bg-[#044f99] text-white text-xs font-semibold px-4 py-2 rounded cursor-pointer disabled:opacity-50"
                                        >
                                          {busy ? t("Saving…") : t("Save Article")}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setSelectedContentType(null)}
                                          className="text-xs text-[#6a6f73] hover:underline cursor-pointer"
                                        >{t("Cancel")}</button>
                                      </div>
                                    </form>
                                  ) : null}
                                </div>
                              ) : null}

                              {/* Expandable Description Form */}
                              {isDescOpen && isDraft ? (
                                <form
                                  onSubmit={(e) => void saveLectureDescription(e, lecture.id, lecture.title)}
                                  className="mt-3 border-t border-[#d1d7dc] pt-3"
                                >
                                  <label className="block text-xs font-bold text-[#1c1d1f] mb-1.5">{t("Lecture Description")}</label>
                                  <textarea
                                    name="description"
                                    defaultValue={lecture.textBody ?? ""}
                                    rows={3}
                                    placeholder={t("What will students learn in this lecture?")}
                                    className="w-full border border-[#cfd5df] p-2.5 text-sm bg-white outline-none focus:border-[#063777] rounded-xs"
                                  />
                                  <div className="mt-2 flex items-center gap-2">
                                    <button
                                      type="submit"
                                      disabled={busy}
                                      className="bg-[#063777] hover:bg-[#044f99] text-white text-xs font-semibold px-4 py-1.5 rounded cursor-pointer disabled:opacity-50"
                                    >{t("Save Description")}</button>
                                    <button
                                      type="button"
                                      onClick={() => setOpenDescriptionId(null)}
                                      className="text-xs text-[#6a6f73] hover:underline cursor-pointer"
                                    >{t("Cancel")}</button>
                                  </div>
                                </form>
                              ) : null}


                            </div>
                          );
                        })}

                        {/* Form to add Lecture in this section */}
                        {isDraft && addingLectureSectionId === section.id ? (
                          <form
                            onSubmit={(e) => void addLectureToSection(e, section.id === "general" ? null : section.id)}
                            className="border border-[#063777] bg-[#f0f4fc] mx-3 my-3 p-4 rounded-xs"
                          >
                            <label className="block text-xs font-bold text-[#1c1d1f] mb-1.5">{t("New Lecture Title")}</label>
                            <input
                              name="title"
                              placeholder={t("e.g. Introduction to the Topic")}
                              required
                              className="w-full border border-[#cfd5df] p-2.5 text-sm bg-white outline-none focus:border-[#063777] rounded-xs mb-3"
                              autoFocus
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="submit"
                                disabled={busy}
                                className="bg-[#063777] hover:bg-[#044f99] text-white text-xs font-semibold px-4 py-1.5 rounded cursor-pointer disabled:opacity-50"
                              >{t("Add Lecture")}</button>
                              <button
                                type="button"
                                onClick={() => setAddingLectureSectionId(null)}
                                className="text-xs text-[#6a6f73] hover:underline cursor-pointer"
                              >{t("Cancel")}</button>
                            </div>
                          </form>
                        ) : null}

                        {/* [+ Curriculum item] button matching image */}
                        {isDraft && addingLectureSectionId !== section.id ? (
                          <button
                            type="button"
                            onClick={() => setAddingLectureSectionId(section.id)}
                            className="border border-[#063777] text-[#063777] hover:bg-[#063777]/5 font-semibold text-xs px-4 py-2 rounded transition m-3 inline-flex items-center gap-1.5 cursor-pointer"
                          >{t("+ Curriculum item")}</button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Add Section form or button */}
              {isDraft ? (
                addingSection ? (
                  <form
                    onSubmit={(e) => void createNewSection(e)}
                    className="border border-[#063777] bg-[#f0f4fc] p-5 rounded-xs mt-4"
                  >
                    <label className="block text-xs font-bold text-[#1c1d1f] mb-1.5">{t("New Section Title")}</label>
                    <input
                      name="title"
                      placeholder={t('e.g. Section {number}', { number: nextSectionPosition })}
                      required
                      className="w-full border border-[#cfd5df] p-2.5 text-sm bg-white outline-none focus:border-[#063777] rounded-xs mb-3"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={busy}
                        className="bg-[#063777] hover:bg-[#044f99] text-white text-xs font-semibold px-5 py-2 rounded cursor-pointer disabled:opacity-50"
                      >{t("Add Section")}</button>
                      <button
                        type="button"
                        onClick={() => setAddingSection(false)}
                        className="text-xs text-[#6a6f73] hover:underline cursor-pointer"
                      >{t("Cancel")}</button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingSection(true)}
                    className="border border-[#063777] text-[#063777] hover:bg-[#063777]/5 font-semibold text-sm px-5 py-2.5 rounded transition inline-flex items-center gap-1.5 cursor-pointer mt-2"
                  >{t("+ Section")}</button>
                )
              ) : null}
            </div>
          ) : null}

          {/* Landing page & Course details panel */}
          {activeTab === "landing" ? (
            <div className="border border-[#d1d7dc] bg-white p-8 sm:p-10 shadow-xs rounded-xs">
              <section id="details">
                <p className="text-xs font-bold tracking-[0.12em] text-[#0b6a73] uppercase">{t("Course readiness")}</p>
                <h2 className="mt-2 text-3xl tracking-[-0.04em] text-[#202a38]">{t("Structure overview")}</h2>
                {isDraft ? (
                  <form
                    className="mt-6 grid max-w-3xl gap-4"
                    id="course-details-form"
                    onSubmit={(event) => void updateCourseDetails(event)}
                  >
                    <label className="grid gap-1.5 text-xs font-semibold text-[#435166]">{t("Course title")}<input
                        className={fieldClass}
                        defaultValue={version.title}
                        name="title"
                        required
                      />
                    </label>
                    <label className="grid gap-1.5 text-xs font-semibold text-[#435166]">{t("Course description")}<textarea
                        className={`${fieldClass} min-h-32 resize-y`}
                        defaultValue={version.description ?? ""}
                        name="description"
                        required
                      />
                    </label>
                    <label className="grid gap-1.5 text-xs font-semibold text-[#435166]">{t("Course language")}<select
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
                        {busy ? t("Saving…") : t("Save Draft")}
                      </button>
                      <span className="text-xs text-[#58677c]">{t("Typed changes are saved only when you press Save Draft.")}</span>
                    </div>
                  </form>
                ) : (
                  <p className="mt-3 max-w-2xl leading-7 text-[#687486]">
                    {version.description ?? t("No Course description.")}
                  </p>
                )}
                <dl className="mt-7 grid grid-cols-3 border-t border-l border-[#d8dde5] max-[800px]:grid-cols-1">
                  <div className="border-r border-b border-[#d8dde5] p-5">
                    <dt className="text-xs tracking-[0.1em] text-[#58677c] uppercase">{t("Course language")}</dt>
                    <dd className="mt-2 text-sm font-semibold text-[#202a38]">
                      {courseLanguageLabel(version.languageCode, language)}
                    </dd>
                  </div>
                  <div className="border-r border-b border-[#d8dde5] p-5">
                    <dt className="text-xs tracking-[0.1em] text-[#58677c] uppercase">{t("Eligible majors")}</dt>
                    <dd className="mt-2 text-sm font-semibold text-[#202a38]">
                      {data.allowedMajors
                        .map(({ major }) => translateMajor(major, language))
                        .join(", ") || t("Open to all majors")}
                    </dd>
                  </div>
                  <div className="border-r border-b border-[#d8dde5] p-5">
                    <dt className="text-xs tracking-[0.1em] text-[#58677c] uppercase">{t("Categories")}</dt>
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
                    <h3 className="text-sm font-semibold text-[#202a38]">{t("Edit categories")}</h3>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {categoryOptions.data.map((category) => (
                        <label className="flex items-center gap-2 text-sm text-[#4d5868]" key={category.id}>
                          <input defaultChecked={data.categories.some(({ category: assigned }) => assigned.id === category.id)} name="category" type="checkbox" value={category.id} />
                          {translateCategory(category, language)}
                        </label>
                      ))}
                    </div>
                    <button className={`${secondaryButton} mt-4`} disabled={busy} type="submit">{t("Save categories")}</button>
                  </form>
                ) : null}
              </section>

              <section className="mt-10 border-t border-[#d1d7dc] pt-10" id="cover">
                <div className="flex items-start justify-between gap-5 max-[640px]:flex-col">
                  <div>
                    <p className="text-xs font-bold tracking-[0.12em] text-[#0b6a73] uppercase">{t("Visual identity")}</p>
                    <h2 className="mt-2 text-2xl text-[#202a38]">{t("Course cover")}</h2>
                    <p className="mt-2 text-sm text-[#687486]">{t("JPEG, PNG, or WebP · maximum 10 MB · landscape works best.")}</p>
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
                    >{t("Remove cover")}</button>
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
                      alt={t('{title} cover', { title: version.title })}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  {isDraft && !version.coverAsset ? (
                    <form
                      className="grid content-start gap-4"
                      onSubmit={(event) => void uploadCover(event)}
                    >
                      <label className="grid gap-2 text-sm font-semibold text-[#435166]">{t("Choose cover image")}<input
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
                        {busy ? t("Uploading…") : t("Upload cover")}
                      </button>
                    </form>
                  ) : (
                    <div className="grid content-center">
                      <p className="text-sm font-semibold text-[#202a38]">
                        {version.coverAsset?.fileName ??
                          t("Cover can only be changed while this Version is a Draft.")}
                      </p>
                      <p className="mt-1 text-xs text-[#58677c]">
                        {t(version.coverAsset?.status ?? version.status)}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : null}

          {/* Assessments & Quizzes panel */}
          {activeTab === "assessments" ? (
            <div className="border border-[#d1d7dc] bg-white p-8 sm:p-10 shadow-xs rounded-xs">
              <section id="preTest">
                <div>
                  <p className="text-xs font-bold tracking-[0.12em] text-[#0b6a73] uppercase">{t("Assessment design")}</p>
                  <h2 className="mt-2 text-2xl text-[#202a38]">{t("Pre-test & Post-test")}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#687486]">{t("Create one of each assessment, then add multiple-choice questions and mark the correct answer.")}</p>
                </div>
                {isDraft && version.quizzes.length < 2 ? (
                  <form
                    className="mt-6 grid grid-cols-[160px_minmax(0,1fr)_120px_auto] items-end gap-3 bg-[#f6f8fa] p-5 max-[760px]:grid-cols-1"
                    onSubmit={(event) => void createQuiz(event)}
                  >
                    <label className="grid gap-1.5 text-xs font-semibold text-[#435166]">{t("Type")}<select className={fieldClass} name="quizType">
                        {!version.quizzes.some(
                          (quiz) => quiz.quizType === "PRE_TEST",
                        ) ? (
                          <option value="PRE_TEST">{t("Pre-test")}</option>
                        ) : null}
                        {!version.quizzes.some(
                          (quiz) => quiz.quizType === "POST_TEST",
                        ) ? (
                          <option value="POST_TEST">{t("Post-test")}</option>
                        ) : null}
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-xs font-semibold text-[#435166]">{t("Title")}<input
                        className={fieldClass}
                        name="title"
                        placeholder={t("Assessment title")}
                        required
                      />
                    </label>
                    <label className="grid gap-1.5 text-xs font-semibold text-[#435166]">{t("Minutes")}<input
                        className={fieldClass}
                        min="1"
                        name="minutes"
                        placeholder={t("Untimed")}
                        type="number"
                      />
                    </label>
                    <button className={primaryButton} disabled={busy} type="submit">{t("Create assessment")}</button>
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
                      {copy.optionalAssessments}
                    </p>
                  )}
                </div>
              </section>
            </div>
          ) : null}

          {/* Submission checklist panel */}
          {activeTab === "checklist" ? (
            <div className="border border-[#d1d7dc] bg-white p-8 sm:p-10 shadow-xs rounded-xs">
              <section id="submission-checklist">
                <p className="text-xs font-bold tracking-[0.12em] text-[#063777] uppercase">{t("Final review")}</p>
                <h2 className="mt-2 text-2xl text-[#202a38]">{t("Submission checklist")}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#687486]">{t("Every required item must be ready before this version can be sent to an Approver.")}</p>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {checks.map(([key, ready]) => (
                    <li
                      className={`flex items-center gap-3 border p-4 text-sm ${ready ? "border-[#c6d8e9] bg-[#f0f4fc] text-[#292b3a]" : "border-[#ead8d5] bg-[#fff8f7] text-[#7a342d]"}`}
                      key={key}
                    >
                      <span className="font-medium text-inherit">
                        {copy.checklist[key as keyof TeacherCourseDetailDto["checks"]]}
                      </span>
                      <small className="ml-auto text-xs opacity-70">
                        {ready ? "Ready" : t("Needs work")}
                      </small>
                    </li>
                  ))}
                </ul>
                {isDraft ? (
                  <div className="mt-7 flex flex-wrap items-center gap-4">
                    <button
                      className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded bg-[#063777] hover:bg-[#044f99] px-7 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-[#aebdce]"
                      disabled={busy || data.readiness < 100}
                      onClick={() => void submitDraft()}
                      type="button"
                    >
                      {busy ? t("Submitting…") : t("Submit for Review")}
                    </button>
                    <span className="text-sm text-[#687486]">
                      {data.readiness === 100
                        ? t("Ready to submit. Approval publishes the course automatically.")
                        : t('{count} required item(s) remaining.', { count: checks.filter(([, ready]) => !ready).length })}
                    </span>
                  </div>
                ) : null}
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
