'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { backendApi, type QuizSubmissionDto, type StartedQuizDto } from '../../../../../lib/backend-api';
import ApiState from '../../../../api-state';
import QuestionImage from '../../../../question-image';

export default function AssessmentClient({ quizType, quizId }: { quizType: string; quizId: string }) {
  const isPostTest = quizType === 'post-test';
  const validType = isPostTest || quizType === 'pre-test';
  const [attempt, setAttempt] = useState<StartedQuizDto | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizSubmissionDto | null>(null);
  const [error, setError] = useState<string | null>(validType ? null : 'Unknown assessment type.');
  const [loading, setLoading] = useState(validType);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!validType) return;
    let cancelled = false;
    const start = async () => {
      try {
        const started = await backendApi<StartedQuizDto>(`${isPostTest ? 'post-tests' : 'pre-tests'}/${quizId}/attempts`, { method: 'POST' });
        if (!cancelled) setAttempt(started);
      } catch (requestError) {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to start this assessment.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void start();
    return () => { cancelled = true; };
  }, [isPostTest, quizId, validType]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!attempt || attempt.questions.some((question) => !answers[question.id])) {
      setError('Please answer every question before submitting.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const submitted = await backendApi<QuizSubmissionDto>(`${isPostTest ? 'post-test' : 'pre-test'}-attempts/${attempt.attemptId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: attempt.questions.map((question) => ({ questionId: question.id, optionId: answers[question.id] })) }),
      });
      setResult(submitted);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to submit this assessment.');
    } finally {
      setSubmitting(false);
    }
  };

  const pageClasses = 'mx-auto w-[min(calc(100%-40px),920px)] pt-16 pb-[100px]';

  if (!attempt || result) {
    return (
      <main className={pageClasses}>
        {result ? (
          <section className="grid min-h-[520px] place-content-center justify-items-center gap-3 text-center">
            <p className="mb-2 text-xs font-bold tracking-[0.13em] text-[#073d78] uppercase">Assessment complete</p>
            <h1 className="text-[clamp(2.5rem,6vw,5rem)] font-medium text-[#202a38]">{result.result.replace('_', ' ')}</h1>
            <strong className="text-[clamp(4rem,10vw,8rem)] font-medium tracking-[-0.07em] text-[#0b5b73]">{result.score}%</strong>
            <p className="text-[#697586]">{isPostTest ? 'Your Post-Test result has been recorded.' : 'Your Course content is now unlocked.'}</p>
            <Link className="mt-5 font-bold text-[#073d78]" href="/student/learning">Return to My learning →</Link>
          </section>
        ) : <ApiState loading={loading} error={error} />}
      </main>
    );
  }

  return (
    <main className={pageClasses}>
      <header className="mb-[42px] grid gap-2.5">
        <Link className="mb-6 w-fit text-[0.78rem] font-bold text-[#073d78] no-underline" href="/student/learning">← My learning</Link>
        <p className="mb-2 text-xs font-bold tracking-[0.13em] text-[#073d78] uppercase">{isPostTest ? 'Post-Test' : 'Pre-Test'}</p>
        <h1 className="text-[clamp(2.3rem,5vw,4.8rem)] font-medium tracking-[-0.055em] text-[#202a38]">{isPostTest ? 'Check your mastery' : 'Before you begin'}</h1>
        <p className="text-[#697586]">Answer every question, then submit your attempt.</p>
      </header>
      <form className="grid gap-6" onSubmit={submit}>
        {attempt.questions.map((question, index) => (
          <fieldset className="grid gap-2.5 border border-[#d8dde5] bg-white p-[26px]" key={question.id}>
            <legend className="flex gap-3.5 px-2 text-base leading-[1.5] font-[650] text-[#202a38]">
              <span className="text-[0.7rem] font-extrabold text-[#0b5b73]">{String(index + 1).padStart(2, '0')}</span>
              {question.questionText}
            </legend>
            {question.imageAssetId ? (
              <QuestionImage
                assetId={question.imageAssetId}
                alt={`${question.questionText} illustration`}
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
        {error ? <p className="border-l-[3px] border-[#ad424b] bg-[#faeeee] px-4 py-[13px] text-[#8d3039]" role="alert">{error}</p> : null}
        <button className="min-w-[200px] cursor-pointer justify-self-end border-0 bg-[#073d78] px-[22px] py-3.5 text-[0.82rem] font-bold text-white disabled:cursor-wait disabled:opacity-65" type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit assessment'}</button>
      </form>
    </main>
  );
}
