import AssessmentClient from './assessment-client';

export default async function AssessmentPage({ params }: { params: Promise<{ quizType: string; quizId: string }> }) {
  const { quizType, quizId } = await params;
  return <AssessmentClient quizType={quizType} quizId={quizId} />;
}
