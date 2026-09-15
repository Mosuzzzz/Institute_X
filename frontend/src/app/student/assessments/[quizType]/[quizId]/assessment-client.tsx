'use client';

import Link from 'next/link';
import BootstrapIcon from '../../../../bootstrap-icon';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { backendApi, type CompletedPreTestDto, type PostTestResultDto, type QuizSubmissionDto, type StartedQuizDto } from '../../../../../lib/backend-api';
import ApiState from '../../../../api-state';
import QuestionImage from '../../../../question-image';
import { useAppLanguage } from '../../../../../lib/language';
import { useUiTranslation } from "../../../../../lib/ui-translations";


export default function AssessmentClient({ quizType, quizId }: { quizType: string; quizId: string }) {
  const t = useUiTranslation();
  const [language] = useAppLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPostTest = quizType === 'post-test';
  const validType = isPostTest || quizType === 'pre-test';
  const [attempt, setAttempt] = useState<StartedQuizDto | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizSubmissionDto | null>(null);
  const [error, setError] = useState<string | null>(validType ? null : t("Unknown assessment type."));
  const [loading, setLoading] = useState(validType);
  const [submitting, setSubmitting] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [history, setHistory] = useState<PostTestResultDto[]>([]);
  const [completedPreTest, setCompletedPreTest] = useState<CompletedPreTestDto | null>(null);
  const [postTestStartRequest, setPostTestStartRequest] = useState(0);
  const expiryHandled = useRef(false);
  const expiryRetries = useRef(0);
  const expiryRetryAt = useRef(0);
  const [canRetryExpiry, setCanRetryExpiry] = useState(false);
  const requestedReturnTo = searchParams.get('returnTo');
  const returnTo = requestedReturnTo?.startsWith('/student/courses/')
    ? requestedReturnTo
    : '/student/learning';

  useEffect(() => {
    if (!validType) return;
    let cancelled = false;
    const start = async () => {
      try {
        if (isPostTest) {
          const previous = await backendApi<PostTestResultDto[]>(`post-tests/${quizId}/results`);
          if (!cancelled) setHistory(previous);
          if (postTestStartRequest === 0) return;
        }
        const started = await backendApi<StartedQuizDto>(`${isPostTest ? 'post-tests' : 'pre-tests'}/${quizId}/attempts`, { method: 'POST' });
        if (!cancelled) setAttempt(started);
      } catch (requestError) {
        if (!isPostTest) {
          try {
            const completed = await backendApi<CompletedPreTestDto>(`pre-tests/${quizId}/result`);
            if (!cancelled) {
              setCompletedPreTest(completed);
              return;
            }
          } catch {
            // Keep the original start error when no completed result exists.
          }
        }
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : "Unable to start this assessment.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void start();
    return () => { cancelled = true; };
  }, [isPostTest, postTestStartRequest, quizId, validType]);

  useEffect(() => {
    if (!attempt?.expiresAt) return;
    expiryHandled.current = false;
    const expiresAt = Date.parse(attempt.expiresAt);
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1_000));
      setRemainingSeconds(remaining);
      if (
        remaining !== 0 ||
        isPostTest ||
        expiryHandled.current ||
        Date.now() < expiryRetryAt.current
      ) return;

      expiryHandled.current = true;
      setSubmitting(true);
      void backendApi<QuizSubmissionDto>(
        `pre-test-attempts/${attempt.attemptId}/finalize-expired`,
        { method: 'POST' },
      )
        .then((submitted) => {
          router.replace(
            submitted.courseId
              ? `/student/courses/${encodeURIComponent(submitted.courseId)}`
              : returnTo,
          );
        })
        .catch(async (requestError: unknown) => {
          try {
            const completed = await backendApi<CompletedPreTestDto>(
              `pre-tests/${quizId}/result`,
            );
            router.replace(`/student/courses/${encodeURIComponent(completed.courseId)}`);
          } catch {
            setError(
              requestError instanceof Error
                ? requestError.message
                : "Unable to finalize the expired Pre-Test.",
            );
            setSubmitting(false);
            expiryRetries.current += 1;
            if (expiryRetries.current < 3) {
              expiryRetryAt.current = Date.now() + 2 ** expiryRetries.current * 1_000;
              expiryHandled.current = false;
            } else {
              setCanRetryExpiry(true);
            }
          }
        });
    };

    tick();
    const timer = window.setInterval(tick, 1_000);
    return () => window.clearInterval(timer);
  }, [attempt, isPostTest, quizId, returnTo, router]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!attempt || attempt.questions.some((question) => !answers[question.id])) {
      setError(t("Please answer every question before submitting."));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const submitted = await backendApi<QuizSubmissionDto>(`${isPostTest ? 'post-test' : 'pre-test'}-attempts/${attempt.attemptId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: attempt.questions.map((question) => ({ questionId: question.id, optionId: answers[question.id] })) }),
      });
      if (isPostTest) {
        setResult(submitted);
        setHistory(await backendApi<PostTestResultDto[]>(`post-tests/${quizId}/results`));
      } else {
        router.replace(
          submitted.courseId
            ? `/student/courses/${encodeURIComponent(submitted.courseId)}`
            : returnTo,
        );
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("Unable to submit this assessment."));
    } finally {
      setSubmitting(false);
    }
  };

  const pageClasses = 'mx-auto w-[min(calc(100%-40px),920px)] pt-16 pb-[100px]';

  if (!attempt && isPostTest && !loading) {
    return (
      <main data-ui="page" className={pageClasses}>
        <Link className="text-sm font-bold text-[#073d78]" href="/student/learning">
          <BootstrapIcon name="arrow-left" />{t("My learning")}</Link>
        <section className="mt-10 border border-[#d8dde5] bg-white p-6" aria-label={t("Post-Test attempt history")}>
          <p className="text-xs font-bold tracking-[0.13em] text-[#073d78] uppercase">{t("Post-Test")}</p>
          <h1 className="mt-2 text-[clamp(2rem,5vw,4rem)] font-medium tracking-[-0.045em] text-[#202a38]">
            {history.length > 0 ? t("Attempt history") : t("Check your mastery")}
          </h1>
          <p className="mt-3 text-sm text-[#697586]">{t("Review your results here. A new timed attempt starts only after you select Start Post-Test.")}</p>
          {error ? <p className="mt-3 text-sm text-[#8d3039]">{t(error)}</p> : null}
          {history.length > 0 ? <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#d8dde5] text-xs text-[#697586]">
                  <th className="py-2">{t("Submitted")}</th>
                  <th>{t("Score")}</th>
                  <th>{t("Result")}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((attemptResult) => (
                  <tr className="border-b border-[#edf0f4]" key={attemptResult.id}>
                    <td className="py-3">
                      {attemptResult.submittedAt
                        ? new Date(attemptResult.submittedAt).toLocaleString(language)
                        : '—'}
                    </td>
                    <td>{attemptResult.score === null ? '—' : `${attemptResult.score}%`}</td>
                    <td>{t(attemptResult.result ?? '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div> : null}
          <button
            className="mt-6 rounded bg-[#073d78] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#052e5b]"
            type="button"
            onClick={() => {
              setError(null);
              setLoading(true);
              setPostTestStartRequest((request) => request + 1);
            }}
          >
            {history.length > 0 ? t("Retake Post-Test") : t("Start Post-Test")}
          </button>
        </section>
      </main>
    );
  }

  if (!attempt || result || completedPreTest) {
    const displayedResult = result ?? completedPreTest;
    return (
      <main data-ui="page" className={pageClasses}>
        {displayedResult ? (
          <section className="grid min-h-[520px] place-content-center justify-items-center gap-3 text-center">
            <p className="mb-2 text-xs font-bold tracking-[0.13em] text-[#073d78] uppercase">{t("Assessment complete")}</p>
            <h1 className="text-[clamp(2.5rem,6vw,5rem)] font-medium text-[#202a38]">{t(displayedResult.result)}</h1>
            <strong className="text-[clamp(3rem,8vw,6rem)] font-medium tracking-[-0.03em] text-[#0b5b73]">{displayedResult.score}%</strong>
            <p className="text-[#697586]">{isPostTest ? t("Your Post-Test result has been recorded.") : t("Your Course content is now unlocked.")}</p>
            {isPostTest && history.length > 0 ? (
              <div className="mt-6 w-full max-w-2xl overflow-x-auto border border-[#d8dde5] bg-white p-5 text-left">
                <h2 className="text-lg font-semibold text-[#202a38]">{t("Attempt history")}</h2>
                <table className="mt-4 w-full min-w-[520px] border-collapse text-sm">
                  <thead><tr className="border-b border-[#d8dde5] text-xs text-[#697586]"><th className="py-2">{t("Submitted")}</th><th>{t("Score")}</th><th>{t("Result")}</th></tr></thead>
                  <tbody>{history.map((attemptResult) => <tr className="border-b border-[#edf0f4]" key={attemptResult.id}><td className="py-3">{attemptResult.submittedAt ? new Date(attemptResult.submittedAt).toLocaleString(language) : '—'}</td><td>{attemptResult.score === null ? '—' : `${attemptResult.score}%`}</td><td>{t(attemptResult.result ?? '—')}</td></tr>)}</tbody>
                </table>
              </div>
            ) : null}
            <Link className="mt-5 font-bold text-[#073d78]" href={completedPreTest ? `/student/courses/${encodeURIComponent(completedPreTest.courseId)}` : '/student/learning'}>{completedPreTest ? t("Continue to Course") : t("Return to My learning")} <BootstrapIcon name="arrow-right" /></Link>
          </section>
        ) : <ApiState loading={loading} error={error} />}
      </main>
    );
  }

  return (
    <main data-ui="page" className={pageClasses}>
      <header className="mb-[42px] grid gap-2.5">
        <Link className="mb-6 w-fit text-[0.78rem] font-bold text-[#073d78] no-underline" href={returnTo}><BootstrapIcon name="arrow-left" /> {returnTo === '/student/learning' ? t("My learning") : t("Back to course")}</Link>
        <p className="mb-2 text-xs font-bold tracking-[0.13em] text-[#073d78] uppercase">{isPostTest ? t("Post-Test") : t("Pre-Test")}</p>
        <h1 className="text-[clamp(2.3rem,5vw,4.8rem)] font-medium tracking-[-0.03em] text-[#202a38]">{isPostTest ? t("Check your mastery") : t("Before you begin")}</h1>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-[#697586]">{t("Answer every question, then submit your attempt.")}</p>
          {remainingSeconds !== null ? (
            <div
              className={`min-w-32 border px-4 py-2 text-center ${remainingSeconds <= 60 ? 'border-[#ad424b] bg-[#faeeee] text-[#8d3039]' : 'border-[#d8dde5] bg-white text-[#202a38]'}`}
              role="timer"
              aria-live={remainingSeconds <= 60 ? 'polite' : 'off'}
            >
              <small className="block text-[0.65rem] font-bold tracking-[0.08em] uppercase">{t("Time remaining")}</small>
              <strong className="mt-0.5 block font-mono text-lg tabular-nums">
                {String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:{String(remainingSeconds % 60).padStart(2, '0')}
              </strong>
            </div>
          ) : null}
          {canRetryExpiry ? (
            <button
              type="button"
              className="border border-[#8d3039] bg-white px-4 py-2 text-sm font-semibold text-[#8d3039]"
              onClick={() => {
                expiryRetries.current = 0;
                expiryRetryAt.current = 0;
                expiryHandled.current = false;
                setCanRetryExpiry(false);
                setError(null);
              }}
            >{t("Retry finalization")}</button>
          ) : null}
        </div>
      </header>
      {isPostTest && history.length > 0 ? (
        <section className="mb-8 border border-[#d8dde5] bg-white p-5" aria-label={t("Previous Post-Test results")}>
          <h2 className="text-lg font-semibold text-[#202a38]">{t("Previous attempts")}</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead><tr className="border-b border-[#d8dde5] text-xs text-[#697586]"><th className="py-2">{t("Submitted")}</th><th>{t("Score")}</th><th>{t("Result")}</th></tr></thead>
              <tbody>{history.map((attemptResult) => <tr className="border-b border-[#edf0f4]" key={attemptResult.id}><td className="py-3">{attemptResult.submittedAt ? new Date(attemptResult.submittedAt).toLocaleString(language) : '—'}</td><td>{attemptResult.score === null ? '—' : `${attemptResult.score}%`}</td><td>{t(attemptResult.result ?? '—')}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      ) : null}
      <form className="grid gap-6" onSubmit={submit}>
        {attempt.questions.map((question, index) => (
          <fieldset className="grid gap-2.5 border border-[#d8dde5] bg-white p-[26px]" key={question.id}>
            <legend className="flex gap-3.5 px-2 text-base leading-[1.5] font-[650] text-[#202a38]">
              <span className="shrink-0 whitespace-nowrap text-[0.7rem] font-extrabold text-[#0b5b73]">{String(index + 1).padStart(2, '0')}</span>
              {question.questionText}
            </legend>
            {question.imageAssetId ? (
              <QuestionImage
                assetId={question.imageAssetId}
                alt={t('{question} illustration', { question: question.questionText })}
                className="mb-3 max-h-[440px] w-full bg-[#f6f8fa] object-contain"
                fallback={
                  <p className="bg-[#f6f8fa] p-4 text-sm text-[#697586]">
                    Loading question image…
                  </p>
                }
              />
            ) : null}
            {question.options.map((option) => (
              <label className="flex cursor-pointer items-center gap-3 border border-[#e1e5ea] px-[15px] py-[13px] text-[#4e5969] has-checked:border-[#76a0b5] has-checked:bg-[#edf4f8] has-checked:text-[#073d78]" key={option.id}>
                <input className="accent-[#073d78]" type="radio" name={question.id} value={option.id} checked={answers[question.id] === option.id} onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))} />
                <span>{option.optionText}</span>
              </label>
            ))}
          </fieldset>
        ))}
        {error ? <p className="border-l-[3px] border-[#ad424b] bg-[#faeeee] px-4 py-[13px] text-[#8d3039]" role="alert">{t(error)}</p> : null}
        <button className="max-[540px]:w-full max-[540px]:min-w-0 min-w-[200px] cursor-pointer justify-self-end border-0 bg-[#073d78] px-[22px] py-3.5 text-[0.82rem] font-bold text-white disabled:cursor-wait disabled:opacity-65" type="submit" disabled={submitting}>{submitting ? t("Submitting…") : t("Submit assessment")}</button>
      </form>
    </main>
  );
}
