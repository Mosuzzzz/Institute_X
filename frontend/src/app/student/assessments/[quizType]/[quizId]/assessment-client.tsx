'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { backendApi, type QuizSubmissionDto, type StartedQuizDto } from '../../../../../lib/backend-api';
import ApiState from '../../../../api-state';

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

  if (!attempt || result) return <main className="student-main assessment-page">{result ? <section className="assessment-result"><p className="eyebrow">Assessment complete</p><h1>{result.result.replace('_', ' ')}</h1><strong>{result.score}%</strong><p>{isPostTest ? 'Your Post-Test result has been recorded.' : 'Your Course content is now unlocked.'}</p><Link href="/student/learning">Return to My learning →</Link></section> : <ApiState loading={loading} error={error} />}</main>;

  return <main className="student-main assessment-page"><header><Link href="/student/learning">← My learning</Link><p className="eyebrow">{isPostTest ? 'Post-Test' : 'Pre-Test'}</p><h1>{isPostTest ? 'Check your mastery' : 'Before you begin'}</h1><p>Answer every question, then submit your attempt.</p></header><form onSubmit={submit}>{attempt.questions.map((question, index) => <fieldset key={question.id}><legend><span>{String(index + 1).padStart(2, '0')}</span>{question.questionText}</legend>{question.options.map((option) => <label key={option.id}><input type="radio" name={question.id} value={option.id} checked={answers[question.id] === option.id} onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))} /><span>{option.optionText}</span></label>)}</fieldset>)}{error ? <p className="assessment-error" role="alert">{error}</p> : null}<button type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit assessment'}</button></form></main>;
}
