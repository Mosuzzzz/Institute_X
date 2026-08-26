import CourseReviewClient from './review-client';

export default async function CourseReviewPage({ params }: { params: Promise<{ versionId: string }> }) {
  const { versionId } = await params;
  return <CourseReviewClient versionId={versionId} />;
}
